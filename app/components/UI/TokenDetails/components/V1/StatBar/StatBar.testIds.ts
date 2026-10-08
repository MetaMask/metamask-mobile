import type { TokenStatKey } from './StatBar.types';

const underlineWrapper = (key: TokenStatKey) =>
  `token-details-v1-stat-${key}-underlined`;

export const StatBarSelectors = {
  BAR: 'token-details-v1-stat-bar',
  cell: (key: TokenStatKey) => `token-details-v1-stat-${key}`,
  value: (key: TokenStatKey) => `token-details-v1-stat-${key}-value`,
  skeleton: (key: TokenStatKey) => `token-details-v1-stat-${key}-skeleton`,
  label: (key: TokenStatKey) => `token-details-v1-stat-${key}-label`,
  underlineWrapper,
  /** `DottedUnderline` derives the rule's own ID from the wrapper's. */
  underline: (key: TokenStatKey) => `${underlineWrapper(key)}-underline`,
};

export const StatExplainerSheetSelectors = {
  SHEET: 'token-details-v1-stat-explainer',
  TITLE: 'token-details-v1-stat-explainer-title',
  DESCRIPTION: 'token-details-v1-stat-explainer-description',
  GOT_IT_BUTTON: 'token-details-v1-stat-explainer-got-it',
};
