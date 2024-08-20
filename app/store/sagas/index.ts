import { fork, take, cancel, put, call } from 'redux-saga/effects';
import NavigationService from '../../core/NavigationService';
import Routes from '../../constants/navigation/Routes';
import {
  LOCKED_APP,
  AUTH_SUCCESS,
  AUTH_ERROR,
  lockApp,
  INTERRUPT_BIOMETRICS,
  LOGOUT,
  LOGIN,
} from '../../actions/user';
import { Task } from 'redux-saga';
// import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import LockManagerService from '../../core/LockManagerService';
import AppConstants from '../../../app/core/AppConstants';
import { XMLHttpRequest as _XMLHttpRequest } from 'xhr2';
import EngineService from '../../core/EngineService';

if (typeof global.XMLHttpRequest === 'undefined') {
  global.XMLHttpRequest = _XMLHttpRequest;
}

const originalSend = XMLHttpRequest.prototype.send;
const originalOpen = XMLHttpRequest.prototype.open;

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
    console.log('LOGGED IN');
    // const reduxState = HeartService.store.getState?.();
    // const state = reduxState?.engine?.backgroundState || {};
    // Engine.init(state, HeartService.context);
    EngineService.initalizeEngine();
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
          | typeof INTERRUPT_BIOMETRICS;
        payload?: { bioStateMachineId: string };
      }
    | undefined;

  // Only continue on INTERRUPT_BIOMETRICS action or when actions originated from corresponding state machine.
  while (!shouldHandleAction) {
    action = yield take([AUTH_SUCCESS, AUTH_ERROR, INTERRUPT_BIOMETRICS]);
    if (
      action?.type === INTERRUPT_BIOMETRICS ||
      action?.payload?.bioStateMachineId === originalBioStateMachineId
    ) {
      shouldHandleAction = true;
    }
  }

  if (action?.type === INTERRUPT_BIOMETRICS) {
    // Biometrics was most likely interrupted during authentication with a non-zero lock timer.
    yield fork(lockKeyringAndApp);
  } else if (action?.type === AUTH_ERROR) {
    // Authentication service will automatically log out.
  } else if (action?.type === AUTH_SUCCESS) {
    // Authentication successful. Navigate to wallet.
    NavigationService.navigation?.navigate(Routes.ONBOARDING.HOME_NAV);
  }
}

export function* basicFunctionalityToggle() {
  const overrideXMLHttpRequest = () => {
    // Store the URL of the current request
    let currentUrl = '';
    const blockList = AppConstants.BASIC_FUNCTIONALITY_BLOCK_LIST;

    const shouldBlockRequest = (url: string) =>
      blockList.some((blockedUrl) => url.includes(blockedUrl));

    const handleError = () =>
      Promise.reject(new Error(`Disallowed URL: ${currentUrl}`)).catch(
        (error) => {
          console.error(error);
        },
      );

    // Override the 'open' method to capture the request URL
    XMLHttpRequest.prototype.open = function (method, url) {
      currentUrl = url.toString(); // Convert URL object to string
      return originalOpen.apply(this, [method, currentUrl]);
    };

    // Override the 'send' method to implement the blocking logic
    XMLHttpRequest.prototype.send = function (body) {
      // Check if the current request should be blocked
      if (shouldBlockRequest(currentUrl)) {
        handleError(); // Trigger an error callback or handle the blocked request as needed
        return; // Do not proceed with the request
      }
      // For non-blocked requests, proceed as normal
      return originalSend.call(this, body);
    };
  };

  function restoreXMLHttpRequest() {
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
  }

  while (true) {
    const { basicFunctionalityEnabled } = yield take(
      'TOGGLE_BASIC_FUNCTIONALITY',
    );

    if (basicFunctionalityEnabled) {
      restoreXMLHttpRequest();
    } else {
      overrideXMLHttpRequest();
    }
  }
}

// Main generator function that initializes other sagas in parallel.
export function* rootSaga() {
  yield fork(authStateMachine);
  yield fork(basicFunctionalityToggle);
}
