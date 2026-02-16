/* eslint-disable @typescript-eslint/default-param-last */
import { ActionType, Action } from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';

export interface SecurityState {
  allowLoginWithRememberMe: boolean;
  dataCollectionForMarketing: boolean | null;
  isNFTAutoDetectionModalViewed: boolean;
  osAuthEnabled: boolean;
}

export const initialState: Readonly<SecuritySettingsState> = {
  allowLoginWithRememberMe: false,
  dataCollectionForMarketing: null,
  isNFTAutoDetectionModalViewed: false,
  osAuthEnabled: true, // Default to enabled (biometric-first)
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
    case ActionType.SET_NFT_AUTO_DETECTION_MODAL_OPEN:
      return {
        ...state,
        isNFTAutoDetectionModalViewed: action.open,
      };
    case ActionType.SET_DATA_COLLECTION_FOR_MARKETING:
      return {
        ...state,
        dataCollectionForMarketing: action.enabled,
      };
    case ActionType.SET_OS_AUTH_ENABLED:
      return {
        ...state,
        osAuthEnabled: action.enabled,
      };
    default:
      return state;
  }
};

export default securityReducer;
