import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { usePredictTrading } from '../../../../UI/Predict/hooks/usePredictTrading';
import { useConfirmNavigation } from '../useConfirmNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import { PayWithOption } from '../../components/confirm/confirm-component';
import Logger from '../../../../../util/Logger';

const LOG_TAG = '[MoneyPredictDeposit]';

export function useMoneyPredictDeposit() {
  const { enableMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const { deposit: depositWithConfirmation } = usePredictTrading();
  const { navigateToConfirmation } = useConfirmNavigation();

  const initiatePredictDeposit = useCallback(async () => {
    navigateToConfirmation({
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
  }, [depositWithConfirmation, navigateToConfirmation]);

  return {
    isEnabled: Boolean(
      enableMoneyAccountTransactions[TransactionType.predictDeposit],
    ),
    initiatePredictDeposit,
  };
}
