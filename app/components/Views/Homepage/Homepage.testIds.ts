/**
 * Homepage "More" section and import actions.
 * String values match `WalletViewSelectorsIDs` for Detox/E2E stability.
 */
export const HomepageMoreSelectorsIDs = {
  HOMEPAGE_MORE_SECTION: 'homepage-more-section',
  HOMEPAGE_MORE_CONTACT_SUPPORT_BUTTON: 'homepage-more-contact-support-button',
  IMPORT_TOKEN_BUTTON: 'import-token-button',
  IMPORT_NFT_BUTTON: 'import-collectible-button',
} as const;

/** E2E selectors for the wallet homepage discovery tabs. */
export const HomepageDiscoveryTabsSelectorsIDs = {
  PORTFOLIO_TAB: 'wallet-discovery-tab-portfolio',
  PERPS_TAB: 'wallet-discovery-tab-perps',
  PREDICTIONS_TAB: 'wallet-discovery-tab-predictions',
} as const;

/** E2E selectors for sections rendered on the wallet homepage. */
export const homepageSectionTitleTestId = (sectionName: string): string =>
  `homepage-section-title-${sectionName}`;
