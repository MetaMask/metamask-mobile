import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Engine from '../../../../../../core/Engine';
import { isCollectorCryptError } from '../services/errors';
import type { CollectorCryptBuyback, SolanaAccountRef } from '../types';

export type BuybackDisplay =
  | { status: 'checking' }
  | { status: 'available'; amount: string }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'pending'; hasFailed: boolean };

/** What the buyback offer box shows for a cached offer and the refresh state. */
export const getBuybackDisplay = (
  buyback: CollectorCryptBuyback | undefined,
  {
    hasFailed,
    isChecking = false,
    isSalePending = false,
  }: { hasFailed: boolean; isChecking?: boolean; isSalePending?: boolean },
): BuybackDisplay => {
  if (isSalePending) {
    return { status: 'pending', hasFailed };
  }
  if (isChecking) {
    return { status: 'checking' };
  }
  if (hasFailed) {
    return { status: 'error' };
  }
  if (buyback?.status === 'available' && buyback.amount) {
    return { status: 'available', amount: buyback.amount };
  }
  if (buyback?.status === 'unavailable') {
    return { status: 'unavailable' };
  }
  return { status: 'checking' };
};

/**
 * Refreshes the offer with request state scoped to the selected account and mint.
 * A failed lookup stays retryable and never means that the card has no offer.
 */
export const useRefreshBuyback = ({
  account,
  mint,
  shouldRefresh,
}: {
  account: SolanaAccountRef | undefined;
  mint: string | undefined;
  shouldRefresh: boolean;
}): { isChecking: boolean; hasFailed: boolean; retry: () => Promise<void> } => {
  const enabled = shouldRefresh && Boolean(account && mint);
  const { isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      'collectorCrypt',
      'buyback',
      account?.id,
      account?.address,
      mint,
    ],
    queryFn: async () =>
      account && mint
        ? Engine.context.GachaController.refreshBuyback({
            account,
            mint,
          })
        : undefined,
    enabled,
    retry: false,
  });
  const retry = useCallback(async () => {
    if (enabled) {
      await refetch();
    }
  }, [enabled, refetch]);

  return {
    isChecking: enabled && isFetching,
    hasFailed:
      enabled &&
      isError &&
      !(
        isCollectorCryptError(error) &&
        error.code === 'SALE_PENDING' &&
        error.cause === undefined
      ),
    retry,
  };
};
