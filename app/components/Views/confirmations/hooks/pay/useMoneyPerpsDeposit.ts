import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { usePerpsTrading } from '../../../../UI/Perps/hooks/usePerpsTrading';
import { useConfirmNavigation } from '../useConfirmNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import { PayWithOption } from '../../components/confirm/confirm-component';
import Logger from '../../../../../util/Logger';
import { useMoneyAccountAvailability } from '../../../../UI/Money/hooks/useMoneyAccountAvailability';
import { assertMoneyAccountAccessible } from '../../../../UI/Money/utils/moneyAccountAccess';

const LOG_TAG = '[MoneyPerpsDeposit]';

export function useMoneyPerpsDeposit() {
  const { enableMoneyAccountTransactions } = useSelector(
    selectMetaMaskPayFlags,
  );
  const { depositWithConfirmation } = usePerpsTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const { accessBlockReason } = useMoneyAccountAvailability();

  const initiatePerpsDeposit = useCallback(async () => {
    assertMoneyAccountAccessible(accessBlockReason);

    navigateToConfirmation({
      stack: Routes.PERPS.ROOT,
      payWithOption: PayWithOption.MoneyAccount,
    });

    try {
      await depositWithConfirmation();
    } catch (error) {
      Logger.error(
        error as Error,
        `${LOG_TAG} Perps deposit initiation failed`,
      );
    }
  }, [accessBlockReason, depositWithConfirmation, navigateToConfirmation]);

  return {
    isEnabled: Boolean(
      enableMoneyAccountTransactions[TransactionType.perpsDeposit],
    ),
    initiatePerpsDeposit,
  };
}
