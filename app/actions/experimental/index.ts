import type { Action } from 'redux';

export enum ActionType {
  SET_SECURITY_ALERTS_ENABLED = 'SET_SECURITY_ALERTS_ENABLED',
  SET_PPOM_INITIALIZATION_STATUS = 'SET_PPOM_INITIALIZATION_STATUS',
  SET_MM_PAY_DEBUG_ENABLED = 'SET_MM_PAY_DEBUG_ENABLED',
}

export interface SetSecurityAlertsEnabled
  extends Action<ActionType.SET_SECURITY_ALERTS_ENABLED> {
  securityAlertsEnabled: boolean;
}

export interface SetMmPayDebugEnabled
  extends Action<ActionType.SET_MM_PAY_DEBUG_ENABLED> {
  mmPayDebugEnabled: boolean;
}

export function setMmPayDebugEnabled(
  mmPayDebugEnabled: boolean,
): SetMmPayDebugEnabled {
  return {
    type: ActionType.SET_MM_PAY_DEBUG_ENABLED,
    mmPayDebugEnabled,
  };
}
