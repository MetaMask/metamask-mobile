import BigNumber from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import type {
  PrepareTransactionAmountCallback,
  PrepareTransactionAmountRequest,
} from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositAssetAddress,
} from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import { MUSD_DECIMALS } from '../../../../components/UI/Earn/constants/musd';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';

const REQUIRED_NESTED_TRANSACTION_INDEXES = [0, 1];
const PREPARATION_ERROR_PREFIX = 'Prepare Amount: Money Account Deposit: ';

function isMoneyAccountDeposit(
  transaction: PrepareTransactionAmountRequest['transaction'],
): boolean {
  return (
    transaction.type === TransactionType.moneyAccountDeposit ||
    (transaction.nestedTransactions?.some(
      (nestedTransaction) =>
        nestedTransaction.type === TransactionType.moneyAccountDeposit,
    ) ??
      false)
  );
}

function failPreparation(message: string): never {
  throw new Error(`${PREPARATION_ERROR_PREFIX}${message}`);
}

function validateTransactionTemplate(
  transaction: PrepareTransactionAmountRequest['transaction'],
): void {
  const nestedTransactions = transaction.nestedTransactions;
  if (
    nestedTransactions?.[0]?.type !== TransactionType.tokenMethodApprove ||
    nestedTransactions[1]?.type !== TransactionType.moneyAccountDeposit
  ) {
    failPreparation('missing approval/deposit transaction template');
  }
}

function buildRequiredAssets(
  transaction: PrepareTransactionAmountRequest['transaction'],
  depositAssetAddress: Hex,
  amountRaw: string,
) {
  const requiredAssets = transaction.requiredAssets;
  if (!requiredAssets?.length) {
    failPreparation('missing required asset template');
  }

  const depositAssetIndex = requiredAssets.findIndex(
    ({ address }) =>
      address.toLowerCase() === depositAssetAddress.toLowerCase(),
  );
  if (depositAssetIndex === -1) {
    failPreparation('missing Money Account deposit asset template');
  }

  return requiredAssets.map((asset, index) =>
    index === depositAssetIndex
      ? { ...asset, amount: toHex(amountRaw) }
      : { ...asset },
  );
}

/**
 * Prepares a Money Account deposit from an exact human-readable amount.
 *
 * This is intentionally separate from the legacy raw-unit `getAmountData`
 * callback. Non-deposit transactions opt out, while recognized deposits fail
 * closed unless a complete required-asset and approval/deposit patch can be
 * returned together.
 */
export const prepareTransactionAmount: PrepareTransactionAmountCallback =
  async ({ amountHuman, transaction }) => {
    if (!isMoneyAccountDeposit(transaction)) {
      return { kind: 'not-applicable' };
    }

    validateTransactionTemplate(transaction);

    const vaultConfig = selectMoneyAccountVaultConfig(
      ReduxService.store.getState(),
    );
    if (!vaultConfig) {
      failPreparation('missing vault config');
    }

    const chainId = transaction.chainId;
    const provider = getProviderByChainId(chainId);
    if (!provider) {
      failPreparation('missing provider');
    }

    const amountRaw = calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0);
    const depositAssetAddress = getMoneyAccountDepositAssetAddress(chainId);
    const requiredAssets = buildRequiredAssets(
      transaction,
      depositAssetAddress,
      amountRaw,
    );

    const buildResult = await buildMoneyAccountDepositBatch({
      amount: BigInt(amountRaw),
      chainId,
      boringVault: vaultConfig.boringVault,
      tellerAddress: vaultConfig.tellerAddress,
      accountantAddress: vaultConfig.accountantAddress,
      lensAddress: vaultConfig.lensAddress,
      provider,
    });
    const approveData = buildResult.approveTx?.params.data;
    const depositData = buildResult.depositTx?.params.data;
    if (!approveData || !depositData) {
      failPreparation('incomplete approval/deposit updates');
    }

    return {
      kind: 'prepared',
      amountRaw,
      requiredAssets,
      nestedTransactionUpdates: [
        { transactionIndex: 0, transactionData: approveData },
        { transactionIndex: 1, transactionData: depositData },
      ],
      requiredNestedTransactionIndexes: REQUIRED_NESTED_TRANSACTION_INDEXES,
    };
  };
