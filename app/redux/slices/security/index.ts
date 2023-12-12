/* eslint-disable @typescript-eslint/default-param-last */
import { ActionType, Action } from '../../../actions/security';
import { SecuritySettingsState } from '../../../actions/security/state';
import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';
import { PersistPartial } from 'redux-persist/es/persistReducer';

export const initialState: Readonly<SecuritySettingsState> & PersistPartial = {
  allowLoginWithRememberMe: false,
  automaticSecurityChecksEnabled: false,
  hasUserSelectedAutomaticSecurityCheckOption: false,
  isAutomaticSecurityChecksModalOpen: false,
  _persist: {
    version: 0,
    rehydrated: false,
  },
};

const reducer = (
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
        automaticSecurityChecksEnabled: action.enabled,
      };
    case ActionType.USER_SELECTED_AUTOMATIC_SECURITY_CHECKS_OPTION:
      return {
        ...state,
        hasUserSelectedAutomaticSecurityCheckOption: action.selected,
      };
    case ActionType.SET_AUTOMATIC_SECURITY_CHECKS_MODAL_OPEN:
      return {
        ...state,
        isAutomaticSecurityChecksModalOpen: action.open,
      };
    default:
      return state;
  }
};

const securityConfig = {
  key: 'security',
  blacklist: [],
  storage: MigratedStorage,
};

const securityReducer = persistReducer(securityConfig, reducer);

export default securityReducer;
