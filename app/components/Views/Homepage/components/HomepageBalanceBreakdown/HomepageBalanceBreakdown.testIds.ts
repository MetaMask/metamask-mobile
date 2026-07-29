// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SliceKey } from '../../../BalanceBreakdown/types';

export const HomepageBalanceBreakdownTestIds = {
  CONTAINER: 'homepage-balance-breakdown',
  ROWS: 'homepage-balance-breakdown-rows',
  ALLOCATION_TITLE: 'homepage-balance-breakdown-allocation-title',
  ALLOCATION_BAR: 'homepage-balance-breakdown-allocation-bar',
  ALLOCATION_SEGMENT: (key: SliceKey) =>
    `homepage-balance-breakdown-allocation-segment-${key}`,
  ROW: (key: SliceKey) => `homepage-balance-breakdown-row-${key}`,
  ICON: (key: SliceKey) => `homepage-balance-breakdown-icon-${key}`,
  DOT: (key: SliceKey) => `homepage-balance-breakdown-dot-${key}`,
  PERCENTAGE: (key: SliceKey) => `homepage-balance-breakdown-percentage-${key}`,
  VALUE: (key: SliceKey) => `homepage-balance-breakdown-value-${key}`,
  SKELETON: (key: SliceKey) => `homepage-balance-breakdown-skeleton-${key}`,
  APY: 'homepage-balance-breakdown-money-apy',
  APY_SKELETON: 'homepage-balance-breakdown-money-apy-skeleton',
} as const;
