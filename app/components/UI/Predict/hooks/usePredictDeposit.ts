import { useCallback, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { usePredictEligibility } from './usePredictEligibility';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { PredictNavigationParamList } from '../types/navigation';

interface UsePredictDepositParams {
  providerId?: string;
  fromPredictView?: boolean;
}

export const usePredictDeposit = ({
  providerId = 'polymarket',
  fromPredictView = false,
}: UsePredictDepositParams = {}) => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { isEligible } = usePredictEligibility({
    providerId,
  });

  const selectDepositTransaction = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.depositTransaction,
  );
  const depositTransaction = useSelector(selectDepositTransaction);

  const completed = useMemo(() => {
    if (!depositTransaction) return false;
    return depositTransaction.status === 'confirmed';
  }, [depositTransaction]);

  const pending = useMemo(() => {
    if (!depositTransaction) return false;
    return depositTransaction.status === 'pending';
  }, [depositTransaction]);

  const loading = useMemo(() => pending, [pending]);

  const error = useMemo(() => {
    if (!depositTransaction) return false;
    return depositTransaction.status === 'error';
  }, [depositTransaction]);

  const deposit = useCallback(async () => {
    if (!isEligible) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.UNAVAILABLE,
      });
      return;
    }

    try {
      navigateToConfirmation({
        stack: fromPredictView ? undefined : Routes.PREDICT.ROOT,
      });

      Engine.context.PredictController.depositWithConfirmation({
        providerId,
      }).catch((err) => {
        console.error('Failed to initialize deposit:', err);
      });
    } catch (err) {
      console.error('Failed to proceed with deposit:', err);
    }
  }, [
    fromPredictView,
    isEligible,
    navigateToConfirmation,
    navigation,
    providerId,
  ]);

  return {
    deposit,
    loading,
    completed,
    error,
  };
};
