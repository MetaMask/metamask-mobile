export interface SecuritySettingsState {
  allowLoginWithRememberMe: boolean;
  isNFTAutoDetectionModalViewed: boolean;
  // 'null' represents the user not having set his preference over dataCollectionForMarketing yet
  dataCollectionForMarketing: boolean | null;
  // Whether user has enabled OS-level authentication (biometrics or passcode, depending on availability)
  osAuthEnabled: boolean;
  // true = always show the support consent sheet, false = use the saved dataSharingPreference
  shouldShowConsentSheet: boolean;
  // 'null' represents the user not having saved a support data sharing preference yet
  dataSharingPreference: boolean | null;
}
