import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const POST_TRADE_MODAL_AB_KEY =
  'swapsSWAPS4543AbtestPostTradeModal';

export enum PostTradeModalVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface PostTradeModalVariantConfig {
  showPostTradeModal: boolean;
}

export const POST_TRADE_MODAL_VARIANTS: Record<
  PostTradeModalVariant,
  PostTradeModalVariantConfig
> = {
  [PostTradeModalVariant.Control]: {
    showPostTradeModal: false,
  },
  [PostTradeModalVariant.Treatment]: {
    showPostTradeModal: true,
  },
};

export const POST_TRADE_MODAL_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: POST_TRADE_MODAL_AB_KEY,
    validVariants: Object.values(PostTradeModalVariant),
    eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED],
  };
