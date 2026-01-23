import {
  fork,
  take,
  cancel,
  put,
  call,
  all,
  select,
  cancelled,
} from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  lockApp,
  setAppServicesReady,
  UserActionType,
  LoginAction,
  CheckForDeeplinkAction,
} from '../../actions/user';
import { NavigationActionType } from '../../actions/navigation';
import { EventChannel, Task, eventChannel } from 'redux-saga';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import LockManagerService from '../../core/LockManagerService';
import {
  overrideXMLHttpRequest,
  restoreXMLHttpRequest,
} from './xmlHttpRequestOverride';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../core/DeeplinkManager/DeeplinkManager';
import AppConstants from '../../core/AppConstants';
import {
  SET_COMPLETED_ONBOARDING,
  SetCompletedOnboardingAction,
} from '../../actions/onboarding';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import { applyVaultInitialization } from '../../util/generateSkipOnboardingState';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';
import { selectExistingUser } from '../../reducers/user';
import UrlParser from 'url-parse';
import Authentication from '../../core/Authentication';
import { MetaMetrics } from '../../core/Analytics';
import { AppState, AppStateStatus } from 'react-native';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';

/**
 * Creates a channel to listen to app state changes.
 */
function appStateListenerChannel() {
  return eventChannel<AppStateStatus>((emitter) => {
    const appStateListener = AppState.addEventListener('change', emitter);
    return () => {
      appStateListener.remove();
    };
  });
}

/**
 * Listens to app state changes and prompts authentication when the app is foregrounded.
 */
function* appStateListenerTask() {
  // Create channel to listen to app state changes.
  const channel: EventChannel<AppStateStatus> = yield call(
    appStateListenerChannel,
  );

  try {
    while (true) {
      let appState: AppStateStatus = yield take(channel);
      if (appState === 'active') {
        yield call(async () => {
          // This is in a try catch since errors are not propogated in event channels.
          try {
            // Prompt authentication.
            await Authentication.unlockWallet();
          } catch (error) {
            // Lock app and navigate to login.
            Authentication.lockApp({ reset: false });
            trackErrorAsAnalytics(
              'Lockscreen: Authentication failed',
              (error as Error)?.message,
            );
          }
        });
        // Close channel once authentication is prompted.
        channel.close();
      }
    }
  } finally {
    // Cancel channel if saga is cancelled.
    const isCancelled: boolean = yield cancelled();
    if (isCancelled) {
      channel.close();
    }
  }
}

export function* appLockStateMachine() {
  let appStateListener: Task<void> | undefined;

  while (true) {
    yield take(UserActionType.LOCKED_APP);

    // Navigate to lock screen.
    NavigationService.navigation?.navigate(Routes.LOCK_SCREEN);

    // Cancel existing app state listener.
    if (appStateListener) {
      yield cancel(appStateListener);
    }

    // Start new app state listener for prompting authentication when the app is foregrounded.
    appStateListener = yield fork(appStateListenerTask);
  }
}

/**
 * Automatically requests authentication on app start.
 */
export function* requestAuthOnAppStart() {
  try {
    yield call(Authentication.unlockWallet);
  } catch (_) {
    // If authentication fails, navigate to login screen
    // TODO: Consolidate error handling in future PRs. For now, we'll rely on the Login screen to handle triaging specific errors.
    NavigationService.navigation?.reset({
      routes: [{ name: Routes.ONBOARDING.LOGIN }],
    });
  }
}

/**
 * The state machine for detecting when the app is logged vs logged out.
 * While on the Wallet screen, this state machine
 * will "listen" to the app lock state machine.
 */
export function* authStateMachine() {
  // Start when the user is logged in.
  while (true) {
    yield take(UserActionType.LOGIN);
    // Listen to the app once it enters the locked state.
    const appLockStateMachineTask: Task<void> = yield fork(appLockStateMachine);
    // Handles locking the app when the app is backgrounded.
    LockManagerService.startListening();
    // Listen to app lock behavior.
    yield take(UserActionType.LOGOUT);
    LockManagerService.stopListening();
    // Cancels appLockStateMachineTask, which also cancels nested sagas once logged out.
    yield cancel(appLockStateMachineTask);
  }
}

/**
 * Locks the KeyringController and dispatches LOCK_APP.
 */
export function* lockKeyringAndApp() {
  const { KeyringController } = Engine.context;
  try {
    yield call(KeyringController.setLocked);
  } catch (e) {
    Logger.log('Failed to lock KeyringController', e);
  }
  yield put(lockApp());
}

export function* basicFunctionalityToggle() {
  while (true) {
    const { basicFunctionalityEnabled } = yield take(
      'TOGGLE_BASIC_FUNCTIONALITY',
    );

    if (basicFunctionalityEnabled) {
      restoreXMLHttpRequest();
    } else {
      // apply global blocklist
      overrideXMLHttpRequest();
    }
  }
}

export function* initializeSDKServices() {
  try {
    // Initialize WalletConnect
    yield call(() => WC2Manager.init({}));
    // Initialize SDKConnect
    yield call(() => SDKConnect.init({ context: 'Nav/App' }));
  } catch (e) {
    Logger.log('Failed to initialize services', e);
  }
}

export function* handleDeeplinkSaga() {
  // TODO: This is only needed because SDKConnect does some weird stuff when it's initialized.
  // Once that's refactored and the singleton is simply initialized, we should be able to remove this.
  let hasInitializedSDKServices = false;

  while (true) {
    // Handle parsing deeplinks after login or when the lock manager is resolved
    const value = (yield take([
      UserActionType.LOGIN,
      UserActionType.CHECK_FOR_DEEPLINK,
      SET_COMPLETED_ONBOARDING,
    ])) as LoginAction | CheckForDeeplinkAction | SetCompletedOnboardingAction;

    let completedOnboarding = false;

    // Check if triggering action is SET_COMPLETED_ONBOARDING
    if (value.type === SET_COMPLETED_ONBOARDING) {
      completedOnboarding = value.completedOnboarding;
    } else {
      completedOnboarding = yield select(selectCompletedOnboarding);
    }

    const existingUser: boolean = yield select(selectExistingUser);

    if (AppStateEventProcessor.pendingDeeplink) {
      const url = new UrlParser(AppStateEventProcessor.pendingDeeplink);
      const storedSource =
        AppStateEventProcessor.pendingDeeplinkSource ??
        AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      // try handle fast onboarding if mobile existingUser flag is false and 'onboarding' present in deeplink
      if (!existingUser && url.pathname === '/onboarding') {
        setTimeout(() => {
          SharedDeeplinkManager.parse(url.href, {
            origin: storedSource,
          });
        }, 200);
        AppStateEventProcessor.clearPendingDeeplink();
        continue;
      }
    }

    const { KeyringController } = Engine.context;
    const isUnlocked = KeyringController.isUnlocked();

    // App is locked or onboarding is not yet complete
    if (!isUnlocked || !completedOnboarding) {
      continue;
    }

    // Initialize SDK services
    if (!hasInitializedSDKServices) {
      yield call(initializeSDKServices);
      hasInitializedSDKServices = true;
    }

    const deeplink = AppStateEventProcessor.pendingDeeplink;
    const deeplinkSource =
      AppStateEventProcessor.pendingDeeplinkSource ??
      AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

    if (deeplink) {
      // TODO: See if we can hook into a navigation finished event before parsing so that the modal doesn't conflict with ongoing navigation events
      setTimeout(() => {
        SharedDeeplinkManager.parse(deeplink, {
          origin: deeplinkSource,
        });
      }, 200);
      AppStateEventProcessor.clearPendingDeeplink();
    }
  }
}

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
/**
 * Handles updating the Snaps registry when the user has booted the app and is onboarded
 */
export function* handleSnapsRegistry() {
  while (true) {
    const result = (yield take([
      UserActionType.LOGIN,
      SET_COMPLETED_ONBOARDING,
    ])) as LoginAction | SetCompletedOnboardingAction;

    const state: boolean = yield select(selectCompletedOnboarding);
    const completedOnboarding =
      result.type === 'SET_COMPLETED_ONBOARDING'
        ? result.completedOnboarding
        : state;

    if (!completedOnboarding) {
      continue;
    }

    try {
      const { SnapController } = Engine.context;
      yield call([SnapController, SnapController.updateRegistry]);
    } catch {
      // Ignore
    }
  }
}
///: END:ONLY_INCLUDE_IF

/**
 * Handles initializing app services on start up
 */
export function* startAppServices() {
  // Wait for persisted data to be loaded and navigation to be ready
  yield all([
    take(UserActionType.ON_PERSISTED_DATA_LOADED),
    take(NavigationActionType.ON_NAVIGATION_READY),
  ]);

  // Start Engine service
  yield call(EngineService.start);

  // Start DeeplinkManager and process branch deeplinks
  SharedDeeplinkManager.start();

  // Start AppStateEventProcessor
  AppStateEventProcessor.start();

  // Configure MetaMetrics
  try {
    yield call(MetaMetrics.getInstance().configure);
  } catch (err) {
    Logger.error(err as Error, 'Error configuring MetaMetrics');
  }

  // Apply vault initialization
  yield call(applyVaultInitialization);

  // Unblock the ControllersGate
  yield put(setAppServicesReady());

  // Wait for the next frame to ensure that navigation stack is rendered.
  // This is needed to prevent a race condition where the navigation container is ready BUT the navigation stacks are not yet rendered.
  // TODO: Follow up on pre-rendering the navigation stacks.
  yield call(() => new Promise((resolve) => requestAnimationFrame(resolve)));

  // Request authentication on app start after the auth state machine is started
  yield call(requestAuthOnAppStart);
}

// Main generator function that initializes other sagas in parallel.
export function* rootSaga() {
  yield fork(startAppServices);
  yield fork(authStateMachine);
  yield fork(basicFunctionalityToggle);
  yield fork(handleDeeplinkSaga);
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  yield fork(handleSnapsRegistry);
  ///: END:ONLY_INCLUDE_IF
}
