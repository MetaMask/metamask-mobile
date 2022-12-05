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
