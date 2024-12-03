import { AppThemeKey } from '../../util/theme/models';
import { UserActionType, UserAction } from './types';

export * from './types';

export function interruptBiometrics(): UserAction {
  return {
    type: UserActionType.INTERRUPT_BIOMETRICS,
  };
}

export function lockApp(): UserAction {
  return {
    type: UserActionType.LOCKED_APP,
  };
}

export function authSuccess(bioStateMachineId: string): UserAction {
  return {
    type: UserActionType.AUTH_SUCCESS,
    payload: { bioStateMachineId },
  };
}

export function authError(bioStateMachineId: string): UserAction {
  return {
    type: UserActionType.AUTH_ERROR,
    payload: { bioStateMachineId },
  };
}

export function passwordSet(): UserAction {
  return {
    type: UserActionType.PASSWORD_SET,
  };
}

export function passwordUnset(): UserAction {
  return {
    type: UserActionType.PASSWORD_UNSET,
  };
}

export function seedphraseBackedUp(): UserAction {
  return {
    type: UserActionType.SEEDPHRASE_BACKED_UP,
  };
}

export function seedphraseNotBackedUp(): UserAction {
  return {
    type: UserActionType.SEEDPHRASE_NOT_BACKED_UP,
  };
}

export function backUpSeedphraseAlertVisible(): UserAction {
  return {
    type: UserActionType.BACK_UP_SEEDPHRASE_VISIBLE,
  };
}

export function backUpSeedphraseAlertNotVisible(): UserAction {
  return {
    type: UserActionType.BACK_UP_SEEDPHRASE_NOT_VISIBLE,
  };
}

export function protectWalletModalVisible(): UserAction {
  return {
    type: UserActionType.PROTECT_MODAL_VISIBLE,
  };
}

export function protectWalletModalNotVisible(): UserAction {
  return {
    type: UserActionType.PROTECT_MODAL_NOT_VISIBLE,
  };
}

export function loadingSet(loadingMsg: string): UserAction {
  return {
    type: UserActionType.LOADING_SET,
    loadingMsg,
  };
}

export function loadingUnset(): UserAction {
  return {
    type: UserActionType.LOADING_UNSET,
  };
}

export function setGasEducationCarouselSeen(): UserAction {
  return {
    type: UserActionType.SET_GAS_EDUCATION_CAROUSEL_SEEN,
  };
}

export function logIn(): UserAction {
  return {
    type: UserActionType.LOGIN,
  };
}

export function logOut(): UserAction {
  return {
    type: UserActionType.LOGOUT,
  };
}

export function setAppTheme(theme: AppThemeKey): UserAction {
  return {
    type: UserActionType.SET_APP_THEME,
    payload: { theme },
  };
}

/**
 * Temporary action to control auth flow
 *
 * @param initialScreen - "login" or "onboarding"
 */
export function checkedAuth(initialScreen: string): UserAction {
  return {
    type: UserActionType.CHECKED_AUTH,
    payload: {
      initialScreen,
    },
  };
}

/**
 * Action to signal that persisted data has been loaded
 */
export function onPersistedDataLoaded(): UserAction {
  return {
    type: UserActionType.ON_PERSISTED_DATA_LOADED,
  };
}
