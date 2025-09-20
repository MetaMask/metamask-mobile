/* eslint-disable @typescript-eslint/default-param-last */
import { ActionType, Action } from '../../actions/security';
import { SecuritySettingsState } from '../../actions/security/state';

export interface SecurityState {
  allowLoginWithRememberMe: boolean;
  dataCollectionForMarketing: boolean | null;
  isNFTAutoDetectionModalViewed: boolean;
  shouldShowConsentSheet: boolean;
  dataSharingPreference: boolean | null;
}

export const initialState: Readonly<SecuritySettingsState> = {
  allowLoginWithRememberMe: false,
  dataCollectionForMarketing: null,
  isNFTAutoDetectionModalViewed: false,
  shouldShowConsentSheet: true, // Default: always show consent sheet
  dataSharingPreference: null, // Default: no data sharing preference saved
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
    case ActionType.SET_SHOULD_SHOW_CONSENT_SHEET:
      return {
        ...state,
        shouldShowConsentSheet: action.shouldShow,
      };
    case ActionType.SET_DATA_SHARING_PREFERENCE:
      return {
        ...state,
        dataSharingPreference: action.preference,
      };
    default:
      return state;
  }
};

export default securityReducer;
