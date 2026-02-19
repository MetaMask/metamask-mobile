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
 * The transaction calldata contains the cumulative total reward, not the per-claim payout.
 * The Merkl Distributor contract computes: payout = totalAmount - alreadyClaimed.
 * This hook reads the already-claimed amount from the contract and returns the unclaimed portion.
 */
const useMerklClaimAmount = (
  transaction: TransactionMeta,
  conversionRate: BigNumber,
  usdConversionRate: number,
): MerklClaimAmountResult => {
  const { chainId, txParams, type: transactionType } = transaction;

  const { value: claimAmountResult, pending } = useAsyncResult(async () => {
    if (transactionType !== TransactionType.musdClaim) return null;
    return getUnclaimedAmountForMerklClaimTx(
      txParams?.data as string | undefined,
      chainId as Hex,
    );
  }, [transactionType, txParams?.data, chainId]);

  const claimAmount = useMemo(() => {
    if (pending || !claimAmountResult) return null;

    return convertMusdClaimAmount({
      claimAmountRaw: claimAmountResult.unclaimedRaw,
      conversionRate,
      usdConversionRate,
    });
  }, [pending, claimAmountResult, conversionRate, usdConversionRate]);

  return { pending, claimAmount };
};

export default useMerklClaimAmount;
