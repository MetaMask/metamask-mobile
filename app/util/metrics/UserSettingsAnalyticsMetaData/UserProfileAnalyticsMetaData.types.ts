import { CaipChainId } from '@metamask/utils';

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
  PRIMARY_CURRENCY = 'primary_currency',
  CURRENT_CURRENCY = 'current_currency',
  HAS_MARKETING_CONSENT = 'has_marketing_consent',
  NUMBER_OF_HD_ENTROPIES = 'number_of_hd_entropies',
  CHAIN_IDS = 'chain_id_list',
  IS_REWARDS_OPTED_IN = 'is_rewards_opted_in',
  REWARDS_LINKED_ACCOUNTS_COUNT = 'rewards_linked_accounts_count',
  REWARDS_REFERRED_USERS_COUNT = 'rewards_referred_users_count',
  REWARDS_TOTAL_POINTS = 'rewards_total_points',
  REWARDS_LEVEL = 'rewards_level',
  REWARDS_IDS_CLAIMED = 'rewards_ids_claimed',
}

export interface UserProfileMetaData {
  [UserProfileProperty.ENABLE_OPENSEA_API]: string;
  [UserProfileProperty.NFT_AUTODETECTION]: string;
  //Appearance.getColorScheme() can return null or undefined
  [UserProfileProperty.THEME]: string | null | undefined;
  [UserProfileProperty.TOKEN_DETECTION]: string;
  [UserProfileProperty.MULTI_ACCOUNT_BALANCE]: string;
  [UserProfileProperty.SECURITY_PROVIDERS]: string;
  [UserProfileProperty.PRIMARY_CURRENCY]?: string;
  [UserProfileProperty.CURRENT_CURRENCY]?: string;
  [UserProfileProperty.HAS_MARKETING_CONSENT]: string;
  [UserProfileProperty.NUMBER_OF_HD_ENTROPIES]?: number;
  [UserProfileProperty.CHAIN_IDS]: CaipChainId[];
  [UserProfileProperty.IS_REWARDS_OPTED_IN]?: string;
  [UserProfileProperty.REWARDS_LINKED_ACCOUNTS_COUNT]?: number;
  [UserProfileProperty.REWARDS_REFERRED_USERS_COUNT]?: number;
  [UserProfileProperty.REWARDS_TOTAL_POINTS]?: number;
  [UserProfileProperty.REWARDS_LEVEL]?: number;
  [UserProfileProperty.REWARDS_IDS_CLAIMED]?: string[];
}
