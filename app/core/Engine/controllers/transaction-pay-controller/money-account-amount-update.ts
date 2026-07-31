import BigNumber from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  updateEIP7702BatchData,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositAssetAddress,
} from '@metamask/money-account-utils';
import { MUSD_DECIMALS } from '../../../../components/UI/Earn/constants/musd';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';
import Engine from '../../index';

const UPDATE_ERROR_PREFIX = 'Update Amount: Money Account Deposit: ';

const amountUpdates = new Map<
  string,
  {
    intentKey: string;
    promise: Promise<boolean>;
    token: symbol;
  }
>();

function failUpdate(message: string): never {
  throw new Error(`${UPDATE_ERROR_PREFIX}${message}`);
}

function validateTransactionTemplate(transaction: TransactionMeta): void {
  if (
    transaction.nestedTransactions?.[0]?.type !==
      TransactionType.tokenMethodApprove ||
    transaction.nestedTransactions[1]?.type !==
      TransactionType.moneyAccountDeposit
  ) {
    failUpdate('missing approval/deposit transaction template');
  }
}

function buildRequiredAssets(
  transaction: TransactionMeta,
  depositAssetAddress: Hex,
  amountRaw: string,
) {
  const requiredAssets = transaction.requiredAssets;
  if (!requiredAssets?.length) {
    failUpdate('missing required asset template');
  }

  const depositAssetIndex = requiredAssets.findIndex(
    ({ address }) =>
      address.toLowerCase() === depositAssetAddress.toLowerCase(),
  );
  if (depositAssetIndex === -1) {
    failUpdate('missing Money Account deposit asset template');
  }

  return requiredAssets.map((asset, index) =>
    index === depositAssetIndex
      ? { ...asset, amount: toHex(amountRaw) }
      : { ...asset },
  );
}

async function updateMoneyAccountDepositAmountInternal(
  transaction: TransactionMeta,
  amountHuman: string,
  isCurrentIntent: () => boolean,
): Promise<boolean> {
  validateTransactionTemplate(transaction);

  const vaultConfig = selectMoneyAccountVaultConfig(
    ReduxService.store.getState(),
  );
  if (!vaultConfig) {
    failUpdate('missing vault config');
  }

  const { chainId } = transaction;
  const provider = getProviderByChainId(chainId);
  if (!provider) {
    failUpdate('missing provider');
  }

  const amountRaw = calcTokenValue(amountHuman, MUSD_DECIMALS)
    .decimalPlaces(0, BigNumber.ROUND_UP)
    .toFixed(0);
  const depositAssetAddress = getMoneyAccountDepositAssetAddress(chainId);
  const buildResult = await buildMoneyAccountDepositBatch({
    amount: BigInt(amountRaw),
    chainId,
    boringVault: vaultConfig.boringVault as Hex,
    tellerAddress: vaultConfig.tellerAddress as Hex,
    accountantAddress: vaultConfig.accountantAddress as Hex,
    lensAddress: vaultConfig.lensAddress as Hex,
    provider,
  });

  if (!isCurrentIntent()) {
    return false;
  }

  const approveData = buildResult.approveTx?.params.data;
  const depositData = buildResult.depositTx?.params.data;
  if (!approveData || !depositData) {
    failUpdate('incomplete approval/deposit updates');
  }

  Engine.context.TransactionController.updateTransactionMetadata({
    transactionId: transaction.id,
    skipResimulate: true,
    callback: (transactionMeta) => {
      validateTransactionTemplate(transactionMeta);

      if (transactionMeta.chainId !== chainId) {
        failUpdate('transaction chain changed during preparation');
      }

      const { nestedTransactions, transactionData } = updateEIP7702BatchData({
        from: transactionMeta.txParams.from as Hex,
        transactions: transactionMeta.nestedTransactions ?? [],
        updates: [
          { transactionIndex: 0, transactionData: approveData },
          { transactionIndex: 1, transactionData: depositData },
        ],
      });

      transactionMeta.nestedTransactions = nestedTransactions;
      transactionMeta.requiredAssets = buildRequiredAssets(
        transactionMeta,
        depositAssetAddress,
        amountRaw,
      );
      transactionMeta.txParams.data = transactionData;
      transactionMeta.txParams.gas = undefined;
      transactionMeta.gasLimitNoBuffer = undefined;
      transactionMeta.gasUsed = undefined;
      transactionMeta.securityAlertResponse = undefined;
      transactionMeta.simulationData = undefined;
      transactionMeta.simulationFails = undefined;

      if (transactionMeta.revert) {
        delete transactionMeta.revert.gas;
        delete transactionMeta.revert.simulation;

        if (!transactionMeta.revert.receipt) {
          transactionMeta.revert = undefined;
        }
      }
    },
  });

  return true;
}

/**
 * Prepares and atomically commits a Money Account deposit amount.
 * Identical in-flight intents share a promise; newer intents prevent older
 * asynchronous preparations from committing stale transaction data.
 *
 * @param transaction - Money Account deposit transaction to update.
 * @param amountHuman - Exact human-readable amount.
 * @returns Whether this intent committed transaction metadata.
 */
export function updateMoneyAccountDepositAmount(
  transaction: TransactionMeta,
  amountHuman: string,
): Promise<boolean> {
  const intentKey = JSON.stringify({
    amountHuman,
    transactionId: transaction.id,
  });
  const existing = amountUpdates.get(transaction.id);

  if (existing?.intentKey === intentKey) {
    return existing.promise;
  }

  const token = Symbol(intentKey);
  const isCurrentIntent = (): boolean =>
    amountUpdates.get(transaction.id)?.token === token;
  const trackedPromise = updateMoneyAccountDepositAmountInternal(
    transaction,
    amountHuman,
    isCurrentIntent,
  ).finally(() => {
    if (isCurrentIntent()) {
      amountUpdates.delete(transaction.id);
    }
  });

  amountUpdates.set(transaction.id, {
    intentKey,
    promise: trackedPromise,
    token,
  });

  return trackedPromise;
}
