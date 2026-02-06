import { useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { usePredictTrading } from './usePredictTrading';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { strings } from '../../../../../locales/i18n';

interface UsePredictWithdrawParams {
  providerId?: string;
}

export const usePredictWithdraw = ({
  providerId = 'polymarket',
}: UsePredictWithdrawParams = {}) => {
  const { prepareWithdraw } = usePredictTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);

  const selectWithdrawTransaction = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.withdrawTransaction,
  );

  const withdrawTransaction = useSelector(selectWithdrawTransaction);

  const withdraw = useCallback(async () => {
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
      });

      const response = await prepareWithdraw({ providerId });

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
  }, [
    navigateToConfirmation,
    navigation,
    prepareWithdraw,
    providerId,
    toastRef,
  ]);

  return { withdraw, withdrawTransaction };
};
