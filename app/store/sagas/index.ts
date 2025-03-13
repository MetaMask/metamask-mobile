import { fork, take, cancel, put, call, all } from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  AuthSuccessAction,
  AuthErrorAction,
  InterruptBiometricsAction,
  lockApp,
  setAppServicesReady,
  UserActionType,
} from '../../actions/user';
import { NavigationActionType } from '../../actions/navigation';
import { Task } from 'redux-saga';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import LockManagerService from '../../core/LockManagerService';
import {
  overrideXMLHttpRequest,
  restoreXMLHttpRequest,
} from './xmlHttpRequestOverride';
import EngineService from '../../core/EngineService';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';

export function* appLockStateMachine() {
  let biometricsListenerTask: Task<void> | undefined;
  while (true) {
    yield take(UserActionType.LOCKED_APP);
    if (biometricsListenerTask) {
      yield cancel(biometricsListenerTask);
    }
    const bioStateMachineId = Date.now().toString();
    biometricsListenerTask = yield fork(
      biometricsStateMachine,
      bioStateMachineId,
    );
    NavigationService.navigation?.navigate(Routes.LOCK_SCREEN, {
      bioStateMachineId,
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
    const appLockStateMachineTask: Task<void> = yield fork(appLockStateMachine);
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

/**
 * The state machine, which is responsible for handling the state
 * changes related to biometrics authentication.
 */
export function* biometricsStateMachine(originalBioStateMachineId: string) {
  // This state machine is only good for a one time use. After it's finished, it relies on LOCKED_APP to restart it.
  // Handle next three possible states.
  let shouldHandleAction = false;
  let action:
    | AuthSuccessAction
    | AuthErrorAction
    | InterruptBiometricsAction
    | undefined;

  // Only continue on INTERRUPT_BIOMETRICS action or when actions originated from corresponding state machine.
  while (!shouldHandleAction) {
    action = yield take([
      UserActionType.AUTH_SUCCESS,
      UserActionType.AUTH_ERROR,
      UserActionType.INTERRUPT_BIOMETRICS,
    ]);
    if (
      action?.type === UserActionType.INTERRUPT_BIOMETRICS ||
      action?.payload?.bioStateMachineId === originalBioStateMachineId
    ) {
      shouldHandleAction = true;
    }
  }

  if (action?.type === UserActionType.INTERRUPT_BIOMETRICS) {
    // Biometrics was most likely interrupted during authentication with a non-zero lock timer.
    yield fork(lockKeyringAndApp);
  } else if (action?.type === UserActionType.AUTH_ERROR) {
    // Authentication service will automatically log out.
  } else if (action?.type === UserActionType.AUTH_SUCCESS) {
    // Authentication successful. Navigate to wallet.
    NavigationService.navigation?.navigate(Routes.ONBOARDING.HOME_NAV);
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

  // Start AppStateEventProcessor
  AppStateEventProcessor.start();

  // Unblock the ControllersGate
  yield put(setAppServicesReady());
}

// Main generator function that initializes other sagas in parallel.
export function* rootSaga() {
  yield fork(startAppServices);
  yield fork(authStateMachine);
  yield fork(basicFunctionalityToggle);
}
