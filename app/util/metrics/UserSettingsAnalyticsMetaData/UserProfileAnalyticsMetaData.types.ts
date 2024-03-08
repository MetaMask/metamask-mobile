export enum UserProfileProperty {
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
  [UserProfileProperty.ENABLE_OPENSEA_API]: string;
  [UserProfileProperty.NFT_AUTODETECTION]: string;
  [UserProfileProperty.THEME]: string;
  [UserProfileProperty.TOKEN_DETECTION]: string;
  [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: string;
  [UserProfileProperty.SECURITY_PROVIDERS]: string;
}
