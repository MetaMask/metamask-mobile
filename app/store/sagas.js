import { fork, all, take, cancel } from 'redux-saga/effects';
import NavigationService from '../core/NavigationService';
import Routes from '../constants/navigation/Routes';
import { StackActions } from '@react-navigation/native';
import {
  LOCKED_APP,
  BIOMETRICS_SUCCESS,
  AUTH_SUCCESS,
  AUTH_ERROR,
  IN_APP,
  OUT_APP,
} from '../actions/user';

export function* authStateMachine() {
  // Start when the user is logged in.
  while (yield take(IN_APP)) {
    // Run the biometrics listener concurrently.
    const biometricsListenerTask = yield fork(biometricsListener);
    yield take(OUT_APP);
    // Cancel task when user is logged out.
    yield cancel(biometricsListenerTask);
  }
}

export function* biometricsListener() {
  while (true) {
    yield take(LOCKED_APP);
    // Lock the app.
    NavigationService.navigation.navigate('LockScreen');
    yield take(BIOMETRICS_SUCCESS);
    // Handle next three possible states.
    const action = yield take([AUTH_SUCCESS, LOCKED_APP, AUTH_ERROR]);
    if (action.type === LOCKED_APP) {
      // Re-lock the app.
      NavigationService.navigation.dispatch(StackActions.replace('LockScreen'));
    } else if (action.type === AUTH_ERROR) {
      // Authentication service will automatically log out.
    } else if (action.type === AUTH_SUCCESS) {
      // Navigate to wallet.
      NavigationService.navigation.dispatch(
        StackActions.replace(Routes.ONBOARDING.HOME_NAV, {
          screen: Routes.WALLET_VIEW,
        }),
      );
    }
  }
}

function* rootSaga() {
  yield all([yield fork(authStateMachine)]);
}

export default rootSaga;
