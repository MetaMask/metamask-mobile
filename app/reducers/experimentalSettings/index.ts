/* eslint-disable @typescript-eslint/default-param-last */

import { PPOMInitialisationStatusType } from '@metamask/ppom-validator';
import {
  ActionType,
  SetSecurityAlertsEnabled,
} from '../../actions/experimental';

const initialState = {
  securityAlertsEnabled: false,
  ppomInitialisationStatus: undefined,
};

const experimentalSettingsReducer = (
  state = initialState,
  action: {
    securityAlertsEnabled: SetSecurityAlertsEnabled;
    ppomInitialisationStatus: PPOMInitialisationStatusType;
    type: string;
  },
) => {
  switch (action.type) {
    case ActionType.SET_SECURITY_ALERTS_ENABLED:
      return {
        ...state,
        securityAlertsEnabled: action.securityAlertsEnabled,
      };
    case ActionType.SET_PPOM_INITIALIZATION_STATUS:
      return {
        ...state,
        ppomInitialisationStatus: action.ppomInitialisationStatus,
      };
    default:
      return state;
  }
};

export default experimentalSettingsReducer;
