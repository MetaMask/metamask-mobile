import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const MARKET_INSIGHTS_CARD_ROTATION_INTERVAL_AB_KEY =
  'socialAiTSA495AbtestCardRotationInterval';

export enum MarketInsightsCardRotationIntervalVariant {
  Control = 'control',
  CarouselTimeExtended = 'carouselTimeExtended',
}

export const MARKET_INSIGHTS_CARD_ROTATION_INTERVAL_VARIANTS: Record<
  MarketInsightsCardRotationIntervalVariant,
  { rotateIntervalMs: number }
> = {
  [MarketInsightsCardRotationIntervalVariant.Control]: {
    rotateIntervalMs: 5000,
  },
  [MarketInsightsCardRotationIntervalVariant.CarouselTimeExtended]: {
    rotateIntervalMs: 6000,
  },
};

export const MARKET_INSIGHTS_CARD_ROTATION_INTERVAL_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: MARKET_INSIGHTS_CARD_ROTATION_INTERVAL_AB_KEY,
    validVariants: Object.values(MarketInsightsCardRotationIntervalVariant),
    eventNames: [
      EVENT_NAME.MARKET_INSIGHTS_CARD_SCROLLED_TO_VIEW,
      EVENT_NAME.MARKET_INSIGHTS_OPENED,
      EVENT_NAME.MARKET_INSIGHTS_VIEWED,
      EVENT_NAME.MARKET_INSIGHTS_INTERACTION,
      EVENT_NAME.MARKET_INSIGHTS_CLOSED,
    ],
  };
