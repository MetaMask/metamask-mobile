/* eslint-disable @typescript-eslint/default-param-last */

import {
  ActionType,
  SetSecurityAlertsEnabled,
  SetPpomInitializedCompleted
} from '../../actions/experimental';

const initialState = {
  securityAlertsEnabled: false,
  ppomInitializationCompleted: false,
};

const experimentalSettingsReducer = (
  state = initialState,
  action: {
    securityAlertsEnabled: SetSecurityAlertsEnabled;
    ppomInitializationCompleted: typeof SetPpomInitializedCompleted;
    type: string;
  },
) => {
  switch (action.type) {
    case ActionType.SET_SECURITY_ALERTS_ENABLED:
      return {
        ...state,
        securityAlertsEnabled: action.securityAlertsEnabled,
      };
    case ActionType.SET_PPOM_INITIALIZATION_COMPLETED:
      return {
        ...state,
        ppomInitializationCompleted: action.ppomInitializationCompleted,
      };
    default:
      return state;
  }
};

export default experimentalSettingsReducer;
