export const EarnSectionTestIds = {
  ROOT: 'earn-section',
  MONEY_ACCOUNT_CARD: 'earn-section-money-account-card',
  MONEY_ACCOUNT_NEW_TAG: 'earn-section-money-account-new-tag',
  ASSET_CARD: (index: number) => `earn-section-asset-${index}-card`,
  ASSET_AVATAR: (index: number) => `earn-section-asset-${index}-avatar`,
} as const;
