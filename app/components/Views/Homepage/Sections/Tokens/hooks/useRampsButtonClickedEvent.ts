import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useRampsButtonClickData } from '../../../../../UI/Ramp/hooks/useRampsButtonClickData';
import useRampsUnifiedV1Enabled from '../../../../../UI/Ramp/hooks/useRampsUnifiedV1Enabled';
import useRampsUnifiedV2Enabled from '../../../../../UI/Ramp/hooks/useRampsUnifiedV2Enabled';
import { getDetectedGeolocation } from '../../../../../../reducers/fiatOrders';

/**
 * Encapsulates the `Ramps Button Clicked` analytics event for the
 * Tokens Section empty state. Feature-flag-dependent properties
 * (ramp_type) are resolved internally so callers only need to invoke
 * the returned callback.
 */
export const useRampsButtonClickedEvent = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const buttonClickData = useRampsButtonClickData();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();
  const region = useSelector(getDetectedGeolocation);

  const trackBuyButtonClicked = useCallback(() => {
    const rampType = isV2UnifiedEnabled
      ? 'UNIFIED_BUY_2'
      : rampUnifiedV1Enabled
        ? 'UNIFIED_BUY'
        : 'BUY';

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          button_text: 'Buy',
          location: 'TokensSection',
          ramp_type: rampType,
          region,
          ramp_routing: buttonClickData.ramp_routing,
          is_authenticated: buttonClickData.is_authenticated,
          preferred_provider: buttonClickData.preferred_provider,
          order_count: buttonClickData.order_count,
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    isV2UnifiedEnabled,
    rampUnifiedV1Enabled,
    region,
    buttonClickData,
  ]);

  return { trackBuyButtonClicked };
};
