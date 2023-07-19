// Constants
export const LOCKED_APP = 'LOCKED_APP';
export const AUTH_SUCCESS = 'AUTH_SUCCESS';
export const AUTH_ERROR = 'AUTH_ERROR';
export const IN_APP = 'IN_APP';
export const OUT_APP = 'OUT_APP';
export const INTERUPT_BIOMETRICS = 'INTERUPT_BIOMETRICS';

export function interuptBiometrics() {
  return {
    type: INTERUPT_BIOMETRICS,
  };
}

export function lockApp() {
  return {
    type: LOCKED_APP,
  };
}

export function authSuccess(bioStateMachineId) {
  return {
    type: AUTH_SUCCESS,
    payload: { bioStateMachineId },
  };
}

export function authError(bioStateMachineId) {
  return {
    type: AUTH_ERROR,
    payload: { bioStateMachineId },
  };
}

export function inApp() {
  return {
    type: IN_APP,
  };
}

export function outApp() {
  return {
    type: OUT_APP,
  };
}

export function passwordSet() {
  return {
    type: 'PASSWORD_SET',
  };
}

export function passwordUnset() {
  return {
    type: 'PASSWORD_UNSET',
  };
}

export function seedphraseBackedUp() {
  return {
    type: 'SEEDPHRASE_BACKED_UP',
  };
}

export function seedphraseNotBackedUp() {
  return {
    type: 'SEEDPHRASE_NOT_BACKED_UP',
  };
}

export function backUpSeedphraseAlertVisible() {
  return {
    type: 'BACK_UP_SEEDPHRASE_VISIBLE',
  };
}

export function backUpSeedphraseAlertNotVisible() {
  return {
    type: 'BACK_UP_SEEDPHRASE_NOT_VISIBLE',
  };
}

export function protectWalletModalVisible() {
  return {
    type: 'PROTECT_MODAL_VISIBLE',
  };
}

export function protectWalletModalNotVisible() {
  return {
    type: 'PROTECT_MODAL_NOT_VISIBLE',
  };
}

export function loadingSet(loadingMsg) {
  return {
    type: 'LOADING_SET',
    loadingMsg,
  };
}

export function loadingUnset() {
  return {
    type: 'LOADING_UNSET',
  };
}

export function setGasEducationCarouselSeen() {
  return {
    type: 'SET_GAS_EDUCATION_CAROUSEL_SEEN',
  };
}

export function setNftDetectionDismissed() {
  return {
    type: 'SET_NFT_DETECTION_DISMISSED',
  };
}

export function logIn() {
  return {
    type: 'LOGIN',
  };
}

export function logOut() {
  return {
    type: 'LOGOUT',
  };
}

export function setAppTheme(theme) {
  return {
    type: 'SET_APP_THEME',
    payload: { theme },
  };
}

/**
 * Temporary action to control auth flow
 *
 * @param {string} initialScreen - "login" or "onboarding"
 * @returns - void
 */
export function checkedAuth(initialScreen) {
  return {
    type: 'CHECKED_AUTH',
    payload: {
      initialScreen,
    },
  };
}
