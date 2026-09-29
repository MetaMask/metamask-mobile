import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import { getTraderFeedNextPageParam } from '../../FeedView/hooks/traderFeedQueries';
import type { TraderFeedRow } from '../../FeedView/hooks/useTraderFeed';
import { mapFeedItem } from '../../FeedView/utils/mapFeedItem';
import { wrapLiveFeedPosts } from '../../SocialV1View/feed/mocks/wrapLiveFeedPosts';
import type { SocialV1FeedPost } from '../../SocialV1View/feed/types';
import {
  buildMyProfileFeedQueryKey,
  fetchMyProfileFeedPage,
} from './myProfileFeedQueries';

export interface UseMyProfilePostsResult {
  posts: SocialV1FeedPost[];
  rows: TraderFeedRow[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_ROWS: TraderFeedRow[] = [];

export const useMyProfilePosts = (
  addressOrId: string | undefined,
): UseMyProfilePostsResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => buildMyProfileFeedQueryKey(addressOrId ?? ''),
    [addressOrId],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      fetchMyProfileFeedPage(addressOrId as string, pageParam),
    getNextPageParam: getTraderFeedNextPageParam,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(addressOrId) && isUnlocked,
    // Avoid focus/reconnect refetch racing enabled:false after auto-lock (see useTopTraders).
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const pages = query.data?.pages ?? undefined;

  const rows = useMemo(() => {
    if (!pages || pages.length === 0) {
      return EMPTY_ROWS;
    }
    return pages
      .flatMap((page) => page.items ?? [])
      .map((core) => {
        const item = mapFeedItem(core);
        return item ? { item, core } : null;
      })
      .filter((row): row is TraderFeedRow => row !== null);
  }, [pages]);

  const posts = useMemo(
    () => wrapLiveFeedPosts(rows, query.dataUpdatedAt || Date.now()),
    [query.dataUpdatedAt, rows],
  );

  const error = query.error ?? null;
  useLogSocialQueryError(error, {
    surface: 'trader_feed',
    operation: 'fetch_trader_feed',
    extraMessage: 'My profile posts fetch failed',
    source: 'useMyProfilePosts',
    endpoint: 'feed',
    queryParams: {
      addressOrId: addressOrId ?? '',
      commentedOnly: 'true',
    },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError, refetch } =
    query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage]);

  const refresh = useCallback(async () => {
    queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKey, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: old.pageParams.slice(0, 1),
          }
        : old,
    );
    await refetch();
  }, [queryClient, queryKey, refetch]);

  return {
    posts,
    rows,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the skeleton.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    isLoading: query.isInitialLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage === true && !isError,
    loadMore,
    error: formatSocialQueryErrorMessage(error),
    refresh,
  };
};
