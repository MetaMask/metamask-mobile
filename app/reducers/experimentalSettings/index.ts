/* eslint-disable @typescript-eslint/default-param-last */

import {
  ActionType,
  SetSecurityAlertsEnabled,
} from '../../actions/experimental';

const initialState = {
  securityAlertsEnabled: false,
};

const experimentalSettingsReducer = (
  state = initialState,
  action: SetSecurityAlertsEnabled,
) => {
  switch (action.type) {
    case ActionType.SET_SECURITY_ALERTS_ENABLED:
      return {
        ...state,
        securityAlertsEnabled: action.securityAlertsEnabled,
      };
    default:
      return state;
  }
};

export default experimentalSettingsReducer;
