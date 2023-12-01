export enum UserProfilePropery {
  ENABLE_OPENSEA_API = 'Enable OpenSea API',
  NFT_AUTODETECTION = 'NFT Autodetection',
  THEME = 'Theme',
  ON = 'ON',
  OFF = 'OFF',
  AUTHENTICATION_TYPE = 'Authentication Type',
  TOKEN_DETECTION = 'token_detection_enable',
  MULTI_ACCOUNT_BALANCE = 'Batch account balance requests',
  SECURITY_PROVIDERS = 'security_providers',
}

export interface UserProfileMetaData {
  [UserProfilePropery.ENABLE_OPENSEA_API]: string;
  [UserProfilePropery.NFT_AUTODETECTION]: string;
  [UserProfilePropery.THEME]: string;
  [UserProfilePropery.TOKEN_DETECTION]: string;
  [UserProfilePropery.MULTI_ACCOUNT_BALANCE]: string;
  [UserProfilePropery.SECURITY_PROVIDERS]: string;
}
