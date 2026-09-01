export const EarnSectionTestIds = {
  VIEW_MORE_CARD: 'earn-section-view-more-card',
  ASSET_CARD: (index: number) => `earn-section-asset-${index}-card`,
  ASSET_NO_FEE_TAG: (index: number) => `earn-section-asset-${index}-no-fee-tag`,
  MONEY_ACCOUNT_CARD: 'earn-section-money-account-card',
  MONEY_ACCOUNT_BALANCE_SKELETON: 'earn-section-money-account-balance-skeleton',
  MONEY_ACCOUNT_APY_SKELETON: 'earn-section-money-account-apy-skeleton',
  ERROR: 'earn-section-error',
  ERROR_RETRY_BUTTON: 'earn-section-error-retry-button',
} as const;
