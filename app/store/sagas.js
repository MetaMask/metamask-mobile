import { AppState } from 'react-native';
import { eventChannel, channel, END } from 'redux-saga';
import {
  takeLatest,
  fork,
  all,
  actionChannel,
  call,
  take,
  put,
  cancelled,
  select,
} from 'redux-saga/effects';
import Engine from '../core/Engine';
import NavigationService from '../core/NavigationService';
import LockManager from '../core/LockManager';
import Routes from '../constants/navigation/Routes';
import { StackActions } from '@react-navigation/native';
import { Authentication } from '../core';

function appStateEventChannel() {
  return eventChannel((emit) => {
    const handler = (state) => {
      emit(state);
    };
    const listener = AppState.addEventListener('change', handler);
    return () => listener.remove();
  });
}

export function* appStateChannel() {
  const appStateChannel = yield call(appStateEventChannel);
  try {
    while (true) {
      // take(END) will cause the saga to terminate by jumping to the finally block
      let appState = yield take(appStateChannel);
      // console.log(`appState: ${appState}`);
    }
  } finally {
    // console.log('countdown terminated');
  }
}

async function lockApp() {
  const { KeyringController } = Engine.context;
  try {
    await KeyringController.setLocked();
    NavigationService.navigation.navigate('LockScreen', {
      backgroundMode: true,
    });
  } catch (e) {
    console.log("COULDN't lock keyring", e);
  }
}

// function* login() {
//   try {
//     yield call(Authenticate.login)
//   } catch (e) {
//     // Clean up and logout
//   } finally {
//     if (yield cancelled()) {
//       // Clean up and logout
//     }
//   }

// }

export function* authFlow() {
  yield take('LOGGED_IN');
  while (true) {
    yield take('LOGGED_OUT');
    console.log('LOGGED OUT');
    yield put({ type: 'LOCK_APP' });
    const appStateChannel = yield call(appStateEventChannel);
    let appState = '';
    while (appState !== 'active') {
      appState = yield take(appStateChannel);
    }
    const selectedAddress = yield select(
      (state) =>
        state.engine.backgroundState.PreferencesController.selectedAddress,
    );
    const loginTask = yield fork(
      Authentication.appTriggeredAuth,
      selectedAddress,
    );
    yield take('START_AUTH');
    // Process authentication logic
    const action = yield take(['FINISH_AUTH', 'LOGGED_OUT', 'ERROR_AUTH']);
    if (action.type === 'LOGGED_OUT') {
      // Process locking the app and/or cancel + reconsile cancel logic
      console.log('LOCK IT');
      // NavigationService.navigation.dispatch(
      //   StackActions.replace(Routes.ONBOARDING.LOGIN, { locked: true }),
      // );
      // yield cancel(loginTask)
      // yield call(lockApp);
    } else if (action.type === 'ERROR_AUTH') {
    } else if (action.type === 'FINISH_AUTH') {
      // Navigate to wallet
      console.log('FINISHED AUTH WITHOUT BACKGROUNDING');
      yield put({ type: 'UNLOCK_APP' });
      // NavigationService.navigate('Wallet')
    }
  }
}

function* rootSaga() {
  yield all([yield fork(authFlow)]);
}

export default rootSaga;
