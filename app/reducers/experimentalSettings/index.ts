/* eslint-disable @typescript-eslint/default-param-last */

import {
  ActionType,
  SetSecurityAlertsEnabled,
} from '../../actions/experimental';

const initialState = {
  securityAlertsEnabled: true,
  mmPayDebugEnabled: false,
};

const experimentalSettingsReducer = (
  state = initialState,
  action: {
    securityAlertsEnabled: SetSecurityAlertsEnabled;
    mmPayDebugEnabled: boolean;
    type: string;
  },
) => {
  switch (action.type) {
    case ActionType.SET_SECURITY_ALERTS_ENABLED:
      return {
        ...state,
        securityAlertsEnabled: action.securityAlertsEnabled,
      };
    case ActionType.SET_MM_PAY_DEBUG_ENABLED:
      return {
        ...state,
        mmPayDebugEnabled: action.mmPayDebugEnabled,
      };
    default:
      return state;
  }
};

export default experimentalSettingsReducer;
