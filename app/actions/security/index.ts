/* eslint-disable import/prefer-default-export */
import type { Action } from 'redux';

export enum ActionType {
  SET_ALLOW_LOGIN_WITH_REMEMBER_ME = 'SET_ALLOW_LOGIN_WITH_REMEMBER_ME',
  SET_AUTOMATIC_SECURITY_CHECKS = 'SET_AUTOMATIC_SECURITY_CHECKS',
}

export interface AllowLoginWithRememberMeUpdated
  extends Action<ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME> {
  enabled: boolean;
}

export interface AutomaticSecurityChecks
  extends Action<ActionType.SET_AUTOMATIC_SECURITY_CHECKS> {
  enabled: boolean;
}

export type Action = AllowLoginWithRememberMeUpdated | AutomaticSecurityChecks;

export const setAllowLoginWithRememberMe = (
  enabled: boolean,
): AllowLoginWithRememberMeUpdated => ({
  type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
  enabled,
});

export const setAutomaticSecurityChecks = (
  enabled: boolean,
): AutomaticSecurityChecks => ({
  type: ActionType.SET_AUTOMATIC_SECURITY_CHECKS,
  enabled,
});
