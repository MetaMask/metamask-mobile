import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

// --- Social Bundle V1 A/B Test (TSA-1122) ---
//
// Splits Follow Trading home between the production two-tab surface (control)
// and the Social Bundle V1 three-tab shell (treatment). Rollout percentages
// live in LaunchDarkly targeting (0% / 10% / 100% variants); the app reads the
// resolved control | treatment value. Versioning is the flag's 8.12.0 key.

export const SOCIAL_BUNDLE_V1_AB_KEY = 'socialAiTSA1122AbtestSocialBundleV1';

export enum SocialBundleV1Variant {
  Control = 'control',
  Treatment = 'treatment',
}

interface SocialBundleV1VariantConfig {
  useSocialBundleV1: boolean;
}

export const SOCIAL_BUNDLE_V1_VARIANTS: Record<
  SocialBundleV1Variant,
  SocialBundleV1VariantConfig
> = {
  [SocialBundleV1Variant.Control]: { useSocialBundleV1: false },
  [SocialBundleV1Variant.Treatment]: { useSocialBundleV1: true },
};

export const SOCIAL_BUNDLE_V1_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<SocialBundleV1Variant, string>>;
} = {
  experimentName: 'Social Bundle V1',
  variationNames: {
    [SocialBundleV1Variant.Control]: 'Legacy Follow Trading home',
    [SocialBundleV1Variant.Treatment]: 'Social Bundle V1',
  },
};

export const SOCIAL_BUNDLE_V1_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: SOCIAL_BUNDLE_V1_AB_KEY,
    validVariants: Object.values(SocialBundleV1Variant),
    eventNames: [
      EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
      EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED,
      EVENT_NAME.SOCIAL_TRADER_FEED_SCREEN_VIEWED,
      EVENT_NAME.SOCIAL_TRADER_FEED_INTERACTION,
      EVENT_NAME.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED,
      EVENT_NAME.SOCIAL_FOLLOW_TRADING_INTERACTION,
    ],
  };
