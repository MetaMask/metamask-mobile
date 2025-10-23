import { useCallback } from 'react';
import { captureException } from '@sentry/react-native';
import Engine from '../../../../core/Engine';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';

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

        // Capture exception with deposit initialization context
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: {
            component: 'usePredictDeposit',
            action: 'deposit_initialization',
            operation: 'financial_operations',
          },
          extra: {
            depositContext: {
              providerId,
            },
          },
        });
      });
    } catch (err) {
      console.error('Failed to proceed with deposit:', err);

      // Capture exception with deposit navigation context
      captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: {
          component: 'usePredictDeposit',
          action: 'deposit_navigation',
          operation: 'financial_operations',
        },
        extra: {
          depositContext: {
            providerId,
          },
        },
      });
    }
  }, [navigateToConfirmation, providerId]);

  return {
    deposit,
    status: depositTransaction?.status,
  };
};
