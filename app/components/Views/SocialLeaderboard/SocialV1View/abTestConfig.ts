import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

// --- Social V1 A/B Test (TSA-1122) ---
//
// Splits Follow Trading home between the production two-tab surface (control)
// and the Social V1 three-tab shell (treatment). Rollout percentages
// live in LaunchDarkly targeting (0% / 10% / 100% variants); the app reads the
// resolved control | treatment value. Versioning is the flag's 8.12.0 key.

export const SOCIAL_V1_AB_KEY = 'socialAiTSA1122AbtestSocialBundleV1';

export enum SocialV1Variant {
  Control = 'control',
  Treatment = 'treatment',
}

interface SocialV1VariantConfig {
  useSocialV1: boolean;
}

export const SOCIAL_V1_VARIANTS: Record<
  SocialV1Variant,
  SocialV1VariantConfig
> = {
  [SocialV1Variant.Control]: { useSocialV1: false },
  [SocialV1Variant.Treatment]: { useSocialV1: true },
};

export const SOCIAL_V1_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<SocialV1Variant, string>>;
} = {
  experimentName: 'Social V1',
  variationNames: {
    [SocialV1Variant.Control]: 'Legacy Follow Trading home',
    [SocialV1Variant.Treatment]: 'Social V1',
  },
};

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
