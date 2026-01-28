import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { resetRewardsState } from '../../../../reducers/rewards';
import { strings } from '../../../../../locales/i18n';
import { ModalType } from '../components/RewardsBottomSheetModal';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import useRewardsToast from './useRewardsToast';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { useRewardDashboardModals } from './useRewardDashboardModals';
import { RewardsMetricsButtons } from '../utils';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import type { RootParamList } from '../../../../util/navigation/types';

interface UseOptoutResult {
  optout: () => Promise<boolean>;
  isLoading: boolean;
  showOptoutBottomSheet: (dismissRoute?: keyof RootParamList) => void;
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
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();

  const optout = useCallback(async (): Promise<boolean> => {
    if (isLoading || !subscriptionId) return false;

    setIsLoading(true);

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
        addTraitsToUser(traits);
        Logger.log('useOptout: Opt-out successful, resetting state');

        // Clear rewards Redux state back to initial state
        dispatch(resetRewardsState());
        resetAllSessionTrackingForRewardsDashboardModals();
        return true;
      }
      Logger.log('useOptout: Opt-out failed - controller returned false');
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_OPT_OUT_FAILED).build(),
      );

      // Show error toast
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

      // Show error toast
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
    addTraitsToUser,
    showToast,
    RewardsToastOptions,
    dispatch,
    resetAllSessionTrackingForRewardsDashboardModals,
  ]);

  const showOptoutBottomSheet = useCallback(
    (dismissRoute?: keyof RootParamList) => {
      const handleOptoutSuccess = () => {
        navigation.navigate(Routes.WALLET_VIEW);
      };

      const handleOptoutCancel = () => {
        // Navigate to dismissRoute if provided, otherwise default to REWARDS_SETTINGS_VIEW
        const route = dismissRoute ?? Routes.REWARDS_SETTINGS_VIEW;
        (navigation.navigate as (screen: keyof RootParamList) => void)(route);
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
            .addProperties({
              button_type: RewardsMetricsButtons.OPT_OUT_CANCEL,
            })
            .build(),
        );
      };

      const handleOptoutConfirm = async () => {
        const success = await optout();
        // Only navigate on successful opt-out (when state is reset)
        if (success) {
          handleOptoutSuccess();
        }
        // If failed, keep modal open to show error toast
      };

      navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
        title: strings('rewards.optout.modal.confirmation_title'),
        description: strings('rewards.optout.modal.confirmation_description'),
        type: ModalType.Danger,
        onCancel: handleOptoutCancel,
        confirmAction: {
          label: isLoading
            ? strings('rewards.optout.modal.processing')
            : strings('rewards.optout.modal.confirm'),
          loadOnPress: true,
          onPress: handleOptoutConfirm,
          variant: ButtonVariant.Primary,
          disabled: isLoading,
        },
      });
    },
    [navigation, isLoading, optout, trackEvent, createEventBuilder],
  );

  return {
    optout,
    isLoading,
    showOptoutBottomSheet,
  };
};
