import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';

import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import {
  convertMusdClaimAmount,
  ConvertMusdClaimResult,
  getClaimPayoutFromReceipt,
  getUnclaimedAmountForMerklClaimTx,
} from '../../../../UI/Earn/utils/musd';

interface MerklClaimAmountResult {
  /** Whether the async contract call is still pending */
  pending: boolean;
  /** Converted claim amounts (decimal + fiat), or null if not a musdClaim or decoding failed */
  claimAmount: ConvertMusdClaimResult | null;
}

/**
 * Hook that computes the actual claimable (unclaimed) amount for a Merkl mUSD claim transaction.
 *
 * For confirmed transactions: extracts the actual payout from the receipt's Transfer event logs.
 * For pending transactions: computes payout = totalAmount - alreadyClaimed via contract call.
 */
const useMerklClaimAmount = (
  transaction: TransactionMeta,
  conversionRate: BigNumber,
  usdConversionRate: number,
): MerklClaimAmountResult => {
  const { chainId, txParams, txReceipt, type: transactionType } = transaction;

  // For confirmed txs, extract the actual payout from receipt Transfer logs (synchronous)
  const receiptPayout = useMemo(() => {
    if (transactionType !== TransactionType.musdClaim) return null;
    return getClaimPayoutFromReceipt(
      txReceipt?.logs as Parameters<typeof getClaimPayoutFromReceipt>[0],
      txParams?.from as string,
    );
  }, [transactionType, txReceipt?.logs, txParams?.from]);

  // For pending txs (no receipt yet): compute payout = totalAmount - alreadyClaimed
  const { value: claimAmountResult, pending } = useAsyncResult(async () => {
    if (transactionType !== TransactionType.musdClaim) return null;
    if (receiptPayout) return null;
    return getUnclaimedAmountForMerklClaimTx(
      txParams?.data as string | undefined,
      chainId as Hex,
    );
  }, [transactionType, txParams?.data, chainId, receiptPayout]);

  const claimAmount = useMemo(() => {
    if (receiptPayout) {
      return convertMusdClaimAmount({
        claimAmountRaw: receiptPayout,
        conversionRate,
        usdConversionRate,
      });
    }

    if (pending || !claimAmountResult) return null;

    return convertMusdClaimAmount({
      claimAmountRaw: claimAmountResult.unclaimedRaw,
      conversionRate,
      usdConversionRate,
    });
  }, [
    receiptPayout,
    pending,
    claimAmountResult,
    conversionRate,
    usdConversionRate,
  ]);

  return { pending: !receiptPayout && pending, claimAmount };
};

export default useMerklClaimAmount;
