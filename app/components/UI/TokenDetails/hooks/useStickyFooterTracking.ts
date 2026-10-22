import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getUsdAmountRange } from '../../../../util/analytics/usdAmountRange';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import type { TdpVersion } from '../analytics/getTdpAnalyticsBase';

export type StickyFooterButtonAction =
  | 'swap'
  | 'buy'
  | 'quick_buy'
  | 'quick_sell'
  | 'money_deposit';

interface TrackStickyBottomCtaClickedParams {
  ctaType: StickyFooterButtonAction;
  balanceFiatUsd: number | undefined;
  tokenAddress: string;
  chainId: string;
  indicatorsActive?: string[];
  tdp_version?: TdpVersion;
}

/**
 * Returns a stable callback for tracking "Token Details CTA Clicked" events.
 * Intended to be called from TokenDetailsStickyFooter on each button press.
 * A/B test variant is auto-injected as active_ab_tests by the analytics registry.
 */
export function useStickyFooterTracking() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const isTechnicalIndicatorsEnabled = useSelector(
    selectTokenDetailsTechnicalIndicatorsEnabled,
  );

  return useCallback(
    ({
      ctaType,
      balanceFiatUsd,
      tokenAddress,
      chainId,
      indicatorsActive,
      tdp_version,
    }: TrackStickyBottomCtaClickedParams) => {
      const properties: Record<string, unknown> = {
        cta_type: ctaType,
        usd_amount_range: getUsdAmountRange(balanceFiatUsd),
        token_address: tokenAddress,
        chain_id: chainId,
      };

      if (tdp_version) {
        properties.tdp_version = tdp_version;
      }

      // Only add indicators_active when feature flag is enabled
      if (isTechnicalIndicatorsEnabled) {
        properties.indicators_active = indicatorsActive ?? [];
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_CTA_CLICKED)
          .addProperties(properties)
          .build(),
      );
    },
    [createEventBuilder, trackEvent, isTechnicalIndicatorsEnabled],
  );
}
