import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  type TransactionParams,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import { getMoneyAccountWithdrawTransactionsData } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectTransactionDataByTransactionId } from '../../../../selectors/transactionPayController';
import {
  getDelegationTransaction,
  type SignMessenger,
} from '../../../../util/transactions/delegation';

async function getMoneyAccountWithdrawPaymentOverrideData<
  T extends SignMessenger,
>(
  transactionData: ReturnType<typeof selectTransactionDataByTransactionId>,
  messenger: T,
  recipient: Hex,
): Promise<TransactionParams | undefined> {
  const requiredToken = transactionData?.tokens?.[0];
  if (!requiredToken) return undefined;

  const state = ReduxService.store.getState() as RootState;
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  if (!primaryMoneyAccount?.address) return undefined;

  const moneyAccountAddress = primaryMoneyAccount.address as Hex;
  const chainId = CHAIN_IDS.MONAD as Hex;
  const { amountHuman } = requiredToken;

  const params = await getMoneyAccountWithdrawTransactionsData(
    chainId,
    amountHuman,
    recipient,
  );

  if (!params.length) return undefined;

  const { NetworkController } = Engine.context;
  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(chainId);

  const transactionMeta = {
    id: `money-account-withdraw-${Date.now()}`,
    chainId,
    networkClientId,
    status: TransactionStatus.unapproved,
    time: Date.now(),
    txParams: {
      from: moneyAccountAddress,
    },
    nestedTransactions: params.map((p) => ({
      to: p.to,
      data: p.data,
      value: p.value,
    })),
  } as TransactionMeta;

  const delegation = await getDelegationTransaction(messenger, transactionMeta);

  return {
    from: moneyAccountAddress,
    to: delegation.to,
    data: delegation.data,
    value: delegation.value,
  };
}

export async function getPaymentOverrideData<T extends SignMessenger>(
  transactionId: string,
  messenger: T,
): Promise<TransactionParams | undefined> {
  const state = ReduxService.store.getState() as RootState;
  const transactionData = selectTransactionDataByTransactionId(
    state,
    transactionId,
  );

  if (transactionData?.paymentOverride === PaymentOverride.MoneyAccount) {
    const { TransactionController } = Engine.context;
    const originalTx = TransactionController.state.transactions?.find(
      (tx: TransactionMeta) => tx.id === transactionId,
    );
    if (!originalTx?.txParams?.from) return undefined;

    return getMoneyAccountWithdrawPaymentOverrideData(
      transactionData,
      messenger,
      originalTx.txParams.from as Hex,
    );
  }

  return undefined;
}
