export interface SecuritySettingsState {
  allowLoginWithRememberMe: boolean;
  automaticSecurityChecksEnabled: boolean;
  hasUserSelectedAutomaticSecurityCheckOption: boolean;
  isAutomaticSecurityChecksModalOpen: boolean;
  isNFTAutoDetectionModalViewed: boolean;
  // 'null' represents the user not having set his preference over dataCollectionForMarketing yet
  dataCollectionForMarketing: boolean | null;
}
