import {
  fork,
  take,
  cancel,
  put,
  call,
  all,
  select,
  race,
  delay,
} from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  setAppServicesReady,
  UserActionType,
  LoginAction,
  CheckForDeeplinkAction,
} from '../../actions/user';
import {
  NavigationActionType,
  SetCurrentRouteAction,
} from '../../actions/navigation';
import { selectCurrentRoute } from '../../reducers/navigation/selectors';
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
import { rewardsBulkLinkSaga } from './rewardsBulkLinkAccountGroups';
import Authentication from '../../core/Authentication';
import { AppState, AppStateStatus } from 'react-native';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';
import { providerErrors } from '@metamask/rpc-errors';
import { backfillSocialLoginMarketingConsentSaga } from './backfillSocialLoginMarketingConsent';
import { promptIosGoogleWarningSheetSaga } from './onboarding/legacyIosGoogleReminder';

/**
 * Routes whose presence as the focused leaf means the main screen stack
 * hasn't mounted yet, so `navigate('SomeScreen')` would be dropped by
 * React Navigation ("NAVIGATE was not handled by any navigator").
 * Covers pre-login auth screens and post-login container routes that
 * briefly focus before their child stacks register their screens.
 */
const NAV_NOT_READY_ROUTES: ReadonlySet<string> = new Set<string>([
  Routes.LOCK_SCREEN,
  Routes.ONBOARDING.LOGIN,
  Routes.ONBOARDING.REHYDRATE,
  Routes.ONBOARDING.HOME_NAV,
  Routes.ONBOARDING.ROOT_NAV,
  Routes.ONBOARDING.NAV,
  Routes.FOX_LOADER,
  Routes.MAIN_FLOW,
]);

/**
 * Safety ceiling: if navigation never settles, parse the deeplink anyway.
 * A late deeplink is better than a silently dropped one.
 */
const NAV_READY_WAIT_TIMEOUT_MS = 3000;

/**
 * Waits until the focused navigation leaf is a route where `navigate(...)`
 * can succeed (see {@link NAV_NOT_READY_ROUTES}), then parses the deeplink.
 * Event-driven via `SET_CURRENT_ROUTE`, which `NavigationProvider` dispatches
 * from React Navigation's `onStateChange` (seeded once from `onReady`).
 */
export function* parseDeeplinkAfterNavReady(deeplink: string, origin: string) {
  const currentRoute: string | undefined = yield select(selectCurrentRoute);

  if (currentRoute && !NAV_NOT_READY_ROUTES.has(currentRoute)) {
    SharedDeeplinkManager.parse(deeplink, { origin });
    return;
  }

  const { timedOut } = yield race({
    navSettled: call(function* waitForReadyRoute() {
      while (true) {
        const action: SetCurrentRouteAction = yield take(
          NavigationActionType.SET_CURRENT_ROUTE,
        );
        if (!NAV_NOT_READY_ROUTES.has(action.payload.route)) {
          return;
        }
      }
    }),
    timedOut: delay(NAV_READY_WAIT_TIMEOUT_MS),
  });

  if (timedOut) {
    Logger.log(
      'parseDeeplinkAfterNavReady: timed out waiting for navigation, parsing anyway',
    );
  }

  SharedDeeplinkManager.parse(deeplink, { origin });
}

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
 * Checks seedless password status and performs the correct auth flow.
 */
async function tryBiometricUnlock(): Promise<void> {
  if (
    await Authentication.checkIsSeedlessPasswordOutdated({
      skipCache: true,
      captureSentryError: false,
    })
  ) {
    NavigationService.navigation?.reset({
      routes: [
        {
          name: Routes.ONBOARDING.REHYDRATE,
          params: { isSeedlessPasswordOutdated: true },
        },
      ],
    });
    return;
  }

  // Prompt authentication.
  await Authentication.unlockWallet();
}

/**
 * Listens to app state changes and prompts authentication when the app is foregrounded.
 */
export function* appStateListenerTask() {
  // Create channel to listen to app state changes.
  const channel: EventChannel<AppStateStatus> = yield call(
    appStateListenerChannel,
  );

  try {
    while (true) {
      const appState: AppStateStatus = yield take(channel);
      if (appState === 'active') {
        yield call(async () => {
          // This is in a try catch since errors are not propogated in event channels.
          try {
            await tryBiometricUnlock();
          } catch (error) {
            // Navigate to login.
            NavigationService.navigation?.reset({
              routes: [{ name: Routes.ONBOARDING.LOGIN }],
            });
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
    // Unconditionally close channel to prevent memory leaks.
    channel.close();
  }
}

export function* appLockStateMachine() {
  while (true) {
    yield take(UserActionType.LOCKED_APP);

    // Reject any pending confirmations so the user doesn't see a stale confirmation after unlock.
    try {
      const { ApprovalController } = Engine.context;
      if (ApprovalController) {
        ApprovalController.clearRequests(providerErrors.userRejectedRequest());
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to reject pending approvals on app lock',
      );
    }

    // Navigate to lock screen.
    NavigationService.navigation?.navigate(Routes.LOCK_SCREEN);

    // App state listener for prompting authentication when the app is foregrounded.
    yield call(appStateListenerTask);
  }
}

/**
 * Automatically requests authentication on app start.
 */
export function* requestAuthOnAppStart() {
  try {
    yield call(tryBiometricUnlock);
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
    // Init WC2 and SDKConnect in parallel — they are independent and each takes ~1-3 s on cold start;
    yield all([
      call(() => WC2Manager.init({})),
      call(() => SDKConnect.init({ context: 'Nav/App' })),
    ]);
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
        // Fork so the saga loop keeps listening for new deeplink events
        // while parseDeeplinkAfterNavReady waits for navigation to settle.
        yield fork(parseDeeplinkAfterNavReady, url.href, storedSource);
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

    // Initialize SDK services (non-blocking so deeplink parsing is not gated
    // on 3-5 s of WC2/SDKConnect init work).
    if (!hasInitializedSDKServices) {
      yield fork(initializeSDKServices);
      hasInitializedSDKServices = true;
    }

    const deeplink = AppStateEventProcessor.pendingDeeplink;
    const deeplinkSource =
      AppStateEventProcessor.pendingDeeplinkSource ??
      AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

    if (deeplink) {
      // Fork so the saga loop keeps listening for new deeplink events
      // while parseDeeplinkAfterNavReady waits for navigation to settle.
      yield fork(parseDeeplinkAfterNavReady, deeplink, deeplinkSource);
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
  yield fork(rewardsBulkLinkSaga);

  // Send one-time analytics backfill for migrated social login users after
  // persisted state has been rehydrated and app services are available.
  yield fork(backfillSocialLoginMarketingConsentSaga);

  yield fork(promptIosGoogleWarningSheetSaga);
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  yield fork(handleSnapsRegistry);
  ///: END:ONLY_INCLUDE_IF
}
