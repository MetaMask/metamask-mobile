import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const POST_TRADE_MODAL_AB_KEY = 'swapsSWAPS4543AbtestPostTradeModal';

export enum PostTradeModalVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const POST_TRADE_MODAL_VARIANTS = {
  [PostTradeModalVariant.Control]: { showPostTradeModal: false },
  [PostTradeModalVariant.Treatment]: { showPostTradeModal: true },
} satisfies Record<PostTradeModalVariant, { showPostTradeModal: boolean }>;

export const POST_TRADE_MODAL_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: POST_TRADE_MODAL_AB_KEY,
    validVariants: Object.values(PostTradeModalVariant),
    eventNames: [],
  };
