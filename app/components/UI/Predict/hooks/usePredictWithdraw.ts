import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { PredictNavigationParamList } from '../types/navigation';
import { usePredictEligibility } from './usePredictEligibility';
import { usePredictTrading } from './usePredictTrading';
import { createSelector } from 'reselect';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';

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
      return response;
    } catch (err) {
      console.error('Failed to proceed with withdraw:', err);
    }
  }, [
    isEligible,
    navigateToConfirmation,
    navigation,
    prepareWithdraw,
    providerId,
  ]);

  return { withdraw, withdrawTransaction };
};
