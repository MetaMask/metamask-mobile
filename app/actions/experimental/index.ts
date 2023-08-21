/* eslint-disable import/prefer-default-export */
import type { Action } from 'redux';

export enum ActionType {
  SET_SECURITY_ALERTS_ENABLED = 'SET_SECURITY_ALERTS_ENABLED',
}

export interface SetSecurityAlertsEnabled
  extends Action<ActionType.SET_SECURITY_ALERTS_ENABLED> {
  securityAlertsEnabled: boolean;
}

export const setSecurityAlertsEnabled = (
  securityAlertsEnabled: boolean,
): SetSecurityAlertsEnabled => ({
  type: ActionType.SET_SECURITY_ALERTS_ENABLED,
  securityAlertsEnabled,
});
