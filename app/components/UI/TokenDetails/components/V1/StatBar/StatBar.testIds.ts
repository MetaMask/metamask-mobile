import type { TokenStatKey } from './StatBar.types';

const underlineWrapper = (key: TokenStatKey) =>
  `token-details-v1-stat-${key}-underlined`;

export const StatBarSelectors = {
  BAR: 'token-details-v1-stat-bar',
  SCROLL: 'token-details-v1-stat-bar-scroll',
  SCROLL_FADE: 'token-details-v1-stat-bar-scroll-fade',
  cell: (key: TokenStatKey) => `token-details-v1-stat-${key}`,
  value: (key: TokenStatKey) => `token-details-v1-stat-${key}-value`,
  skeleton: (key: TokenStatKey) => `token-details-v1-stat-${key}-skeleton`,
  label: (key: TokenStatKey) => `token-details-v1-stat-${key}-label`,
  underlineWrapper,
  /** `DottedUnderline` derives the rule's own ID from the wrapper's. */
  underline: (key: TokenStatKey) => `${underlineWrapper(key)}-underline`,
};
