import { useCallback, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';
import { updateEIP7702BatchData } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { getTransactionPayAmountCalls } from '../../external/types/transaction-pay-amount';
import { UpdateTransactionPayAmountCall } from '../../types/transactions';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../transactions/useUpdateTokenAmount';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';

export function useUpdateTransactionPayAmount() {
  const transactionMeta = useTransactionMetadataRequest();
  const { updateTokenAmount } = useUpdateTokenAmount();
  const requiredTokens = useTransactionPayRequiredTokens();
  const accountOverride = useTransactionAccountOverride();
  const latestAmountRef = useRef<string | undefined>(undefined);

  const decimals = requiredTokens?.[0]?.decimals;

  const updateTransactionPayAmount = useCallback(
    async (amountHuman: string): Promise<boolean> => {
      if (!transactionMeta) {
        return false;
      }

      latestAmountRef.current = amountHuman;

      const calls = await getTransactionPayAmountCalls(
        transactionMeta,
        amountHuman,
        accountOverride,
      );

      // A single-call transfer already lands in one transaction state update.
      if (!calls) {
        await updateTokenAmount(amountHuman);
        return true;
      }

      // A newer amount superseded this one while its calldata was being built.
      if (latestAmountRef.current !== amountHuman) {
        return false;
      }

      const requiredAssetAmount = getRequiredAssetAmount(amountHuman, decimals);

      const isRequiredAssetChanged = Boolean(
        requiredAssetAmount &&
          transactionMeta.requiredAssets?.length &&
          transactionMeta.requiredAssets[0].amount !== requiredAssetAmount,
      );

      if (!calls.length && !isRequiredAssetChanged) {
        return false;
      }

      commitPayAmountUpdate({
        calls,
        requiredAssetAmount,
        transactionId: transactionMeta.id,
      });

      return true;
    },
    [accountOverride, decimals, transactionMeta, updateTokenAmount],
  );

  return {
    updateTransactionPayAmount,
  };
}

/**
 * Applies the new calldata and required asset amount in a single transaction
 * state update.
 *
 * Both have to land together. TransactionPayController requests a quote
 * whenever either changes, so a partially applied amount gets quoted against
 * the placeholder calldata and the relay rejects it as
 * "Reverted - Unknown Error".
 *
 * @param options - Options bag.
 * @param options.calls - Nested calls to re-encode into the batch.
 * @param options.requiredAssetAmount - Encoded amount for the first required asset.
 * @param options.transactionId - Confirmation being updated.
 */
function commitPayAmountUpdate({
  calls,
  requiredAssetAmount,
  transactionId,
}: {
  calls: UpdateTransactionPayAmountCall[];
  requiredAssetAmount: Hex | undefined;
  transactionId: string;
}): void {
  Engine.context.TransactionController.updateTransactionMetadata({
    transactionId,
    skipResimulate: true,
    callback: (meta) => {
      if (calls.length === 1) {
        // A single call is not a batch, so it needs no EIP-7702 wrapper and the
        // call data is the transaction data.
        const [{ transactionData }] = calls;

        meta.txParams.data = transactionData;

        if (meta.nestedTransactions?.length === 1) {
          meta.nestedTransactions = [
            { ...meta.nestedTransactions[0], data: transactionData },
          ];
        }
      } else if (calls.length) {
        const { nestedTransactions, transactionData } = updateEIP7702BatchData({
          from: meta.txParams.from as Hex,
          transactions: meta.nestedTransactions ?? [],
          updates: calls.map(
            ({ nestedTransactionIndex, transactionData: data }) => ({
              transactionIndex: nestedTransactionIndex,
              transactionData: data,
            }),
          ),
        });

        meta.nestedTransactions = nestedTransactions;
        meta.txParams.data = transactionData;
      }

      if (requiredAssetAmount && meta.requiredAssets?.length) {
        meta.requiredAssets = [
          { ...meta.requiredAssets[0], amount: requiredAssetAmount },
          ...meta.requiredAssets.slice(1),
        ];
      }

      // Drop metadata derived from the previous amount so stale gas and
      // simulation results are not shown against the new calldata.
      meta.txParams.gas = undefined;
      meta.gasLimitNoBuffer = undefined;
      meta.gasUsed = undefined;
      meta.securityAlertResponse = undefined;
      meta.simulationData = undefined;
      meta.simulationFails = undefined;

      if (meta.revert) {
        delete meta.revert.gas;
        delete meta.revert.simulation;

        if (!meta.revert.receipt) {
          meta.revert = undefined;
        }
      }
    },
  });
}

function getRequiredAssetAmount(
  amountHuman: string,
  decimals: number | undefined,
): Hex | undefined {
  if (decimals === undefined) {
    return undefined;
  }

  // ROUND_DOWN so Max / near-Max from an 18-decimal pay token never encodes
  // more than the source balance can fund (ROUND_UP was pushing past it).
  const amount = new BigNumber(amountHuman)
    .shiftedBy(decimals)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);

  if (!amount.isFinite() || amount.isNegative()) {
    return undefined;
  }

  return toHex(amount.toFixed(0)) as Hex;
}
