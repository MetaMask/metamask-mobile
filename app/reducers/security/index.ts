/* eslint-disable @typescript-eslint/default-param-last */
import { ActionType, Action } from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';

const initialState: Readonly<SecuritySettingsState> = {
  allowLoginWithRememberMe: false,
  automaticSecurityChecks: true,
};

const securityReducer = (
  state: SecuritySettingsState = initialState,
  action: Action,
): SecuritySettingsState => {
  switch (action.type) {
    case ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME:
      return {
        ...state,
        allowLoginWithRememberMe: action.enabled,
      };
    case ActionType.SET_AUTOMATIC_SECURITY_CHECKS:
      return {
        ...state,
        automaticSecurityChecks: action.enabled,
      };
    default:
      return state;
  }
};

export default securityReducer;
