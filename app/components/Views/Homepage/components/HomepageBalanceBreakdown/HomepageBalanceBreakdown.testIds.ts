import type { SliceKey } from '../../BalanceBreakdown/types';

export const HomepageBalanceBreakdownTestIds = {
  CONTAINER: 'homepage-balance-breakdown',
  HERO: 'homepage-balance-breakdown-hero',
  HERO_CONTENT: 'homepage-balance-breakdown-hero-content',
  HERO_DELTA_AMOUNT: 'homepage-balance-breakdown-hero-delta-amount',
  HERO_DELTA_PERCENT: 'homepage-balance-breakdown-hero-delta-percent',
  HERO_PERIOD: 'homepage-balance-breakdown-hero-period',
  ROWS: 'homepage-balance-breakdown-rows',
  ROW: (key: SliceKey) => `homepage-balance-breakdown-row-${key}`,
  PERCENTAGE: (key: SliceKey) => `homepage-balance-breakdown-percentage-${key}`,
  VALUE: (key: SliceKey) => `homepage-balance-breakdown-value-${key}`,
  VALUE_UNDERLINE: (key: SliceKey) =>
    `homepage-balance-breakdown-value-underline-${key}`,
  ERROR_WARNING: (key: SliceKey) =>
    `homepage-balance-breakdown-error-warning-${key}`,
  ERROR_SHEET: (key: SliceKey) =>
    `homepage-balance-breakdown-error-sheet-${key}`,
  ERROR_SHEET_GESTURE_ROOT: (key: SliceKey) =>
    `homepage-balance-breakdown-error-sheet-gesture-root-${key}`,
  ERROR_SHEET_DESCRIPTION: (key: SliceKey) =>
    `homepage-balance-breakdown-error-sheet-description-${key}`,
  MONEY_BUY: 'homepage-balance-breakdown-money-buy',
  SKELETON: (key: SliceKey) => `homepage-balance-breakdown-skeleton-${key}`,
  APY: 'homepage-balance-breakdown-money-apy',
  APY_SKELETON: 'homepage-balance-breakdown-money-apy-skeleton',
} as const;
