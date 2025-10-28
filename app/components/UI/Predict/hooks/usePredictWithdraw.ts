import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useCallback, useContext } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { PredictNavigationParamList } from '../types/navigation';
import { usePredictEligibility } from './usePredictEligibility';
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
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { isEligible } = usePredictEligibility({
    providerId,
  });
  const { toastRef } = useContext(ToastContext);

  const selectWithdrawTransaction = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.withdrawTransaction,
  );

  const withdrawTransaction = useSelector(selectWithdrawTransaction);

  const withdraw = useCallback(async () => {
    if (!isEligible) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      return;
    }

    try {
      navigateToConfirmation({
        stack: Routes.PREDICT.ROOT,
        loader: ConfirmationLoader.CustomAmount,
      });

      const response = await prepareWithdraw({ providerId });

      if (!response.success) {
        // Error will be caught and toast shown in catch block
        throw new Error(response.error);
      }

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
    isEligible,
    navigateToConfirmation,
    navigation,
    prepareWithdraw,
    providerId,
    toastRef,
  ]);

  return { withdraw, withdrawTransaction };
};
