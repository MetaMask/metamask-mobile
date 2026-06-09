import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { resetRewardsState } from '../../../../reducers/rewards';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import useRewardsToast from './useRewardsToast';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useRewardDashboardModals } from './useRewardDashboardModals';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { useBulkLinkState } from './useBulkLinkState';

interface UseOptoutResult {
  optout: () => Promise<boolean>;
  isLoading: boolean;
}

export const useOptout = (): UseOptoutResult => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const {
    resetAllSessionTracking: resetAllSessionTrackingForRewardsDashboardModals,
  } = useRewardDashboardModals();

  const { showToast, RewardsToastOptions } = useRewardsToast();
  const { trackEvent, createEventBuilder, identify } = useAnalytics();
  const { cancelBulkLink } = useBulkLinkState();

  const optout = useCallback(async (): Promise<boolean> => {
    if (isLoading || !subscriptionId) return false;

    setIsLoading(true);

    // Cancel any running bulk link operation to prevent errors during opt-out
    cancelBulkLink();

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_OPT_OUT_STARTED).build(),
    );

    try {
      Logger.log('useOptout: Starting opt-out process');

      const success = await Engine.controllerMessenger.call(
        'RewardsController:optOut',
        subscriptionId,
      );

      if (success) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.REWARDS_OPT_OUT_COMPLETED,
          ).build(),
        );
        const traits = {
          [UserProfileProperty.HAS_REWARDS_OPTED_IN]: UserProfileProperty.OFF,
        };
        identify(traits);
        Logger.log('useOptout: Opt-out successful, resetting state');

        // Clear rewards Redux state back to initial state
        dispatch(resetRewardsState());
        resetAllSessionTrackingForRewardsDashboardModals();

        // Navigate to home screen then show "Request received" banner
        navigation.navigate(Routes.WALLET_VIEW);
        showToast(
          RewardsToastOptions.warning(
            strings('rewards.optout.request_received.title'),
            strings('rewards.optout.request_received.description'),
          ),
        );

        return true;
      }
      Logger.log('useOptout: Opt-out failed - controller returned false');
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_OPT_OUT_FAILED).build(),
      );

      showToast(
        RewardsToastOptions.error(
          strings('rewards.optout.modal.error_message'),
        ),
      );
      return false;
    } catch (error) {
      Logger.log('useOptout: Opt-out failed with exception:', error);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_OPT_OUT_FAILED).build(),
      );

      showToast(
        RewardsToastOptions.error(
          strings('rewards.optout.modal.error_message'),
        ),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    subscriptionId,
    trackEvent,
    createEventBuilder,
    identify,
    showToast,
    RewardsToastOptions,
    dispatch,
    resetAllSessionTrackingForRewardsDashboardModals,
    cancelBulkLink,
    navigation,
  ]);

  return {
    optout,
    isLoading,
  };
};
