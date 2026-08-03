import BigNumber from 'bignumber.js';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
  type MoneyAccountTxParams,
} from '@metamask/money-account-utils';
import { UpdateTransactionPayAmountCall } from '../../../Views/confirmations/types/transactions';
import { MUSD_DECIMALS } from '../../Earn/constants/musd';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';

/**
 * Converts a human-readable amount (e.g. "10.5") to mUSD base units, rounding
 * up so the user is never short of the amount they asked for.
 * @param amountHuman - Human-readable amount.
 * @returns The amount in mUSD base units.
 */
function toMusdBaseUnits(amountHuman: string): bigint {
  return BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );
}

/**
 * Returns the per-nested-call data updates required when the user changes
 * the deposit amount on a Money Account deposit confirmation.
 *
 * Reads vault config from the Redux store, calls `previewDeposit` on the
 * lens contract to derive an accurate `minimumMint`, and returns the
 * re-encoded approve + deposit calldata ready for `updateAtomicBatchData`.
 *
 * Returns `[]` (no-op) if vault config or provider is unavailable.
 * Lets `buildMoneyAccountDepositBatch` errors propagate so the dispatcher
 * can log them via its prep-error handler.
 */
export async function updateMoneyAccountDepositTokenAmount(
  transactionMeta: TransactionMeta,
  amountHuman: string,
): Promise<UpdateTransactionPayAmountCall[]> {
  const vaultConfig = selectMoneyAccountVaultConfig(
    ReduxService.store.getState() as RootState,
  );
  if (!vaultConfig) return [];

  const chainIdHex = transactionMeta.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) return [];

  const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
    amount: toMusdBaseUnits(amountHuman),
    chainId: chainIdHex,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  return [
    { nestedTransactionIndex: 0, transactionData: approveTx.params.data },
    { nestedTransactionIndex: 1, transactionData: depositTx.params.data },
  ];
}

/**
 * Returns the per-nested-call data updates required when the user changes
 * the withdrawal amount on a Money Account withdraw confirmation.
 *
 * Reads vault config, primary money account, and recipient from Redux, then
 * re-encodes the withdraw + ERC-20 transfer nested calls at the new amount.
 */
export async function updateMoneyAccountWithdrawTokenAmount(
  transactionMeta: TransactionMeta,
  amountHuman: string,
  recipientOverride?: Hex,
): Promise<UpdateTransactionPayAmountCall[]> {
  const state = ReduxService.store.getState() as RootState;
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const recipient = recipientOverride ?? selectEvmAddress(state);
  if (!vaultConfig || !primaryMoneyAccount?.address || !recipient) return [];

  const chainIdHex = transactionMeta.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) return [];

  const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
    amount: toMusdBaseUnits(amountHuman),
    chainId: chainIdHex,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    moneyAccountAddress: primaryMoneyAccount.address as Hex,
    recipient: recipient as Hex,
    provider,
  });

  return [
    { nestedTransactionIndex: 0, transactionData: withdrawTx.params.data },
    { nestedTransactionIndex: 1, transactionData: transferTx.params.data },
  ];
}

/**
 * Returns the approve + deposit transaction params for a Money Account deposit.
 *
 * @param chainId - Chain ID in hex
 * @param amountHuman - Human-readable deposit amount (e.g. "10.5")
 * @returns `[approveTx.params, depositTx.params]`, or `[]` if vault config or provider is unavailable
 */
export async function getMoneyAccountDepositTransactionsData(
  chainId: Hex,
  amountHuman: string,
): Promise<MoneyAccountTxParams['params'][]> {
  const vaultConfig = selectMoneyAccountVaultConfig(
    ReduxService.store.getState() as RootState,
  );
  if (!vaultConfig) return [];

  const provider = getProviderByChainId(chainId);
  if (!provider) return [];

  const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
    amount: toMusdBaseUnits(amountHuman),
    chainId,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  return [approveTx.params, depositTx.params];
}

/**
 * Returns encoded calldata for the withdraw + transfer batch of a Money Account withdrawal.
 *
 * @param chainId - Chain ID in hex
 * @param amountHuman - Human-readable withdrawal amount (e.g. "10.5")
 * @param recipientOverride - Optional EVM address to receive the withdrawn mUSD.
 * When omitted, defaults to the currently selected EVM account.
 * @returns `[withdrawTx.params, transferTx.params]`, or `[]` if vault config or provider is unavailable
 */
export async function getMoneyAccountWithdrawTransactionsData(
  chainId: Hex,
  amountHuman: string,
  recipientOverride?: Hex,
): Promise<MoneyAccountTxParams['params'][]> {
  const state = ReduxService.store.getState() as RootState;
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const recipient = recipientOverride ?? selectEvmAddress(state);
  if (!vaultConfig || !primaryMoneyAccount?.address || !recipient) return [];

  const provider = getProviderByChainId(chainId);
  if (!provider) return [];

  const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
    amount: toMusdBaseUnits(amountHuman),
    chainId,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    moneyAccountAddress: primaryMoneyAccount.address as Hex,
    recipient: recipient as Hex,
    provider,
  });

  return [withdrawTx.params, transferTx.params];
}
