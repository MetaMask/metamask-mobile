/* eslint-disable import/prefer-default-export */
import type { Action } from 'redux';

export enum ActionType {
  SET_ALLOW_LOGIN_WITH_REMEMBER_ME = 'SET_ALLOW_LOGIN_WITH_REMEMBER_ME',
}

export interface AllowLoginWithRememberMeUpdated
  extends Action<ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME> {
  enabled: boolean;
}

export type Action = AllowLoginWithRememberMeUpdated;

export const setAllowLoginWithRememberMe = (
  enabled: boolean,
): AllowLoginWithRememberMeUpdated => ({
  type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
  enabled,
});
