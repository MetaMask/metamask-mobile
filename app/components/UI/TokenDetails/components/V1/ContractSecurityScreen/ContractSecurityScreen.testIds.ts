import type { SecurityCheckKey } from '../SecurityTab/SecurityTab.types';

export const ContractSecuritySelectors = {
  SCREEN: 'token-details-v1-contract-security-screen',
  BACK_BUTTON: 'token-details-v1-contract-security-back-button',
  TITLE: 'token-details-v1-contract-security-title',
  SECTION_CONTRACT: 'token-details-v1-contract-security-contract-checks',
  SECTION_ADDITIONAL: 'token-details-v1-contract-security-additional-checks',
  SCAN_META: 'token-details-v1-contract-security-scan-meta',
  /**
   * Rule between two rows. Shared rather than keyed per check, so a test can
   * count the gaps in a group — which is what proves the rule sits between
   * rows rather than after each one.
   *
   * Deliberately not named `-row-divider`: the row selectors are matched by a
   * `-row-<key>` pattern, which a divider must not answer to.
   */
  DIVIDER: 'token-details-v1-contract-security-divider',

  /** Wrapper for a row, keyed so a test can target one row by name. */
  row: (key: SecurityCheckKey) =>
    `token-details-v1-contract-security-row-${key}`,
  rowLabel: (key: SecurityCheckKey) =>
    `token-details-v1-contract-security-row-${key}-label`,
  /** The row's value, so a test can assert the dash without matching on text. */
  rowValue: (key: SecurityCheckKey) =>
    `token-details-v1-contract-security-row-${key}-value`,
  /** Pass / fail glyph. */
  rowIcon: (key: SecurityCheckKey) =>
    `token-details-v1-contract-security-row-${key}-icon`,
  /** The definition printed under the row. */
  rowDescription: (key: SecurityCheckKey) =>
    `token-details-v1-contract-security-row-${key}-description`,
};
