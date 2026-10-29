import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_VARIANTS,
  SocialV1Variant,
} from '../../../../constants/socialV1';

export {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_EXPOSURE_METADATA,
  SOCIAL_V1_VARIANTS,
  SocialV1Variant,
} from '../../../../constants/socialV1';

export const SOCIAL_V1_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping = {
  flagKey: SOCIAL_V1_AB_KEY,
  validVariants: Object.values(SocialV1Variant),
  eventNames: [
    EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
    EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED,
    EVENT_NAME.SOCIAL_TRADER_FEED_SCREEN_VIEWED,
    EVENT_NAME.SOCIAL_TRADER_FEED_INTERACTION,
    EVENT_NAME.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED,
    EVENT_NAME.SOCIAL_FOLLOW_TRADING_INTERACTION,
  ],
};
