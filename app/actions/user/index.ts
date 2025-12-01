import { type AppThemeKey } from '../../util/theme/models';
import {
  type InterruptBiometricsAction,
  type LockAppAction,
  type CheckForDeeplinkAction,
  type AuthSuccessAction,
  type AuthErrorAction,
  type PasswordSetAction,
  type PasswordUnsetAction,
  type SeedphraseBackedUpAction,
  type SeedphraseNotBackedUpAction,
  type BackUpSeedphraseVisibleAction,
  type BackUpSeedphraseNotVisibleAction,
  type ProtectModalVisibleAction,
  type ProtectModalNotVisibleAction,
  type LoadingSetAction,
  type LoadingUnsetAction,
  type SetGasEducationCarouselSeenAction,
  type LoginAction,
  type LogoutAction,
  type SetAppThemeAction,
  type CheckedAuthAction,
  type PersistedDataLoadedAction,
  type SetAppServicesReadyAction,
  type SetExistingUserAction,
  type SetIsConnectionRemovedAction,
  type SetMultichainAccountsIntroModalSeenAction,
  type SetMusdConversionEducationSeenAction,
  UserActionType,
} from './types';

export * from './types';

export function interruptBiometrics(): InterruptBiometricsAction {
  return {
    type: UserActionType.INTERRUPT_BIOMETRICS,
  };
}

export function lockApp(): LockAppAction {
  return {
    type: UserActionType.LOCKED_APP,
  };
}

export function checkForDeeplink(): CheckForDeeplinkAction {
  return {
    type: UserActionType.CHECK_FOR_DEEPLINK,
  };
}

export function authSuccess(bioStateMachineId?: string): AuthSuccessAction {
  return {
    type: UserActionType.AUTH_SUCCESS,
    payload: { bioStateMachineId },
  };
}

export function authError(bioStateMachineId?: string): AuthErrorAction {
  return {
    type: UserActionType.AUTH_ERROR,
    payload: { bioStateMachineId },
  };
}

export function passwordSet(): PasswordSetAction {
  return {
    type: UserActionType.PASSWORD_SET,
  };
}

export function passwordUnset(): PasswordUnsetAction {
  return {
    type: UserActionType.PASSWORD_UNSET,
  };
}

export function seedphraseBackedUp(): SeedphraseBackedUpAction {
  return {
    type: UserActionType.SEEDPHRASE_BACKED_UP,
  };
}

export function seedphraseNotBackedUp(): SeedphraseNotBackedUpAction {
  return {
    type: UserActionType.SEEDPHRASE_NOT_BACKED_UP,
  };
}

export function backUpSeedphraseAlertVisible(): BackUpSeedphraseVisibleAction {
  return {
    type: UserActionType.BACK_UP_SEEDPHRASE_VISIBLE,
  };
}

export function backUpSeedphraseAlertNotVisible(): BackUpSeedphraseNotVisibleAction {
  return {
    type: UserActionType.BACK_UP_SEEDPHRASE_NOT_VISIBLE,
  };
}

export function protectWalletModalVisible(): ProtectModalVisibleAction {
  return {
    type: UserActionType.PROTECT_MODAL_VISIBLE,
  };
}

export function protectWalletModalNotVisible(): ProtectModalNotVisibleAction {
  return {
    type: UserActionType.PROTECT_MODAL_NOT_VISIBLE,
  };
}

export function loadingSet(loadingMsg: string): LoadingSetAction {
  return {
    type: UserActionType.LOADING_SET,
    loadingMsg,
  };
}

export function loadingUnset(): LoadingUnsetAction {
  return {
    type: UserActionType.LOADING_UNSET,
  };
}

export function setGasEducationCarouselSeen(): SetGasEducationCarouselSeenAction {
  return {
    type: UserActionType.SET_GAS_EDUCATION_CAROUSEL_SEEN,
  };
}

export function logIn(): LoginAction {
  return {
    type: UserActionType.LOGIN,
  };
}

export function logOut(): LogoutAction {
  return {
    type: UserActionType.LOGOUT,
  };
}

export function setAppTheme(theme: AppThemeKey): SetAppThemeAction {
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
export function checkedAuth(initialScreen: string): CheckedAuthAction {
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
export function onPersistedDataLoaded(): PersistedDataLoadedAction {
  return {
    type: UserActionType.ON_PERSISTED_DATA_LOADED,
  };
}

/**
 * Action to signal that app services are ready
 */
export function setAppServicesReady(): SetAppServicesReadyAction {
  return {
    type: UserActionType.SET_APP_SERVICES_READY,
  };
}

/**
 * Action to set existing user flag
 */
export function setExistingUser(existingUser: boolean): SetExistingUserAction {
  return {
    type: UserActionType.SET_EXISTING_USER,
    payload: { existingUser },
  };
}

/**
 * Action to set isConnectionRemoved state
 */
export function setIsConnectionRemoved(
  isConnectionRemoved: boolean,
): SetIsConnectionRemovedAction {
  return {
    type: UserActionType.SET_IS_CONNECTION_REMOVED,
    payload: { isConnectionRemoved },
  };
}

/**
 * Action to set multichain accounts intro modal as seen
 */
export function setMultichainAccountsIntroModalSeen(
  seen: boolean,
): SetMultichainAccountsIntroModalSeenAction {
  return {
    type: UserActionType.SET_MULTICHAIN_ACCOUNTS_INTRO_MODAL_SEEN,
    payload: { seen },
  };
}

/**
 * Action to set mUSD conversion education as seen
 */
export function setMusdConversionEducationSeen(): SetMusdConversionEducationSeenAction {
  return {
    type: UserActionType.SET_MUSD_CONVERSION_EDUCATION_SEEN,
  };
}
