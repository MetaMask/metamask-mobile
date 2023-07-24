import { fork, take, cancel, put, call } from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  LOCKED_APP,
  AUTH_SUCCESS,
  AUTH_ERROR,
  lockApp,
  INTERUPT_BIOMETRICS,
  LOGOUT,
  LOGIN,
} from '../../actions/user';
import { Task } from 'redux-saga';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import LockManagerService from '../../core/LockManagerService';

export function* appLockStateMachine() {
  let biometricsListenerTask: Task<void> | undefined;
  while (true) {
    yield take(LOCKED_APP);
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
    yield take(LOGIN);
    const appLockStateMachineTask: Task<void> = yield fork(appLockStateMachine);
    LockManagerService.startListening();
    // Listen to app lock behavior.
    yield take(LOGOUT);
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
    | {
        type:
          | typeof AUTH_SUCCESS
          | typeof AUTH_ERROR
          | typeof INTERUPT_BIOMETRICS;
        payload?: { bioStateMachineId: string };
      }
    | undefined;

  // Only continue on INTERUPT_BIOMETRICS action or when actions originated from corresponding state machine.
  while (!shouldHandleAction) {
    action = yield take([AUTH_SUCCESS, AUTH_ERROR, INTERUPT_BIOMETRICS]);
    if (
      action?.type === INTERUPT_BIOMETRICS ||
      action?.payload?.bioStateMachineId === originalBioStateMachineId
    ) {
      shouldHandleAction = true;
    }
  }

  if (action?.type === INTERUPT_BIOMETRICS) {
    // Biometrics was most likely interupted during authentication with a non-zero lock timer.
    yield fork(lockKeyringAndApp);
  } else if (action?.type === AUTH_ERROR) {
    // Authentication service will automatically log out.
  } else if (action?.type === AUTH_SUCCESS) {
    // Authentication successful. Navigate to wallet.
    NavigationService.navigation?.navigate(Routes.ONBOARDING.HOME_NAV);
  }
}

// Main generator function that initializes other sagas in parallel.
export function* rootSaga() {
  yield fork(authStateMachine);
}
