import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { useMemo } from 'react';

import {
  convertMusdClaimAmount,
  ConvertMusdClaimResult,
  getClaimPayoutFromReceipt,
} from '../../../../UI/Earn/utils/musd';

interface MerklClaimAmountResult {
  /** Converted claim amounts (decimal + fiat), or null if not a musdClaim or decoding failed */
  claimAmount: ConvertMusdClaimResult | null;
}

/**
 * Hook that computes the claimed amount for a Merkl mUSD claim transaction.
 *
 * Extracts the actual payout from the confirmed transaction receipt's Transfer event logs.
 */
const useMerklClaimAmount = (
  transaction: TransactionMeta,
  conversionRate: BigNumber,
  usdConversionRate: number,
): MerklClaimAmountResult => {
  const { txParams, txReceipt, type: transactionType } = transaction;

  const receiptPayout = useMemo(() => {
    if (transactionType !== TransactionType.musdClaim) return null;
    return getClaimPayoutFromReceipt(
      txReceipt?.logs as Parameters<typeof getClaimPayoutFromReceipt>[0],
      txParams?.from as string,
    );
  }, [transactionType, txReceipt?.logs, txParams?.from]);

  const claimAmount = useMemo(() => {
    if (!receiptPayout) return null;

    return convertMusdClaimAmount({
      claimAmountRaw: receiptPayout,
      conversionRate,
      usdConversionRate,
    });
  }, [receiptPayout, conversionRate, usdConversionRate]);

  return { claimAmount };
};

export default useMerklClaimAmount;
