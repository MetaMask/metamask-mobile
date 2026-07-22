import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  type AuthorizationList,
  type BatchTransactionParams,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type GetPaymentOverrideDataRequest,
  type GetPaymentOverrideDataResponse,
} from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
} from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import { MUSD_DECIMALS } from '../../../../components/UI/Earn/constants/musd';
import Engine from '../../../../core/Engine';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';
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
  atomic: boolean,
): Promise<BatchTransactionParams[]> {
  const state = ReduxService.store.getState() as RootState;
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  if (!primaryMoneyAccount?.address || !vaultConfig) return [];

  const moneyAccountAddress = primaryMoneyAccount.address as Hex;
  const chainId = CHAIN_IDS.MONAD as Hex;

  const provider = getProviderByChainId(chainId);
  if (!provider) return [];

  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );

  const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
    amount,
    chainId,
    tellerAddress: vaultConfig.tellerAddress as Hex,
    accountantAddress: vaultConfig.accountantAddress as Hex,
    moneyAccountAddress,
    recipient,
    provider,
  });

  const rawCalls: BatchTransactionParams[] = [
    {
      to: withdrawTx.params.to,
      data: withdrawTx.params.data,
      value: withdrawTx.params.value,
    },
    {
      to: transferTx.params.to,
      data: transferTx.params.data,
      value: transferTx.params.value,
    },
  ];

  // Non-atomic flows submit the raw calls directly as a sponsored batch after
  // Relay completion; the Money Account is already 7702-delegated so no fresh
  // delegation wrap is needed.
  if (!atomic) {
    return rawCalls;
  }

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
    nestedTransactions: rawCalls,
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
>(
  messenger: T,
  amountHuman: string,
  atomic: boolean,
): Promise<{
  calls: BatchTransactionParams[];
  recipient?: Hex;
  authorizationList?: AuthorizationList;
}> {
  const state = ReduxService.store.getState() as RootState;
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  if (!primaryMoneyAccount?.address || !vaultConfig) return { calls: [] };

  const moneyAccountAddress = primaryMoneyAccount.address as Hex;
  const chainId = CHAIN_IDS.MONAD as Hex;

  const provider = getProviderByChainId(chainId);
  if (!provider) return { calls: [] };

  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );

  const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
    amount,
    chainId,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  const rawCalls: BatchTransactionParams[] = [
    {
      to: approveTx.params.to,
      data: approveTx.params.data,
      value: approveTx.params.value,
    },
    {
      to: depositTx.params.to,
      data: depositTx.params.data,
      value: depositTx.params.value,
    },
  ];

  // Non-atomic flows submit the raw calls directly as a sponsored batch after
  // Relay completion; the Money Account is already 7702-delegated so no fresh
  // delegation wrap is needed.
  if (!atomic) {
    return { calls: rawCalls, recipient: moneyAccountAddress };
  }

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
    nestedTransactions: rawCalls,
  } as TransactionMeta;

  const delegation = await getDelegationTransaction(messenger, transactionMeta);

  return {
    recipient: moneyAccountAddress,
    authorizationList: delegation.authorizationList,
    calls: [
      {
        to: delegation.to,
        data: delegation.data,
        value: delegation.value,
      },
    ],
  };
}

export async function getPaymentOverrideData<T extends SignMessenger>(
  request: GetPaymentOverrideDataRequest,
  messenger: T,
): Promise<GetPaymentOverrideDataResponse & { recipient?: Hex }> {
  const { amount, transaction, transactionData } = request;

  if (transactionData?.paymentOverride === PaymentOverride.MoneyAccount) {
    const atomic = transactionData.atomic !== false;

    if (transactionData?.isPostQuote) {
      return await getMoneyAccountDepositPaymentOverrideData(
        messenger,
        amount,
        atomic,
      );
    }

    if (!transaction.txParams?.from) return { calls: [] };

    const calls = await getMoneyAccountWithdrawPaymentOverrideData(
      messenger,
      transaction.txParams.from as Hex,
      amount,
      atomic,
    );
    return { calls };
  }

  return { calls: [] };
}
