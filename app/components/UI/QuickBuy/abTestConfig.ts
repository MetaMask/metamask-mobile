import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

// --- Quick Buy Entrypoints A/B Test (SWAPS-5094) ---

export const SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY =
  'swapsSWAPS5094AbtestQuickBuyEntrypoints';

export enum QuickBuyEntrypointVariant {
  Control = 'control',
  Treatment1 = 'treatment_1',
  Treatment2 = 'treatment_2',
}

export type QuickBuyFooterLayout =
  | 'lightning_swap_buy'
  | 'swap_buy'
  | 'buy_sell';

export const SWAPS5094_QUICK_BUY_ENTRYPOINTS_VARIANTS: Record<
  QuickBuyEntrypointVariant,
  { footerLayout: QuickBuyFooterLayout }
> = {
  [QuickBuyEntrypointVariant.Control]: { footerLayout: 'lightning_swap_buy' },
  [QuickBuyEntrypointVariant.Treatment1]: { footerLayout: 'swap_buy' },
  [QuickBuyEntrypointVariant.Treatment2]: { footerLayout: 'buy_sell' },
};

export const SWAPS5094_QUICK_BUY_ENTRYPOINTS_EXPOSURE_METADATA = {
  experimentName: 'Quick Buy Entrypoints',
  variationNames: {
    [QuickBuyEntrypointVariant.Control]: 'Lightning, Swap, Buy',
    [QuickBuyEntrypointVariant.Treatment1]: 'Swap, Buy',
    [QuickBuyEntrypointVariant.Treatment2]: 'Sell, Buy',
  },
} as const;

export const SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: SWAPS5094_QUICK_BUY_ENTRYPOINTS_AB_KEY,
    validVariants: Object.values(QuickBuyEntrypointVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.TOKEN_DETAILS_CTA_CLICKED,
      EVENT_NAME.SOCIAL_QUICK_BUY_SHEET_VIEWED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED,
      EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED,
    ],
    // Quick Buy events fire from every host; only Token Details runs this test.
    eventPropertyRequirements: {
      [EVENT_NAME.SOCIAL_QUICK_BUY_SHEET_VIEWED]: { source: 'asset_details' },
      [EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_SUBMITTED]: {
        source: 'asset_details',
      },
      [EVENT_NAME.SOCIAL_QUICK_BUY_TRADE_COMPLETED]: {
        source: 'asset_details',
      },
    },
  };
