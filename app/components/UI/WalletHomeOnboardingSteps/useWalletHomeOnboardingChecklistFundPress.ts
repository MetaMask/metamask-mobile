import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import useRampsUnifiedV1Enabled from '../Ramp/hooks/useRampsUnifiedV1Enabled';
import useRampsUnifiedV2Enabled from '../Ramp/hooks/useRampsUnifiedV2Enabled';
import { useRampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';
import { walletHomeOnboardingPrimaryLabelForStep } from './walletHomeOnboardingStepsStrings';

type GoToBuyFromRampNavigation = ReturnType<
  typeof import('../Ramp/hooks/useRampNavigation').useRampNavigation
>['goToBuy'];

/**
 * Wraps `goToBuy` with {@link MetaMetricsEvents.RAMPS_BUTTON_CLICKED} for the wallet
 * home onboarding fund step (TMCU-680: `location` = onboarding_checklist).
 */
export function useWalletHomeOnboardingChecklistFundPress(
  goToBuy: GoToBuyFromRampNavigation,
): () => void {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const buttonClickData = useRampsButtonClickData();
  const rampUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();
  const region = useSelector(getDetectedGeolocation);

  return useCallback(() => {
    const rampType = isV2UnifiedEnabled
      ? 'UNIFIED_BUY_2'
      : rampUnifiedV1Enabled
        ? 'UNIFIED_BUY'
        : 'BUY';

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          button_text: walletHomeOnboardingPrimaryLabelForStep('fund'),
          location: ActionLocation.ONBOARDING_CHECKLIST,
          ramp_type: rampType,
          region,
          ramp_routing: buttonClickData.ramp_routing,
          is_authenticated: buttonClickData.is_authenticated,
          preferred_provider: buttonClickData.preferred_provider,
          order_count: buttonClickData.order_count,
        })
        .build(),
    );

    goToBuy();
  }, [
    buttonClickData.is_authenticated,
    buttonClickData.order_count,
    buttonClickData.preferred_provider,
    buttonClickData.ramp_routing,
    createEventBuilder,
    goToBuy,
    isV2UnifiedEnabled,
    rampUnifiedV1Enabled,
    region,
    trackEvent,
  ]);
}
