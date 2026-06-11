import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

// --- Ambient Price Color A/B Test ---

// TODO: Update hardcoded color once we get confirmation from design leads.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const AMBIENT_NEGATIVE_COLOR = '#FF5C16';

export const AMBIENT_PRICE_COLOR_AB_KEY =
  'assetsASSETS3205AbtestAmbientPriceColor';

export enum AmbientPriceColorVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const AMBIENT_PRICE_COLOR_VARIANTS: Record<
  AmbientPriceColorVariant,
  { useAmbientPriceColor: boolean }
> = {
  [AmbientPriceColorVariant.Control]: { useAmbientPriceColor: false },
  [AmbientPriceColorVariant.Treatment]: { useAmbientPriceColor: true },
};

export const AMBIENT_PRICE_COLOR_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: AMBIENT_PRICE_COLOR_AB_KEY,
    validVariants: Object.values(AmbientPriceColorVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.TOKEN_DETAILS_CTA_CLICKED,
      EVENT_NAME.SWAP_PAGE_VIEWED,
      EVENT_NAME.ONRAMP_PURCHASE_SUBMITTED,
      EVENT_NAME.ONRAMP_PURCHASE_COMPLETED,
    ],
  };

// --- Asset Details Quick Buy A/B Test (TSA-612) ---

export const SOCIAL_AI_QUICK_BUY_AB_KEY = 'socialAiTSA612AbtestQuickBuy';

export enum SocialAiQuickBuyVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const SOCIAL_AI_QUICK_BUY_VARIANTS: Record<
  SocialAiQuickBuyVariant,
  { showQuickBuy: boolean }
> = {
  [SocialAiQuickBuyVariant.Control]: { showQuickBuy: false },
  [SocialAiQuickBuyVariant.Treatment]: { showQuickBuy: true },
};

/**
 * Shared exposure metadata so both surfaces (Token Details and Market Insights)
 * emit identical `Experiment Viewed` properties for this experiment.
 */
export const SOCIAL_AI_QUICK_BUY_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<SocialAiQuickBuyVariant, string>>;
} = {
  experimentName: 'Asset Details Quick Buy',
  variationNames: {
    [SocialAiQuickBuyVariant.Control]: 'Quick Buy hidden',
    [SocialAiQuickBuyVariant.Treatment]: 'Quick Buy shown',
  },
};

export const SOCIAL_AI_QUICK_BUY_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: SOCIAL_AI_QUICK_BUY_AB_KEY,
    validVariants: Object.values(SocialAiQuickBuyVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.MARKET_INSIGHTS_VIEWED,
      EVENT_NAME.MARKET_INSIGHTS_INTERACTION,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
    ],
  };
