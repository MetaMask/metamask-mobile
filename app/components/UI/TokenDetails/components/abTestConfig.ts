import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

export const STICKY_FOOTER_SWAP_LABEL_AB_KEY = 'stickyButtonsAbTest';

export enum StickyFooterSwapLabelVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const STICKY_FOOTER_SWAP_LABEL_VARIANTS: Record<
  StickyFooterSwapLabelVariant,
  { swapLabelKey: 'asset_overview.swap' | 'asset_overview.convert' }
> = {
  [StickyFooterSwapLabelVariant.Control]: {
    swapLabelKey: 'asset_overview.swap',
  },
  [StickyFooterSwapLabelVariant.Treatment]: {
    swapLabelKey: 'asset_overview.convert',
  },
};

export const STICKY_FOOTER_SWAP_LABEL_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: STICKY_FOOTER_SWAP_LABEL_AB_KEY,
    validVariants: Object.values(StickyFooterSwapLabelVariant),
    eventNames: [
      EVENT_NAME.TOKEN_DETAILS_OPENED,
      EVENT_NAME.STICKY_BUTTON_TAPPED,
    ],
  };
