import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  type BatchTransactionParams,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type GetPaymentOverrideDataRequest,
  type GetPaymentOverrideDataResponse,
} from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import {
  getMoneyAccountDepositTransactionsData,
  getMoneyAccountWithdrawTransactionsData,
} from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import {
  getDelegationTransaction,
  type SignMessenger,
} from '../../../../util/transactions/delegation';

async function getMoneyAccountWithdrawPaymentOverrideData<
  T extends SignMessenger,
>(
  messenger: T,
  recipient: Hex,
  amountHuman: string,
): Promise<BatchTransactionParams[]> {
  const state = ReduxService.store.getState() as RootState;
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  if (!primaryMoneyAccount?.address) return [];

  const moneyAccountAddress = primaryMoneyAccount.address as Hex;
  const chainId = CHAIN_IDS.MONAD as Hex;

  const params = await getMoneyAccountWithdrawTransactionsData(
    chainId,
    amountHuman,
    recipient,
  );

  if (!params.length) return [];

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

  return [
    {
      to: delegation.to,
      data: delegation.data,
      value: delegation.value,
    },
  ];
}

async function getMoneyAccountDepositPaymentOverrideData<
  T extends SignMessenger,
>(messenger: T, amountHuman: string): Promise<BatchTransactionParams[]> {
  const state = ReduxService.store.getState() as RootState;
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  if (!primaryMoneyAccount?.address) return [];

  const moneyAccountAddress = primaryMoneyAccount.address as Hex;
  const chainId = CHAIN_IDS.MONAD as Hex;

  const txs = await getMoneyAccountDepositTransactionsData(
    chainId,
    amountHuman,
  );
  if (!txs.length) return [];

  const { NetworkController } = Engine.context;
  const networkClientId =
    NetworkController.findNetworkClientIdByChainId(chainId);

  const transactionMeta = {
    id: `money-account-deposit-${Date.now()}`,
    chainId,
    networkClientId,
    status: TransactionStatus.unapproved,
    time: Date.now(),
    txParams: {
      from: moneyAccountAddress,
    },
    nestedTransactions: txs.map((tx) => ({
      to: tx.params.to,
      data: tx.params.data,
      value: tx.params.value,
    })),
  } as TransactionMeta;

  const delegation = await getDelegationTransaction(messenger, transactionMeta);

  return [
    {
      to: delegation.to,
      data: delegation.data,
      value: delegation.value,
    },
  ];
}

export async function getPaymentOverrideData<T extends SignMessenger>(
  request: GetPaymentOverrideDataRequest,
  messenger: T,
): Promise<GetPaymentOverrideDataResponse> {
  const { amount, transaction, transactionData } = request;

  if (transactionData?.paymentOverride === PaymentOverride.MoneyAccount) {
    if (transactionData?.isPostQuote) {
      return {
        calls: await getMoneyAccountDepositPaymentOverrideData(
          messenger,
          amount,
        ),
      };
    }

    if (!transaction.txParams?.from) return { calls: [] };

    const calls = await getMoneyAccountWithdrawPaymentOverrideData(
      messenger,
      transaction.txParams.from as Hex,
      amount,
    );
    return { calls };
  }

  return { calls: [] };
}
