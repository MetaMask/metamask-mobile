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
import {
  selectMoneyAccountVaultConfig,
  selectMoneyAccountWithdrawalSlippageBps,
} from '../../../../selectors/featureFlagController/moneyAccount';
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

  const withdrawalSlippageBps = selectMoneyAccountWithdrawalSlippageBps(
    ReduxService.store.getState() as RootState,
  );

  const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
    amount,
    chainId,
    tellerAddress: vaultConfig.tellerAddress as Hex,
    accountantAddress: vaultConfig.accountantAddress as Hex,
    moneyAccountAddress,
    recipient,
    provider,
    withdrawalSlippageBps,
  });

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
    nestedTransactions: [
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
    ],
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
    nestedTransactions: [
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
    ],
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
    if (transactionData?.isPostQuote) {
      return await getMoneyAccountDepositPaymentOverrideData(messenger, amount);
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
