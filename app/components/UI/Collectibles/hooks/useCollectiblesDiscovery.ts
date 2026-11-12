import { collectiblesQueries } from '../services/data/collectiblesQueries';
import { usePackPartnerAccount } from '../providers/pack-partner/hooks/usePackPartnerAccount';
import { useInfiniteQuery, useQuery } from '@metamask/react-data-query';
import { collectiblesDataScope } from '../services/data/queryKeys';
import { useCollectiblesPresentation } from './useCollectiblesPresentation';
import type {
  IndexedPack,
  CollectiblesAccount,
  CollectiblesApiClient,
} from '../services/clients/CollectiblesApiClient';
import type { CollectiblesSocialApiClient } from '../services/clients/CollectiblesSocialApiClient';
type Result<Key extends keyof CollectiblesApiClient> = Awaited<
  ReturnType<CollectiblesApiClient[Key]>
>;

const uniqueSorted = (ids: string[]) => [...new Set(ids)].sort();

/** One batched request per visible pack set, never one request per tile. */
export const usePackInsights = (packTypes: string[]) => {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  const ids = uniqueSorted(packTypes);
  return useQuery<Result<'getPackInsights'>>({
    queryKey: collectiblesQueries.api(
      'getPackInsights',
      collectiblesDataScope(account),
      { packTypes: ids },
    ),
    enabled: online && ids.length > 0,
    gcTime: 5 * 60_000,
  });
};

/** Optional history is namespaced by account and environment, and cursor paginated. */
export const useCollectiblesHistory = (
  address: string | undefined,
  status?: IndexedPack['status'],
) => {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useInfiniteQuery<Result<'getWalletHistory'>>({
    queryKey: collectiblesQueries.api(
      'getWalletHistory',
      collectiblesDataScope(account),
      {
        account: { namespace: 'solana', address: address ?? '' },
        ...(status ? { status } : {}),
        limit: 20,
      },
    ),
    initialPageParam: null,
    maxPages: 10,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: online && Boolean(address),
    gcTime: 5 * 60_000,
  });
};

/** Pokédex unlocks and counts are supplied by the Collectibles API, never derived from owned NFTs. */
export const useCollectiblesPokedex = (
  address: string | undefined,
  generation?: number,
) => {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  return useQuery<Result<'getPokedex'>>({
    queryKey: collectiblesQueries.api(
      'getPokedex',
      collectiblesDataScope(account),
      {
        accounts: [{ namespace: 'solana', address: address ?? '' }],
        ...(generation === undefined ? {} : { generation }),
      },
    ),
    enabled: online && Boolean(address),
    gcTime: 5 * 60_000,
  });
};

/** Greatest-hits enrichment is a single batch and does not determine the core hit list. */
export const useCardsLastOpened = (cardIds: string[]) => {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  const ids = uniqueSorted(cardIds);
  return useQuery<Result<'getLastOpened'>>({
    queryKey: collectiblesQueries.api(
      'getLastOpened',
      collectiblesDataScope(account),
      { cardIds: ids },
    ),
    enabled: online && ids.length > 0,
    gcTime: 5 * 60_000,
  });
};

/** Social context is batched and optional; no Social dependency blocks a purchase. */
export const usePackSocialContext = (packTypes: string[]) => {
  const { online } = useCollectiblesPresentation();
  const account = usePackPartnerAccount();
  const ids = uniqueSorted(packTypes);
  return useQuery<
    Awaited<ReturnType<CollectiblesSocialApiClient['getPackSocialContext']>>
  >({
    queryKey: collectiblesQueries.social(
      'getPackSocialContext',
      collectiblesDataScope(account),
      { packTypes: ids },
    ),
    enabled: online && ids.length > 0,
    gcTime: 5 * 60_000,
  });
};

/** Aggregate counters come from the indexed wallet summary, including linked recipient accounts. */
export function useCollectiblesWalletSummary(accounts: CollectiblesAccount[]) {
  const { online } = useCollectiblesPresentation();
  const viewer = usePackPartnerAccount();
  const normalized = [
    ...new Map(
      accounts.map((account) => [
        `${account.namespace}:${account.address}`,
        account,
      ]),
    ).values(),
  ].sort((a, b) => a.address.localeCompare(b.address));
  return useQuery<Result<'getWalletSummary'>>({
    queryKey: collectiblesQueries.api(
      'getWalletSummary',
      collectiblesDataScope(viewer),
      { accounts: normalized },
    ),
    enabled: online && normalized.length > 0,
    gcTime: 5 * 60_000,
  });
}
