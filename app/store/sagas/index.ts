import { fork, take, cancel, put, call, delay } from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import { StackActions } from '@react-navigation/native';
import {
  LOCKED_APP,
  BIOMETRICS_SUCCESS,
  AUTH_SUCCESS,
  AUTH_ERROR,
  IN_APP,
  OUT_APP,
  TRY_ACTION,
  lockApp,
} from '../../actions/user';
import { Task } from 'redux-saga';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';

/**
 * The state machine for detecting when the app is either IN_APP aka on the Wallet screen
 * or is OUT_APP aka on the LogIn screen. While on the Wallet screen, this state machine
 * will "listen" to the biometrics state machine.
 */
export function* authStateMachine() {
  // Start when the user is logged in.
  while (true) {
    yield take(IN_APP);
    // Run the biometrics listener concurrently.
    const biometricsListenerTask: Task<void> = yield fork(
      biometricsStateMachine,
    );
    yield take(OUT_APP);
    // Cancel task when user is logged out.
    yield cancel(biometricsListenerTask);
  }
}

function* forceLockApp() {
  yield put(lockApp());
}

/**
 * The state machine, which is responsible for handling the state changes related to
 * biometrics authentication as well as interruptions caused by backgrounding the app.
 */
export function* biometricsStateMachine() {
  while (true) {
    yield take(LOCKED_APP);
    // Lock the app.
    NavigationService.navigation?.navigate(Routes.LOCK_SCREEN);
    yield take(BIOMETRICS_SUCCESS);
    // Handle next three possible states.
    const action: {
      type:
        | typeof AUTH_SUCCESS
        | typeof LOCKED_APP
        | typeof AUTH_ERROR
        | typeof TRY_ACTION;
    } = yield take([AUTH_SUCCESS, LOCKED_APP, AUTH_ERROR, TRY_ACTION]);

    if (action.type === LOCKED_APP || action.type === TRY_ACTION) {
      // Re-lock the app.
      if (action.type === TRY_ACTION) {
        const { KeyringController } = Engine.context;
        try {
          yield call(KeyringController.setLocked);
        } catch (e) {
          Logger.log('Failed to lock KeyringController', e);
        }

        yield fork(forceLockApp);
      }

      NavigationService.navigation?.dispatch(
        StackActions.replace(Routes.LOCK_SCREEN),
      );
    } else if (action.type === AUTH_ERROR) {
      // Authentication service will automatically log out.
    } else if (action.type === AUTH_SUCCESS) {
      // Navigate to wallet.
      NavigationService.navigation?.dispatch(
        StackActions.replace(Routes.ONBOARDING.HOME_NAV, {
          screen: Routes.WALLET_VIEW,
        }),
      );
    }
  }
}

// Main generator function that initializes other sagas in parallel.
function* rootSaga() {
  yield fork(authStateMachine);
}

export default rootSaga;
