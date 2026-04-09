export interface SecuritySettingsState {
  allowLoginWithRememberMe: boolean;
  isNFTAutoDetectionModalViewed: boolean;
  // 'null' represents the user not having set his preference over dataCollectionForMarketing yet
  dataCollectionForMarketing: boolean | null;
  // Whether user has enabled OS-level authentication (biometrics or passcode, depending on availability)
  osAuthEnabled: boolean;
}
