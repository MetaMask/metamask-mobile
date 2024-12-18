import { type AppThemeKey } from '../../util/theme/models';
import { type Action } from 'redux';

// Action type enum
export enum UserActionType {
  LOCKED_APP = 'LOCKED_APP',
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_ERROR = 'AUTH_ERROR',
  INTERRUPT_BIOMETRICS = 'INTERRUPT_BIOMETRICS',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ON_PERSISTED_DATA_LOADED = 'ON_PERSISTED_DATA_LOADED',
  PASSWORD_SET = 'PASSWORD_SET',
  PASSWORD_UNSET = 'PASSWORD_UNSET',
  SEEDPHRASE_BACKED_UP = 'SEEDPHRASE_BACKED_UP',
  SEEDPHRASE_NOT_BACKED_UP = 'SEEDPHRASE_NOT_BACKED_UP',
  BACK_UP_SEEDPHRASE_VISIBLE = 'BACK_UP_SEEDPHRASE_VISIBLE',
  BACK_UP_SEEDPHRASE_NOT_VISIBLE = 'BACK_UP_SEEDPHRASE_NOT_VISIBLE',
  PROTECT_MODAL_VISIBLE = 'PROTECT_MODAL_VISIBLE',
  PROTECT_MODAL_NOT_VISIBLE = 'PROTECT_MODAL_NOT_VISIBLE',
  LOADING_SET = 'LOADING_SET',
  LOADING_UNSET = 'LOADING_UNSET',
  SET_GAS_EDUCATION_CAROUSEL_SEEN = 'SET_GAS_EDUCATION_CAROUSEL_SEEN',
  SET_APP_THEME = 'SET_APP_THEME',
  CHECKED_AUTH = 'CHECKED_AUTH',
}

// User actions
export type LockAppAction = Action<UserActionType.LOCKED_APP>;

export type AuthSuccessAction = Action<UserActionType.AUTH_SUCCESS> & {
  payload: { bioStateMachineId?: string };
};

export type AuthErrorAction = Action<UserActionType.AUTH_ERROR> & {
  payload: { bioStateMachineId?: string };
};

export type InterruptBiometricsAction =
  Action<UserActionType.INTERRUPT_BIOMETRICS>;

export type LoginAction = Action<UserActionType.LOGIN>;

export type LogoutAction = Action<UserActionType.LOGOUT>;

export type PersistedDataLoadedAction =
  Action<UserActionType.ON_PERSISTED_DATA_LOADED>;

export type PasswordSetAction = Action<UserActionType.PASSWORD_SET>;

export type PasswordUnsetAction = Action<UserActionType.PASSWORD_UNSET>;

export type SeedphraseBackedUpAction =
  Action<UserActionType.SEEDPHRASE_BACKED_UP>;

export type SeedphraseNotBackedUpAction =
  Action<UserActionType.SEEDPHRASE_NOT_BACKED_UP>;

export type BackUpSeedphraseVisibleAction =
  Action<UserActionType.BACK_UP_SEEDPHRASE_VISIBLE>;

export type BackUpSeedphraseNotVisibleAction =
  Action<UserActionType.BACK_UP_SEEDPHRASE_NOT_VISIBLE>;

export type ProtectModalVisibleAction =
  Action<UserActionType.PROTECT_MODAL_VISIBLE>;

export type ProtectModalNotVisibleAction =
  Action<UserActionType.PROTECT_MODAL_NOT_VISIBLE>;

export type LoadingSetAction = Action<UserActionType.LOADING_SET> & {
  loadingMsg: string;
};

export type LoadingUnsetAction = Action<UserActionType.LOADING_UNSET>;

export type SetGasEducationCarouselSeenAction =
  Action<UserActionType.SET_GAS_EDUCATION_CAROUSEL_SEEN>;

export type SetAppThemeAction = Action<UserActionType.SET_APP_THEME> & {
  payload: { theme: AppThemeKey };
};

export type CheckedAuthAction = Action<UserActionType.CHECKED_AUTH> & {
  payload: { initialScreen: string };
};

/**
 * User actions union type
 */
export type UserAction =
  | LockAppAction
  | AuthSuccessAction
  | AuthErrorAction
  | InterruptBiometricsAction
  | LoginAction
  | LogoutAction
  | PersistedDataLoadedAction
  | PasswordSetAction
  | PasswordUnsetAction
  | SeedphraseBackedUpAction
  | SeedphraseNotBackedUpAction
  | BackUpSeedphraseVisibleAction
  | BackUpSeedphraseNotVisibleAction
  | ProtectModalVisibleAction
  | ProtectModalNotVisibleAction
  | LoadingSetAction
  | LoadingUnsetAction
  | SetGasEducationCarouselSeenAction
  | SetAppThemeAction
  | CheckedAuthAction;
