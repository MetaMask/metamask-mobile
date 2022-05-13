/* eslint-disable @typescript-eslint/default-param-last */
import { ActionType, Action } from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';
import { store } from '../../store';

const { isUsingRememberMe } = store.getState();

const initialState: Readonly<SecuritySettingsState> = {
  allowLoginWithRememberMe: isUsingRememberMe,
};

const securityReducer = (
  state: SecuritySettingsState = initialState,
  action: Action,
): SecuritySettingsState => {
  switch (action.type) {
    case ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME:
      return {
        allowLoginWithRememberMe: action.enabled,
      };
    default:
      return state;
  }
};

export default securityReducer;
