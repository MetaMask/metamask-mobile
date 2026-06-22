import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

// --- Explore Search Quick Buy A/B Test (ASSETS-3380) ---

export const EXPLORE_QUICK_BUY_AB_KEY = 'assetsASSETS3380AbtestExploreQuickBuy';

export enum ExploreQuickBuyVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const EXPLORE_QUICK_BUY_VARIANTS: Record<
  ExploreQuickBuyVariant,
  { showQuickTradeButton: boolean }
> = {
  [ExploreQuickBuyVariant.Control]: { showQuickTradeButton: false },
  [ExploreQuickBuyVariant.Treatment]: { showQuickTradeButton: true },
};

/**
 * Shared exposure metadata so both surfaces (ExploreSearchResults and
 * FullFeedList) emit identical `Experiment Viewed` properties.
 */
export const EXPLORE_QUICK_BUY_EXPOSURE_METADATA = {
  experimentName: 'Explore Search Quick Buy Button',
  variationNames: {
    [ExploreQuickBuyVariant.Control]: 'No quick buy button on token rows',
    [ExploreQuickBuyVariant.Treatment]: 'Flash quick buy button on token rows',
  },
};

/**
 * Auto-enriches Quick Buy business events with the active A/B variant so the
 * data team can slice trade metrics by experiment arm.
 */
export const EXPLORE_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: EXPLORE_QUICK_BUY_AB_KEY,
    validVariants: Object.values(ExploreQuickBuyVariant),
    eventNames: [
      EVENT_NAME.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      EVENT_NAME.SOCIAL_QUICK_BUY_AMOUNT_SELECTED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
      EVENT_NAME.SOCIAL_QUICK_BUY_DISMISSED,
    ],
    // This A/B test applies to all Explore surfaces
    injectWhenPropertiesMatch: {
      source: [
        'explore_search',
        'explore_crypto',
        'explore_now',
        'explore_rwas',
        'explore_trending',
        'explore_stocks',
      ] as const,
    },
  };
