import { fork, take, cancel, put, call } from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import { StackActions } from '@react-navigation/native';
import {
  LOCKED_APP,
  AUTH_SUCCESS,
  AUTH_ERROR,
  IN_APP,
  OUT_APP,
  lockApp,
  INTERUPT_BIOMETRICS,
} from '../../actions/user';
import { Task } from 'redux-saga';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';

function* appLockStateMachine() {
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
    NavigationService.navigation?.dispatch(
      StackActions.replace(Routes.LOCK_SCREEN, {
        bioStateMachineId,
      }),
    );
  }
}

/**
 * The state machine for detecting when the app is either IN_APP aka on the Wallet screen
 * or is OUT_APP aka on the LogIn screen. While on the Wallet screen, this state machine
 * will "listen" to the app lock state machine.
 */
export function* authStateMachine() {
  // Start when the user is logged in.
  while (true) {
    yield take(IN_APP);
    // Listen to app lock behavior.
    const appLockStateMachineTask: Task<void> = yield fork(appLockStateMachine);
    yield take(OUT_APP);
    // Cancels appLockStateMachineTask, which also cancels nested sagas once logged out.
    yield cancel(appLockStateMachineTask);
  }
}

/**
 * Locks the KeyringController and dispatches LOCK_APP.
 */
function* lockKeyringAndApp() {
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
  while (true) {
    // Handle next three possible states.
    const action: {
      type:
        | typeof AUTH_SUCCESS
        | typeof AUTH_ERROR
        | typeof INTERUPT_BIOMETRICS;
      payload?: { bioStateMachineId: string };
    } = yield take([AUTH_SUCCESS, AUTH_ERROR, INTERUPT_BIOMETRICS]);
    if (action.type === INTERUPT_BIOMETRICS) {
      // Biometrics was most likely interupted during authentication with a non-zero lock timer.
      yield fork(lockKeyringAndApp);
    } else {
      // Only handle if actions originated from corresponding state machine.
      const bioStateMachineId = action.payload?.bioStateMachineId;
      if (originalBioStateMachineId === bioStateMachineId) {
        if (action.type === AUTH_ERROR) {
          // Authentication service will automatically log out.
        } else if (action.type === AUTH_SUCCESS) {
          // Authentication successful. Navigate to wallet.
          NavigationService.navigation?.dispatch(
            StackActions.replace(Routes.ONBOARDING.HOME_NAV, {
              screen: Routes.WALLET_VIEW,
            }),
          );
        }
      }
    }
  }
}

// Main generator function that initializes other sagas in parallel.
function* rootSaga() {
  yield fork(authStateMachine);
}

export default rootSaga;
