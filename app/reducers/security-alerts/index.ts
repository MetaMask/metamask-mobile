import { REHYDRATE } from 'redux-persist';
import { SecurityAlertResponse } from '../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';

// Action Types
export const SET_SECURITY_ALERT_RESPONSE = 'SECURITY_ALERTS/SET_ALERT_RESPONSE';
export const CLEAR_SECURITY_ALERT_RESPONSE =
  'SECURITY_ALERTS/CLEAR_ALERT_RESPONSE';

// Action Creators
export function setSecurityAlertResponse(
  id: string,
  securityAlertResponse: SecurityAlertResponse,
) {
  return {
    type: SET_SECURITY_ALERT_RESPONSE,
    id,
    securityAlertResponse,
  };
}

export function clearSecurityAlertResponse(id: string) {
  return {
    type: CLEAR_SECURITY_ALERT_RESPONSE,
    id,
  };
}

// State Type
export interface SecurityAlertsState {
  alerts: Record<string, SecurityAlertResponse>;
}

const initialState: SecurityAlertsState = {
  alerts: {},
};

// Action Type
interface SecurityAlertsAction {
  type: string;
  id?: string;
  securityAlertResponse?: SecurityAlertResponse;
}

// Reducer
/* eslint-disable @typescript-eslint/default-param-last */
const securityAlertsReducer = (
  state: SecurityAlertsState = initialState,
  action: SecurityAlertsAction,
): SecurityAlertsState => {
  switch (action.type) {
    case REHYDRATE:
      return { ...initialState };
    case SET_SECURITY_ALERT_RESPONSE: {
      const { id, securityAlertResponse } = action;
      if (!id || !securityAlertResponse) return state;
      return {
        ...state,
        alerts: {
          ...state.alerts,
          [id]: securityAlertResponse,
        },
      };
    }
    case CLEAR_SECURITY_ALERT_RESPONSE: {
      const { id } = action;
      if (!id) return state;
      const { [id]: _, ...remainingAlerts } = state.alerts;
      return {
        ...state,
        alerts: remainingAlerts,
      };
    }
    default:
      return state;
  }
};

export default securityAlertsReducer;

// Selectors
export const selectSecurityAlertResponse = (
  state: { securityAlerts: SecurityAlertsState },
  id: string,
) => state.securityAlerts?.alerts?.[id];
