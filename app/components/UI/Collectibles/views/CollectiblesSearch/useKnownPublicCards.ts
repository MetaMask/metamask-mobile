import { useMemo, useSyncExternalStore } from 'react';
import {
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import {
  PACK_PARTNER_ENVIRONMENT,
  type PackPartnerEnvironment,
} from '../../providers/pack-partner/constants';
import type {
  CollectiblesInventoryCard,
  CollectiblesInventoryPage,
} from '../../types';
import { packPartnerQueries } from '../../services/data/packPartnerQueries';

/** Owns snapshot memoization outside React render scope; query data remains in TanStack. */
function createKnownPublicCardsStore(
  queryClient: QueryClient,
  environment: PackPartnerEnvironment,
) {
  const queryKey = packPartnerQueries.getPackInventory(environment, '').family;
  const hitsKey = packPartnerQueries.getGreatestHits(environment).queryKey;
  let previousData: (InfiniteData<CollectiblesInventoryPage> | undefined)[] =
    [];
  let previousHits: CollectiblesInventoryCard[] | undefined;
  let snapshot: CollectiblesInventoryCard[] = [];

  return {
    getSnapshot() {
      const data = queryClient
        .getQueriesData<InfiniteData<CollectiblesInventoryPage>>({ queryKey })
        .map(([, value]) => value);
      const hits =
        queryClient.getQueryData<CollectiblesInventoryCard[]>(hitsKey);
      if (
        hits !== previousHits ||
        data.length !== previousData.length ||
        data.some((value, index) => value !== previousData[index])
      ) {
        previousData = data;
        previousHits = hits;
        snapshot = data
          .flatMap((value) => value?.pages.flatMap((page) => page.cards) ?? [])
          .concat(hits ?? []);
      }
      return snapshot;
    },
    subscribe(onChange: () => void) {
      return queryClient.getQueryCache().subscribe((event) => {
        if (
          (event.type === 'added' ||
            event.type === 'removed' ||
            event.type === 'updated') &&
          (event.query.queryKey[0] === queryKey[0] ||
            event.query.queryKey[0] === hitsKey[0]) &&
          event.query.queryKey[1] === queryKey[1]
        ) {
          onChange();
        }
      });
    },
  };
}

/**
 * Read-only search projection of public cards already loaded in this environment.
 * It neither fetches inventory/rankings nor delays their existing cache GC.
 * Public inventory is shared between accounts; owned cards are read separately,
 * never inferred from this cache.
 */
export function useKnownPublicCards(environment = PACK_PARTNER_ENVIRONMENT) {
  const queryClient = useQueryClient();
  const store = useMemo(
    () => createKnownPublicCardsStore(queryClient, environment),
    [environment, queryClient],
  );

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
