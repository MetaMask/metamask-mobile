import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../../../core/Engine';
import type { CollectorCryptCard, SolanaAccountRef } from '../types';

export const collectorCryptCardsKeys = {
  all: () => ['collectorCrypt', 'cards'] as const,
  byAddress: (address: string) =>
    [...collectorCryptCardsKeys.all(), address] as const,
};

/**
 * Card reconciliation (`syncCards`). The UI reads cards from the controller
 * state; the query only drives the sync, its loading and its error.
 */
export const collectorCryptCardsOptions = (
  account: SolanaAccountRef | undefined,
) =>
  queryOptions<CollectorCryptCard[], Error>({
    queryKey: collectorCryptCardsKeys.byAddress(account?.address ?? ''),
    queryFn: async (): Promise<CollectorCryptCard[]> =>
      account ? Engine.context.GachaController.syncCards({ account }) : [],
    staleTime: 30_000,
  });
