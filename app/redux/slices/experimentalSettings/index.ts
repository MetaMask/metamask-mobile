/* eslint-disable @typescript-eslint/default-param-last */
import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

import {
  ActionType,
  SetSecurityAlertsEnabled,
} from '../../../actions/experimental';

const initialState = {
  securityAlertsEnabled: false,
};

const reducer = (state = initialState, action: SetSecurityAlertsEnabled) => {
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

const experimentalSettingsConfig = {
  key: 'experimentalSettings',
  blacklist: [],
  storage: MigratedStorage,
};

const experimentalSettingsReducer = persistReducer(
  experimentalSettingsConfig,
  reducer,
);

export default experimentalSettingsReducer;
