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

interface UseOptoutResult {
  optout: () => Promise<boolean>;
  isLoading: boolean;
  showOptoutBottomSheet: (dismissRoute?: string) => void;
}

export const useOptout = (): UseOptoutResult => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const optout = useCallback(async (): Promise<boolean> => {
    if (isLoading || !subscriptionId) return false;

    setIsLoading(true);

    try {
      Logger.log('useOptout: Starting opt-out process');

      const success = await Engine.controllerMessenger.call(
        'RewardsController:optOut',
        subscriptionId,
      );

      if (success) {
        Logger.log('useOptout: Opt-out successful, resetting state');

        // Clear rewards Redux state back to initial state
        dispatch(resetRewardsState());
        return true;
      }
      Logger.log('useOptout: Opt-out failed - controller returned false');

      // Show error toast
      showToast(
        RewardsToastOptions.error(
          strings('rewards.optout.modal.error_message'),
        ),
      );
      return false;
    } catch (error) {
      Logger.log('useOptout: Opt-out failed with exception:', error);

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
  }, [isLoading, subscriptionId, dispatch, showToast, RewardsToastOptions]);

  const showOptoutBottomSheet = useCallback(
    (dismissRoute?: string) => {
      const handleOptoutSuccess = () => {
        // Navigate to rewards view on successful opt-out
        navigation.navigate('RewardsView');
      };

      const handleOptoutCancel = () => {
        // Navigate to dismissRoute if provided, otherwise default to REWARDS_SETTINGS_VIEW
        navigation.navigate(dismissRoute || Routes.REWARDS_SETTINGS_VIEW);
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
          onPress: handleOptoutConfirm,
          variant: ButtonVariant.Primary,
          disabled: isLoading,
        },
      });
    },
    [navigation, isLoading, optout],
  );

  return {
    optout,
    isLoading,
    showOptoutBottomSheet,
  };
};
