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
      EVENT_NAME.SWAP_COMPLETED,
      EVENT_NAME.ONRAMP_PURCHASE_SUBMITTED,
      EVENT_NAME.ONRAMP_PURCHASE_COMPLETED,
    ],
  };

// --- Sticky Footer Swap Label A/B Test ---

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
      EVENT_NAME.TOKEN_DETAILS_CTA_CLICKED,
      // Funnel 1 entry point – fires through useAnalytics().trackEvent (shared wrapper, auto-enriched)
      EVENT_NAME.SWAP_PAGE_VIEWED,
      // Funnel 2 – fire through analytics.trackEvent (shared wrapper, auto-enriched)
      EVENT_NAME.ONRAMP_PURCHASE_SUBMITTED,
      EVENT_NAME.ONRAMP_PURCHASE_COMPLETED,
    ],
  };
