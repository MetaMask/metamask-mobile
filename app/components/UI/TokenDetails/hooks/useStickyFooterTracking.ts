import { useCallback } from 'react';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

export type StickyFooterButtonAction = 'swap' | 'buy';

interface TrackStickyBottomCtaClickedParams {
  ctaType: StickyFooterButtonAction;
  isPrimary: boolean;
  tokenAddress: string;
  chainId: string;
}

/**
 * Returns a stable callback for tracking "Token Details Sticky Bottom CTA Clicked" events.
 * Intended to be called from TokenDetailsStickyFooter on each button press.
 * A/B test variant is auto-injected as active_ab_tests by the analytics registry.
 */
export function useStickyFooterTracking() {
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    ({
      ctaType,
      isPrimary,
      tokenAddress,
      chainId,
    }: TrackStickyBottomCtaClickedParams) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.TOKEN_DETAILS_STICKY_BOTTOM_CTA_CLICKED,
        )
          .addProperties({
            cta_type: ctaType,
            is_primary: isPrimary,
            token_address: tokenAddress,
            chain_id: chainId,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );
}
