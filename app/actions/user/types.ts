import { AppThemeKey } from '../../util/theme/models';

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

export type UserAction =
  | { type: UserActionType.LOCKED_APP }
  | {
      type: UserActionType.AUTH_SUCCESS;
      payload: { bioStateMachineId: string };
    }
  | { type: UserActionType.AUTH_ERROR; payload: { bioStateMachineId: string } }
  | { type: UserActionType.INTERRUPT_BIOMETRICS }
  | { type: UserActionType.LOGIN }
  | { type: UserActionType.LOGOUT }
  | { type: UserActionType.ON_PERSISTED_DATA_LOADED }
  | { type: UserActionType.PASSWORD_SET }
  | { type: UserActionType.PASSWORD_UNSET }
  | { type: UserActionType.SEEDPHRASE_BACKED_UP }
  | { type: UserActionType.SEEDPHRASE_NOT_BACKED_UP }
  | { type: UserActionType.BACK_UP_SEEDPHRASE_VISIBLE }
  | { type: UserActionType.BACK_UP_SEEDPHRASE_NOT_VISIBLE }
  | { type: UserActionType.PROTECT_MODAL_VISIBLE }
  | { type: UserActionType.PROTECT_MODAL_NOT_VISIBLE }
  | { type: UserActionType.LOADING_SET; loadingMsg: string }
  | { type: UserActionType.LOADING_UNSET }
  | { type: UserActionType.SET_GAS_EDUCATION_CAROUSEL_SEEN }
  | { type: UserActionType.SET_APP_THEME; payload: { theme: AppThemeKey } }
  | { type: UserActionType.CHECKED_AUTH; payload: { initialScreen: string } };
