import type { Action } from 'redux';

export enum ActionType {
  SET_SECURITY_ALERTS_ENABLED = 'SET_SECURITY_ALERTS_ENABLED',
  SET_PPOM_INITIALIZATION_STATUS = 'SET_PPOM_INITIALIZATION_STATUS',
}

export interface SetSecurityAlertsEnabled
  extends Action<ActionType.SET_SECURITY_ALERTS_ENABLED> {
  securityAlertsEnabled: boolean;
}
