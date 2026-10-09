import type { SecurityRowKey } from './SecurityTab.types';

export const SecurityTabSelectors = {
  TAB: 'token-details-v1-security-tab',
  SECTION_CHECKS: 'token-details-v1-security-tab-checks',
  SECTION_HOLDERS: 'token-details-v1-security-tab-holders',
  SECTION_LIQUIDITY: 'token-details-v1-security-tab-liquidity',
  SECTION_TRADING: 'token-details-v1-security-tab-trading',
  SECTION_ORIGIN: 'token-details-v1-security-tab-origin',
  /** Tappable Contract heading that opens the Contract security screen. */
  CONTRACT_DETAILS_LINK: 'token-details-v1-security-tab-contract-details-link',
  /** Rule between two sections. One per gap, so these are countable. */
  SECTION_DIVIDER: 'token-details-v1-security-tab-section-divider',
  HIGH_RISK_FLAG: 'token-details-v1-security-tab-high-risk-flag',
  DISTRIBUTION_BAR: 'token-details-v1-security-tab-distribution-bar',
  DISTRIBUTION_BAR_FILL: 'token-details-v1-security-tab-distribution-bar-fill',
  LEGEND_TOP_TEN: 'token-details-v1-security-tab-legend-top-ten',
  LEGEND_REMAINING: 'token-details-v1-security-tab-legend-remaining',
  SCAN_META: 'token-details-v1-security-tab-scan-meta',
  DISCLAIMER: 'token-details-v1-security-tab-disclaimer',

  /** Wrapper for a row, keyed so a test can target one row by name. */
  row: (key: SecurityRowKey) => `token-details-v1-security-tab-row-${key}`,
  /** Tappable label that opens the row's explainer. */
  rowLabel: (key: SecurityRowKey) =>
    `token-details-v1-security-tab-row-${key}-label`,
  /** The row's value, so a test can assert the dash without matching on text. */
  rowValue: (key: SecurityRowKey) =>
    `token-details-v1-security-tab-row-${key}-value`,
  /** Pass / fail glyph on a contract check row. */
  rowIcon: (key: SecurityRowKey) =>
    `token-details-v1-security-tab-row-${key}-icon`,
};
