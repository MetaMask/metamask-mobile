import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

// --- Top Traders Buy Action A/B Test (TSA-901) ---
//
// Controls what the spot Buy / Trade button does on the trader position screen
// and the trader feed:
// - control: opens the QuickBuy sheet (current behavior)
// - treatment: opens the main swaps view directly with the trader's token
//   pre-filled as the buy destination
//
// Perps positions are unaffected — they use a separate Trade button and never
// resolve this experiment (exposure is scoped to the spot Buy sub-tree on the
// token screen, and to feeds that contain at least one spot row).

export const TOP_TRADERS_BUY_ACTION_AB_KEY =
  'socialAiTSA901AbtestTopTradersBuyAction';

export enum TopTradersBuyActionVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const TOP_TRADERS_BUY_ACTION_VARIANTS: Record<
  TopTradersBuyActionVariant,
  { openSwaps: boolean }
> = {
  [TopTradersBuyActionVariant.Control]: { openSwaps: false },
  [TopTradersBuyActionVariant.Treatment]: { openSwaps: true },
};

export const TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<TopTradersBuyActionVariant, string>>;
} = {
  experimentName: 'Top Traders Buy Action',
  variationNames: {
    [TopTradersBuyActionVariant.Control]: 'Buy opens Quick Buy',
    [TopTradersBuyActionVariant.Treatment]: 'Buy opens Swaps',
  },
};

export const TOP_TRADERS_BUY_ACTION_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: TOP_TRADERS_BUY_ACTION_AB_KEY,
    validVariants: Object.values(TopTradersBuyActionVariant),
    eventNames: [
      EVENT_NAME.SOCIAL_FOLLOW_TRADING_TOKEN_SCREEN_VIEWED,
      EVENT_NAME.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
      EVENT_NAME.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED,
    ],
  };
