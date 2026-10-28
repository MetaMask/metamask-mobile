import type { V6BalancesResponse } from '@metamask/core-backend';
import { chainIdFromCaipAccountId, chunkList } from './accountTargets';
import type { OwnedTokenBalanceItem } from './types';

export interface OwnedTokenBalanceFetchResult {
  balances: OwnedTokenBalanceItem[];
  unprocessedNetworks: string[];
}

export const mergeOwnedTokenBalanceResponses = (
  responses: readonly V6BalancesResponse[],
): OwnedTokenBalanceFetchResult => {
  const balances: OwnedTokenBalanceItem[] = [];
  const unprocessed = new Set<string>();
  responses.forEach((response) => {
    response.balances.forEach((balance) => {
      balances.push(balance as OwnedTokenBalanceItem);
    });
    response.unprocessedNetworks.forEach((network) => {
      unprocessed.add(network);
    });
  });
  return {
    balances,
    unprocessedNetworks: [...unprocessed],
  };
};

/**
 * Loads v6 balances in parallel chunks. Slow or low-end devices run the
 * chunks one after another so a large account group does not open every
 * request at once.
 */
export const fetchOwnedTokenBalancesInChunks = async ({
  accountIds,
  vsCurrency,
  signal,
  sequential,
  fetchChunk,
}: {
  accountIds: readonly string[];
  vsCurrency: string;
  signal: AbortSignal;
  sequential: boolean;
  fetchChunk: (
    ids: readonly string[],
    networks: readonly string[],
    currency: string,
    requestSignal: AbortSignal,
  ) => Promise<V6BalancesResponse>;
}): Promise<OwnedTokenBalanceFetchResult> => {
  const chunks = chunkList(accountIds);
  const loadChunk = (ids: readonly string[]) => {
    const networks = [
      ...new Set(
        ids
          .map((accountId) => chainIdFromCaipAccountId(accountId))
          .filter((chainId): chainId is NonNullable<typeof chainId> =>
            Boolean(chainId),
          ),
      ),
    ];
    return fetchChunk(ids, networks, vsCurrency, signal);
  };

  if (sequential) {
    const responses: V6BalancesResponse[] = [];
    for (const ids of chunks) {
      if (signal.aborted) {
        throw new Error('Owned token balance request was aborted');
      }
      responses.push(await loadChunk(ids));
    }
    return mergeOwnedTokenBalanceResponses(responses);
  }

  const responses = await Promise.all(chunks.map((ids) => loadChunk(ids)));
  return mergeOwnedTokenBalanceResponses(responses);
};
