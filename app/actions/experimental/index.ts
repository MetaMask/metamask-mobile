/* eslint-disable import/prefer-default-export */
import type { Action } from 'redux';

export enum ActionType {
  SET_SECURITY_ALERTS_ENABLED = 'SET_SECURITY_ALERTS_ENABLED',
  SET_PPOM_INITIALIZATION_COMPLETED = 'SET_PPOM_INITIALIZATION_COMPLETED',
}

export interface SetSecurityAlertsEnabled
  extends Action<ActionType.SET_SECURITY_ALERTS_ENABLED> {
  securityAlertsEnabled: boolean;
}

export function SetPpomInitializedCompleted(value: boolean) {
  return {
    type: ActionType.SET_PPOM_INITIALIZATION_COMPLETED,
    ppomInitializationCompleted: value,
  };
}