export interface SecuritySettingsState {
  allowLoginWithRememberMe: boolean;
  isNFTAutoDetectionModalViewed: boolean;
  // 'null' represents the user not having set his preference over dataCollectionForMarketing yet
  dataCollectionForMarketing: boolean | null;
  // Support consent preferences
  // shouldShowConsentSheet: true = always show consent sheet, false = use saved preference
  shouldShowConsentSheet: boolean;
  // dataSharingPreference: true = share data, false = don't share data (only used when shouldShowConsentSheet is false)
  dataSharingPreference: boolean | null;
}
