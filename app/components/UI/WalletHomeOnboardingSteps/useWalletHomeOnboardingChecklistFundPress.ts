import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import { useRampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';
import { walletHomeOnboardingPrimaryLabelForStep } from './walletHomeOnboardingStepsStrings';
import { useWalletHomeOnboardingFundRampIntent } from './useWalletHomeOnboardingFundRampIntent';

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
  const region = useSelector(getDetectedGeolocation);
  const { rampIntent } = useWalletHomeOnboardingFundRampIntent();

  return useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BUTTON_CLICKED)
        .addProperties({
          button_text: walletHomeOnboardingPrimaryLabelForStep('fund'),
          location: ActionLocation.ONBOARDING_CHECKLIST,
          ramp_type: 'UNIFIED_BUY_2',
          region,
          is_authenticated: buttonClickData.is_authenticated,
          preferred_provider: buttonClickData.preferred_provider,
          order_count: buttonClickData.order_count,
        })
        .build(),
    );

    goToBuy(rampIntent);
  }, [
    buttonClickData.is_authenticated,
    buttonClickData.order_count,
    buttonClickData.preferred_provider,
    createEventBuilder,
    goToBuy,
    rampIntent,
    region,
    trackEvent,
  ]);
}
