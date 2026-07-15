import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useRampsButtonClickData } from '../../../../../UI/Ramp/hooks/useRampsButtonClickData';
import { getDetectedGeolocation } from '../../../../../../reducers/fiatOrders';

/**
 * Encapsulates the `Ramps Button Clicked` analytics event for the
 * Tokens Section empty state.
 */
export const useRampsButtonClickedEvent = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const buttonClickData = useRampsButtonClickData();
  const region = useSelector(getDetectedGeolocation);

  const trackBuyButtonClicked = useCallback(
    (assetSymbol?: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
          .addProperties({
            button_text: 'Buy',
            location: 'TokensSection',
            ramp_type: 'UNIFIED_BUY_2',
            region,
            is_authenticated: buttonClickData.is_authenticated,
            preferred_provider: buttonClickData.preferred_provider,
            order_count: buttonClickData.order_count,
            asset_symbol: assetSymbol,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder, region, buttonClickData],
  );

  return { trackBuyButtonClicked };
};
