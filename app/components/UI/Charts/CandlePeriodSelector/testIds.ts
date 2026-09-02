/**
 * Test-ID helpers for the shared CandlePeriodSelector and CandlePeriodBottomSheet.
 *
 * These live alongside the neutral chart controls so consumers (Perps, Social
 * Leaderboard, etc.) don't need to reach into another feature's testIds module.
 */

export const getCandlePeriodSelectorSelectors = {
  group: (baseTestID: string) => `${baseTestID}-group`,
  periodButton: (baseTestID: string, period: string) =>
    `${baseTestID}-period-${period}`,
  moreButton: (baseTestID: string) => `${baseTestID}-more-button`,
};

export const getCandlePeriodBottomSheetSelectors = {
  periodButton: (baseTestID: string, period: string) =>
    `${baseTestID}-period-${period}`,
};

export const CandlePeriodBottomSheetSelectorsIDs = {
  // Value kept stable to avoid churn in existing tests / E2E selectors that
  // rely on the previous Perps-namespaced identifier.
  CLOSE_BUTTON: 'perps-candle-period-bottom-sheet-close',
} as const;
