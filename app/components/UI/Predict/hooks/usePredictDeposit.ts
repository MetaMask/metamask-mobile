import { useCallback, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import Routes from '../../../../constants/navigation/Routes';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';

interface UsePredictDepositParams {
  providerId?: string;
}

export const usePredictDeposit = ({
  providerId = 'polymarket',
}: UsePredictDepositParams = {}) => {
  const { navigateToConfirmation } = useConfirmNavigation();

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
    try {
      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PREDICT.ROOT,
      });

      Engine.context.PredictController.depositWithConfirmation({
        providerId,
      }).catch((err) => {
        console.error('Failed to initialize deposit:', err);
      });
    } catch (err) {
      console.error('Failed to proceed with deposit:', err);
    }
  }, [navigateToConfirmation, providerId]);

  return {
    deposit,
    loading,
    completed,
    error,
  };
};
