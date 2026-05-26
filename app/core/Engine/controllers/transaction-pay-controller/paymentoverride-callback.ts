import {
  CHAIN_IDS,
  type TransactionParams,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { getBridgeInfo } from '@metamask/perps-controller/constants/hyperLiquidConfig';
import { getMoneyAccountWithdrawTransactionsData } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectTransactionDataByTransactionId } from '../../../../selectors/transactionPayController';

async function getMoneyAccountWithdrawPaymentOverrideData(
  transactionData: ReturnType<typeof selectTransactionDataByTransactionId>,
): Promise<TransactionParams[]> {
  const requiredToken = transactionData?.tokens?.[0];
  if (!requiredToken) return [];

  const { amountHuman } = requiredToken;
  const { contractAddress } = getBridgeInfo(false);

  const params = await getMoneyAccountWithdrawTransactionsData(
    CHAIN_IDS.MONAD as Hex,
    amountHuman,
    contractAddress as Hex,
  );

  return params as unknown as TransactionParams[];
}

export function createPaymentOverrideCallback() {
  return async (transactionId: string): Promise<TransactionParams[]> => {
    const state = ReduxService.store.getState() as RootState;
    const transactionData = selectTransactionDataByTransactionId(
      state,
      transactionId,
    );

    if (
      transactionData?.paymentOverride === PaymentOverride.MoneyAccount &&
      !transactionData?.isPostQuote
    ) {
      return getMoneyAccountWithdrawPaymentOverrideData(transactionData);
    }

    return [];
  };
}
