import { fork, take, put, call, all, select } from 'redux-saga/effects';
import {
  setAppServicesReady,
  UserActionType,
  LoginAction,
  CheckForDeeplinkAction,
} from '../../actions/user';
import { NavigationActionType } from '../../actions/navigation';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import {
  overrideXMLHttpRequest,
  restoreXMLHttpRequest,
} from './xmlHttpRequestOverride';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import SharedDeeplinkManager from '../../core/DeeplinkManager/SharedDeeplinkManager';
import AppConstants from '../../core/AppConstants';
import {
  SET_COMPLETED_ONBOARDING,
  SetCompletedOnboardingAction,
} from '../../actions/onboarding';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import { applyVaultInitialization } from '../../util/generateSkipOnboardingState';
import SDKConnect from '../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../core/WalletConnect/WalletConnectV2';
import DeeplinkManager from '../../core/DeeplinkManager/DeeplinkManager';
import { selectExistingUser } from '../../reducers/user';
import UrlParser from 'url-parse';
import { startAuthStateMachine } from './authentication';

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
      // try handle fast onboarding if mobile existingUser flag is false and 'onboarding' present in deeplink
      if (!existingUser && url.pathname === '/onboarding') {
        setTimeout(() => {
          SharedDeeplinkManager.parse(url.href, {
            origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
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

    if (deeplink) {
      // TODO: See if we can hook into a navigation finished event before parsing so that the modal doesn't conflict with ongoing navigation events
      setTimeout(() => {
        SharedDeeplinkManager.parse(deeplink, {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
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
  DeeplinkManager.start();

  // Start AppStateEventProcessor
  AppStateEventProcessor.start();
  yield call(applyVaultInitialization);

  // Unblock the ControllersGate
  yield put(setAppServicesReady());

  // Start the authentication state machine
  yield fork(startAuthStateMachine);
}

// Main generator function that initializes other sagas in parallel.
export function* rootSaga() {
  yield fork(startAppServices);
  yield fork(basicFunctionalityToggle);
  yield fork(handleDeeplinkSaga);
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  yield fork(handleSnapsRegistry);
  ///: END:ONLY_INCLUDE_IF
}
