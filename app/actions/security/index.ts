/* eslint-disable import/prefer-default-export */
import type { Action } from 'redux';

export enum ActionType {
  SET_ALLOW_LOGIN_WITH_REMEMBER_ME = 'SET_ALLOW_LOGIN_WITH_REMEMBER_ME',
  SET_AUTOMATIC_SECURITY_CHECKS = 'SET_AUTOMATIC_SECURITY_CHECKS',
  USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION = 'USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION',
  SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN = 'SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN',
}

export interface AllowLoginWithRememberMeUpdated
  extends Action<ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME> {
  enabled: boolean;
}

export interface AutomaticSecurityChecks
  extends Action<ActionType.SET_AUTOMATIC_SECURITY_CHECKS> {
  enabled: boolean;
}

export interface UserSelectedAutomaticSecurityChecksOptions
  extends Action<ActionType.USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION> {
  selected: boolean;
}

export interface SetAutomaticSecurityChecksModalOpen
  extends Action<ActionType.SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN> {
  open: boolean;
}

export type Action =
  | AllowLoginWithRememberMeUpdated
  | AutomaticSecurityChecks
  | UserSelectedAutomaticSecurityChecksOptions
  | SetAutomaticSecurityChecksModalOpen;

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

export const userSelectedAutomaticSecurityChecksOptions =
  (): UserSelectedAutomaticSecurityChecksOptions => ({
    type: ActionType.USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION,
    selected: true,
  });

export const setAutomaticSecurityChecksModalOpen = (
  open: boolean,
): SetAutomaticSecurityChecksModalOpen => ({
  type: ActionType.SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN,
  open,
});
