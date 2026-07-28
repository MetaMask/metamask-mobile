import { EVENT_NAME } from '../../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../../util/analytics/abTestAnalytics.types';

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
    // Only applies to Token Details / Market Insights flows — not Explore
    excludeWhenPropertiesMatch: {
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

// --- Quick Buy Keyboard vs Slider A/B Test (TSA-905) ---

export const SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY =
  'socialAiTSA905AbtestQuickBuyKeyboard';

export enum SocialAiQuickBuyKeyboardVariant {
  Control = 'control',
  Treatment = 'treatment',
}

/**
 * `useKeyboard` drives the amount-input UI: control keeps the existing
 * percentage slider, treatment swaps it for the numeric keypad.
 */
export const SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS: Record<
  SocialAiQuickBuyKeyboardVariant,
  { useKeyboard: boolean }
> = {
  [SocialAiQuickBuyKeyboardVariant.Control]: { useKeyboard: false },
  [SocialAiQuickBuyKeyboardVariant.Treatment]: { useKeyboard: true },
};

export const SOCIAL_AI_QUICK_BUY_KEYBOARD_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<SocialAiQuickBuyKeyboardVariant, string>>;
} = {
  experimentName: 'Quick Buy Keyboard',
  variationNames: {
    [SocialAiQuickBuyKeyboardVariant.Control]: 'Slider',
    [SocialAiQuickBuyKeyboardVariant.Treatment]: 'Keyboard',
  },
};

export const SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
    validVariants: Object.values(SocialAiQuickBuyKeyboardVariant),
    // Conversion funnel — enriches the same trade events across every surface
    // Quick Buy renders on (no source exclusion).
    eventNames: [
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
    ],
  };
