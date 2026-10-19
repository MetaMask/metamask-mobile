import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import Routes from '../../../../constants/navigation/Routes';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';
import {
  ensureError,
  showDepositErrorToast,
} from '../utils/predictErrorHandler';
import { usePredictTrading } from './usePredictTrading';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { PlaceOrderParams } from '../types';
import { RootState } from '../../../../reducers';

interface PredictDepositParams {
  amountUsd?: number;
  analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  /**
   * Set by callers that already sit inside the Predict modal stack, where the
   * confirmation is presented as a sheet rather than filling the window.
   */
  sheetPresentation?: boolean;
}

export const usePredictDeposit = () => {
  const { navigateToConfirmation } = useConfirmNavigation();
  const navigation = useNavigation<AppNavigationProp>();

  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '';

  const { deposit: depositWithConfirmation } = usePredictTrading();

  const depositBatchId = useSelector((state: RootState) =>
    selectPredictPendingDepositByAddress(state, selectedInternalAccountAddress),
  );

  const deposit = useCallback(
    async (params?: PredictDepositParams) => {
      try {
        navigateToConfirmation({
          loader: ConfirmationLoader.CustomAmount,
          stack: Routes.PREDICT.ROOT,
          sheetPresentation: params?.sheetPresentation,
        });

        depositWithConfirmation({}).catch((err) => {
          console.error('Failed to initialize deposit:', err);

          // Log error with deposit initialization context
          Logger.error(ensureError(err), {
            tags: {
              feature: PREDICT_CONSTANTS.FEATURE_NAME,
              component: 'usePredictDeposit',
            },
            context: {
              name: 'usePredictDeposit',
              data: {
                method: 'deposit',
                action: 'deposit_initialization',
                operation: 'financial_operations',
              },
            },
          });
          navigation.goBack();
          showDepositErrorToast(() => {
            deposit(params).catch(() => undefined);
          });
        });
      } catch (err) {
        console.error('Failed to proceed with deposit:', err);
        navigation.goBack();
        showDepositErrorToast(() => {
          deposit(params).catch(() => undefined);
        });

        // Log error with deposit navigation context
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictDeposit',
          },
          context: {
            name: 'usePredictDeposit',
            data: {
              method: 'deposit',
              action: 'deposit_navigation',
              operation: 'financial_operations',
            },
          },
        });
      }
    },
    [depositWithConfirmation, navigateToConfirmation, navigation],
  );

  return {
    deposit,
    isDepositPending: !!depositBatchId,
  };
};
