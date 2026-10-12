export const SocialTraderIdentityRowSelectorsIDs = {
  CONTAINER: 'social-trader-identity-row',
  AVATAR: 'social-trader-identity-avatar',
  HANDLE: 'social-trader-identity-handle',
  VERIFIED_BADGE: 'social-trader-identity-verified',
  COHORT: 'social-trader-identity-cohort',
  TIMESTAMP: 'social-trader-identity-timestamp',
  TRADER_STAT: 'social-trader-identity-trader-stat',
  MORE: 'social-trader-identity-more',
} as const;

export interface SocialTraderIdentityRowTestIds {
  container?: string;
  avatar?: string;
  handle?: string;
  verifiedBadge?: string;
  cohort?: string;
  timestamp?: string;
  traderStat?: string;
  more?: string;
  identityPress?: string;
}
