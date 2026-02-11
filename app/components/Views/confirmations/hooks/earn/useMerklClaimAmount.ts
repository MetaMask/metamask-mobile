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
  decodeMerklClaimParams,
  ConvertMusdClaimResult,
} from '../../../../UI/Earn/utils/musd';
import { getClaimedAmountFromContract } from '../../../../UI/Earn/components/MerklRewards/merkl-client';

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

  // Decode Merkl claim params from the transaction calldata
  const claimParams = useMemo(() => {
    if (transactionType !== TransactionType.musdClaim) return null;
    return decodeMerklClaimParams(txParams?.data as string);
  }, [transactionType, txParams?.data]);

  // Fetch the already-claimed amount from the Merkl distributor contract
  // so we can compute unclaimed = total - claimed
  const { value: claimedAmount, pending } = useAsyncResult(async () => {
    if (!claimParams) return null;
    return getClaimedAmountFromContract(
      claimParams.userAddress,
      claimParams.tokenAddress as Hex,
      chainId as Hex,
    );
  }, [claimParams, chainId]);

  const claimAmount = useMemo(() => {
    if (pending || !claimParams) return null;

    const totalRaw = BigInt(claimParams.totalAmount);
    const claimedRaw = BigInt(claimedAmount ?? '0');
    const unclaimedRaw =
      totalRaw > claimedRaw ? (totalRaw - claimedRaw).toString() : '0';

    return convertMusdClaimAmount({
      claimAmountRaw: unclaimedRaw,
      conversionRate,
      usdConversionRate,
    });
  }, [pending, claimParams, claimedAmount, conversionRate, usdConversionRate]);

  return { pending, claimAmount };
};

export default useMerklClaimAmount;
