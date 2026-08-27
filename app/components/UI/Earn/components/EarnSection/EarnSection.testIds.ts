export const EarnSectionTestIds = {
  ROOT: 'earn-section',
  ERROR: 'earn-section-error',
  ERROR_RETRY_BUTTON: 'earn-section-error-retry-button',
  MONEY_ACCOUNT_CARD: 'earn-section-money-account-card',
  MONEY_ACCOUNT_NEW_TAG: 'earn-section-money-account-new-tag',
  MONEY_ACCOUNT_BALANCE_SKELETON: 'earn-section-money-account-balance-skeleton',
  MONEY_ACCOUNT_APY_SKELETON: 'earn-section-money-account-apy-skeleton',
  ASSET_CARD: (index: number) => `earn-section-asset-${index}-card`,
  ASSET_SKELETON: (index: number) => `earn-section-asset-${index}-skeleton`,
  ASSET_NO_FEE_TAG: (index: number) => `earn-section-asset-${index}-no-fee-tag`,
  ASSET_AVATAR: (index: number) => `earn-section-asset-${index}-avatar`,
} as const;
