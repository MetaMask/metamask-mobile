import { useCallback } from 'react';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

export type StickyFooterButtonAction = 'swap' | 'buy';

interface TrackStickyButtonTappedParams {
  action: StickyFooterButtonAction;
  isPrimary: boolean;
  tokenAddress: string;
  chainId: string;
  balanceUsd: number | undefined;
}

/**
 * Returns a stable callback for tracking "Sticky Button Tapped" events.
 * Intended to be called from TokenDetailsStickyFooter on each button press.
 * A/B test variant is auto-injected as active_ab_tests by the analytics registry.
 */
export function useStickyFooterTracking() {
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    ({
      action,
      isPrimary,
      tokenAddress,
      chainId,
      balanceUsd,
    }: TrackStickyButtonTappedParams) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.STICKY_BUTTON_TAPPED)
          .addProperties({
            action,
            is_primary: isPrimary,
            token_address: tokenAddress,
            chain_id: chainId,
            ...(balanceUsd !== undefined && { balance_usd: balanceUsd }),
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );
}
