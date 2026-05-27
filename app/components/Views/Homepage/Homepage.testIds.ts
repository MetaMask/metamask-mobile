/** E2E selectors for sections rendered on the wallet homepage. */
export const homepageSectionTitleTestId = (sectionName: string): string =>
  `homepage-section-title-${sectionName}`;

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
