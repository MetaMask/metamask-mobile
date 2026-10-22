export const SocialTraderIdentityRowSelectorsIDs = {
  CONTAINER: 'social-trader-identity-row',
  AVATAR: 'social-trader-identity-avatar',
  HANDLE: 'social-trader-identity-handle',
  VERIFIED_BADGE: 'social-trader-identity-verified',
  TIMESTAMP: 'social-trader-identity-timestamp',
  MOCK_MARKER: 'social-trader-identity-mock-marker',
  TRADER_STAT: 'social-trader-identity-trader-stat',
  MORE: 'social-trader-identity-more',
} as const;

export interface SocialTraderIdentityRowTestIds {
  container?: string;
  avatar?: string;
  handle?: string;
  verifiedBadge?: string;
  timestamp?: string;
  mockMarker?: string;
  traderStat?: string;
  more?: string;
  identityPress?: string;
}
