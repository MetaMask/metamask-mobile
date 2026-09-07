/* eslint-disable @typescript-eslint/default-param-last */

import {
  ActionType,
  SetSecurityAlertsEnabled,
} from '../../actions/experimental';

const initialState = {
  securityAlertsEnabled: true,
  mmPayDebugEnabled: false,
  nativeTabBarEnabled: false,
  nativeHeaderEnabled: false,
};

const experimentalSettingsReducer = (
  state = initialState,
  action: {
    securityAlertsEnabled: SetSecurityAlertsEnabled;
    mmPayDebugEnabled: boolean;
    nativeTabBarEnabled: boolean;
    nativeHeaderEnabled: boolean;
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
    case ActionType.SET_NATIVE_TAB_BAR_ENABLED:
      return {
        ...state,
        nativeTabBarEnabled: action.nativeTabBarEnabled,
      };
    case ActionType.SET_NATIVE_HEADER_ENABLED:
      return {
        ...state,
        nativeHeaderEnabled: action.nativeHeaderEnabled,
      };
    default:
      return state;
  }
};

export default experimentalSettingsReducer;
