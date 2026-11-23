import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  selectSocialLeaderboardEnabled,
  selectSocialLeaderboardPerpsEnabled,
} from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { HYPERLIQUID_CAIP2_CHAIN_ID } from '../../SocialFeed/data/feed-constants';
import {
  FEED_PAGE_LIMIT,
  buildSocialFeedQueryKey,
  fetchSocialFeedPage,
  getSocialFeedNextPageParam,
} from '../../SocialFeed/data/socialFeedQueries';
import {
  toFeedAssetId,
  toSocialFeedRequest,
} from '../../SocialFeed/data/socialFeedSource';
import { HYPERLIQUID_CHAIN_NAME } from '../../SocialFeed/utils/perp';
import {
  buildTokenHoldersQueryKey,
  fetchTokenHoldersPage,
  getTokenHoldersNextPageParam,
} from '../../TokenDetails/components/tabs/holders/tokenHoldersQueries';

/** Wait for the screen to settle so the prefetch never races the first paint. */
const PREFETCH_DELAY_MS = 1500;

/**
 * How long a prefetched page stays fresh, matching the API's `max-age=60`.
 * Without it the tab's own observer sees stale data and refetches on mount.
 */
const PREFETCH_STALE_TIME_MS = 60_000;

interface UsePerpsSocialTabsPrefetchParams {
  symbol: string | undefined;
  /** Asset ids of the Perps feed query. `null` when the market has no feed. */
  feedAssetIds: readonly CaipAssetType[] | null;
  /** Social tabs are mounted on this screen. */
  enabled: boolean;
}

/**
 * Warms the first page of the Feed and Holders tabs while the user is on
 * Overview, so opening either tab shows rows instead of a skeleton.
 *
 * Deliberately cheap: it runs once per market, after a short delay, fetches
 * only page 1, and writes into the same cache entries the tabs read. Skipped on LOW hardware, when offline and on a slow cellular link, per
 * the device-capability UX matrix. The two tiers are checked separately; an
 * unknown (`null`) tier is not treated as LOW or offline.
 */
export const usePerpsSocialTabsPrefetch = ({
  symbol,
  feedAssetIds,
  enabled,
}: UsePerpsSocialTabsPrefetchParams): void => {
  const queryClient = useQueryClient();
  const isUnlocked = useSelector(selectIsUnlocked);
  const isLeaderboardEnabled = useSelector(selectSocialLeaderboardEnabled);
  const isLeaderboardPerpsEnabled = useSelector(
    selectSocialLeaderboardPerpsEnabled,
  );
  const networkTier = useNetworkTier();
  const isNetworkUsable =
    networkTier !== 'NONE' && networkTier !== 'SLOW_CELLULAR';
  const isLowHardware = getHardwareTier() === 'LOW';
  const shouldPrefetchHolders =
    isLeaderboardEnabled && isLeaderboardPerpsEnabled;

  useEffect(() => {
    if (
      !enabled ||
      !isUnlocked ||
      !isNetworkUsable ||
      isLowHardware ||
      !symbol
    ) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      const prefetches: Promise<unknown>[] = [];
      const feedRequest = feedAssetIds
        ? toSocialFeedRequest({
            scope: 'all',
            chains: [HYPERLIQUID_CAIP2_CHAIN_ID],
            assetIds: feedAssetIds,
          })
        : null;
      if (feedRequest) {
        const queryKey = buildSocialFeedQueryKey(feedRequest, FEED_PAGE_LIMIT);
        queryClient.setQueryDefaults(queryKey, {
          staleTime: PREFETCH_STALE_TIME_MS,
        });
        prefetches.push(
          queryClient.infiniteQuery({
            queryKey,
            queryFn: async ({ pageParam }: { pageParam?: string }) =>
              fetchSocialFeedPage(feedRequest, FEED_PAGE_LIMIT, pageParam),
            initialPageParam: undefined as string | undefined,
            getNextPageParam: getSocialFeedNextPageParam,
            staleTime: PREFETCH_STALE_TIME_MS,
            pages: 1,
          }),
        );
      }

      const holdersAssetId = shouldPrefetchHolders
        ? toFeedAssetId({
            chain: HYPERLIQUID_CHAIN_NAME,
            tokenAddress: symbol,
          })
        : null;
      if (holdersAssetId) {
        const queryKey = buildTokenHoldersQueryKey(holdersAssetId);
        queryClient.setQueryDefaults(queryKey, {
          staleTime: PREFETCH_STALE_TIME_MS,
        });
        prefetches.push(
          queryClient.infiniteQuery({
            queryKey,
            queryFn: async ({
              pageParam,
              signal,
            }: {
              pageParam: number;
              signal: AbortSignal;
            }) =>
              fetchTokenHoldersPage(holdersAssetId, {
                page: pageParam,
                signal,
              }),
            initialPageParam: 1,
            getNextPageParam: getTokenHoldersNextPageParam,
            staleTime: PREFETCH_STALE_TIME_MS,
            pages: 1,
          }),
        );
      }

      // A failed prefetch is not an error: the tab fetches when it opens.
      void Promise.allSettled(prefetches);
    }, PREFETCH_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    enabled,
    feedAssetIds,
    isLowHardware,
    isNetworkUsable,
    isUnlocked,
    queryClient,
    shouldPrefetchHolders,
    symbol,
  ]);
};
