import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { resetRewardsState } from '../../../../reducers/rewards';
import { strings } from '../../../../../locales/i18n';
import {
  ToastRef,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { ModalType } from '../components/RewardsBottomSheetModal';
import Routes from '../../../../constants/navigation/Routes';

interface UseOptoutResult {
  optout: () => Promise<void>;
  isLoading: boolean;
  showOptoutBottomSheet: (dismissRoute?: string) => void;
}

export const useOptout = (
  toastRef?: React.RefObject<ToastRef>,
): UseOptoutResult => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const optout = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      Logger.log('useOptout: Starting opt-out process');

      const success = await Engine.controllerMessenger.call(
        'RewardsController:optOut',
      );

      if (success) {
        Logger.log(
          'useOptout: Opt-out successful, resetting state and navigating',
        );

        // Clear rewards Redux state back to initial state
        dispatch(resetRewardsState());

        // Navigate back to rewards view
        navigation.navigate('RewardsView');
      } else {
        Logger.log('useOptout: Opt-out failed - controller returned false');

        // Show error toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Plain,
          labelOptions: [
            {
              label: strings('rewards.optout.modal.error_message'),
              isBold: true,
            },
          ],
          hasNoTimeout: false,
        });
      }
    } catch (error) {
      Logger.log('useOptout: Opt-out failed with exception:', error);

      // Show error toast
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: strings('rewards.optout.error_message'),
            isBold: true,
          },
        ],
        hasNoTimeout: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, dispatch, navigation, toastRef]);

  const showOptoutBottomSheet = useCallback(
    (dismissRoute?: string) => {
      const dismissModal = () => {
        // Navigate to dismissRoute if provided, otherwise default to REWARDS_SETTINGS_VIEW
        navigation.navigate(dismissRoute || Routes.REWARDS_SETTINGS_VIEW);
      };

      navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
        title: strings('rewards.optout.modal.confirmation_title'),
        description: strings('rewards.optout.modal.confirmation_description'),
        type: ModalType.Danger,
        onCancel: dismissModal,
        confirmAction: {
          label: isLoading
            ? strings('rewards.optout.modal.processing')
            : strings('rewards.optout.modal.confirm'),
          onPress: optout,
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
