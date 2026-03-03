import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';
import { selectPredictWithdrawTransaction } from '../selectors/predictController';

export const usePredictWithdraw = () => {
  const { prepareWithdraw } = usePredictTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);

  const withdrawTransaction = useSelector(selectPredictWithdrawTransaction);

  const withdraw = useCallback(async () => {
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
      });

      const response = await prepareWithdraw({});

      return response;
    } catch (err) {
      navigation.goBack();
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to prepare withdraw';

      // Show error toast to user
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        labelOptions: [
          {
            label: strings('predict.withdraw.error_title'),
            isBold: true,
          },
          { label: '\n', isBold: false },
          { label: errorMessage, isBold: false },
        ],
        hasNoTimeout: false,
      });

      console.error('Failed to proceed with withdraw:', err);
    }
  }, [navigateToConfirmation, navigation, prepareWithdraw, toastRef]);

  return { withdraw, withdrawTransaction };
};
