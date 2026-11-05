import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { usePredictTrading } from '../../../../UI/Predict/hooks/usePredictTrading';
import { useConfirmNavigation } from '../useConfirmNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import {
  ConfirmationLoader,
  PayWithOption,
} from '../../components/confirm/confirm-component';
import Logger from '../../../../../util/Logger';
import { useMoneyAccountAvailability } from '../../../../UI/Money/hooks/useMoneyAccountAvailability';

const LOG_TAG = '[MoneyPredictDeposit]';

export function useMoneyPredictDeposit() {
  const { enableMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const { deposit: depositWithConfirmation } = usePredictTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const { assertMoneyAccountAccessible } = useMoneyAccountAvailability();

  const initiatePredictDeposit = useCallback(async () => {
    assertMoneyAccountAccessible();

    navigateToConfirmation({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.PREDICT.ROOT,
      payWithOption: PayWithOption.MoneyAccount,
    });

    try {
      await depositWithConfirmation({});
    } catch (error) {
      Logger.error(
        error as Error,
        `${LOG_TAG} Predict deposit initiation failed`,
      );
    }
  }, [
    assertMoneyAccountAccessible,
    depositWithConfirmation,
    navigateToConfirmation,
  ]);

  return {
    isEnabled: Boolean(
      enableMoneyAccountTransactions[TransactionType.predictDeposit],
    ),
    initiatePredictDeposit,
  };
}
