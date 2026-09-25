import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../../../util/social/socialServiceTelemetry';
import { mapFeedItem } from '../../../FeedView/utils/mapFeedItem';
import type { TraderFeedRow } from '../../../FeedView/hooks/useTraderFeed';
import { wrapLiveFeedPosts } from '../mocks/wrapLiveFeedPosts';
import type { SocialV1TokenFeedState } from '../types';
import {
  buildTokenFeedQueryKey,
  fetchTokenFeedPage,
  type TokenFeedTarget,
} from './tokenFeedQueries';

const IDLE_KEY = ['SocialService:fetchTokenFeed', 'idle'] as const;

const EMPTY_POSTS: SocialV1TokenFeedState['posts'] = [];

/**
 * Loads `GET /v1/tokens/:chain/:contractAddress/feed` for the hot-token chip
 * the Social V1 carousel has selected.
 *
 * `target` is null when nothing is selected or the chip has no contract
 * (perp-only). The query stays disabled in that case so the rest of the feed
 * keeps its existing source.
 */
export const useSocialV1TokenFeed = (
  target: TokenFeedTarget | null,
): SocialV1TokenFeedState => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => (target ? buildTokenFeedQueryKey(target) : IDLE_KEY),
    [target],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      if (!target) {
        return Promise.resolve({
          items: [],
          pagination: { olderCursor: null, newerCursor: null },
        } satisfies FeedResponse);
      }
      return fetchTokenFeedPage(target, pageParam);
    },
    getNextPageParam: (lastPage: FeedResponse) =>
      lastPage.pagination?.olderCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(target) && isUnlocked,
    retry: false,
  });

  const pages = query.data?.pages;

  const posts = useMemo(() => {
    if (!target || !pages || pages.length === 0) {
      return EMPTY_POSTS;
    }
    const rows = pages
      .flatMap((page) => page.items ?? [])
      .map((core) => {
        const item = mapFeedItem(core);
        return item ? { item, core } : null;
      })
      .filter((row): row is TraderFeedRow => row !== null);
    return wrapLiveFeedPosts(rows);
  }, [pages, target]);

  const error = query.error ?? null;
  useLogSocialQueryError(error, {
    surface: 'trader_feed',
    operation: 'fetch_token_feed',
    extraMessage: 'Social V1 token feed fetch failed',
    source: 'useSocialV1TokenFeed',
    endpoint: 'feed',
    queryParams: target
      ? { chain: target.chain, contractAddress: target.contractAddress }
      : undefined,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError, refetch } =
    query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  const refresh = useCallback(async () => {
    if (!target) {
      return;
    }
    queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKey, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: old.pageParams.slice(0, 1),
          }
        : old,
    );
    await refetch();
  }, [queryClient, queryKey, refetch, target]);

  return {
    posts,
    isLoading: Boolean(target) && query.isLoading,
    isFetchingNextPage: Boolean(target) && isFetchingNextPage,
    hasNextPage: Boolean(target) && hasNextPage === true && !isError,
    loadMore,
    error: target ? formatSocialQueryErrorMessage(error) : null,
    refresh,
  };
};
