import { useMemo } from 'react';
import { socialFeedSourceFromAsset } from '../../../SocialFeed/socialFeedSource';
import { useSocialFeed } from '../../../SocialFeed/useSocialFeed';
import type { SocialV1TokenFeedState } from '../types';
import {
  TOKEN_FEED_PAGE_LIMIT,
  type TokenFeedTarget,
} from './tokenFeedQueries';

/**
 * Loads the token feed for the hot-token chip the Social V1 carousel has
 * selected. Hyperliquid chips resolve to the perp market's feed.
 *
 * `target` is null when nothing is selected or the chip has no contract
 * (perp-only). The query stays disabled in that case so the rest of the feed
 * keeps its existing source.
 */
export const useSocialV1TokenFeed = (
  target: TokenFeedTarget | null,
): SocialV1TokenFeedState => {
  const source = useMemo(
    () =>
      target
        ? socialFeedSourceFromAsset(target.chain, target.contractAddress)
        : null,
    [target],
  );

  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialFeed(source, { pageSize: TOKEN_FEED_PAGE_LIMIT });

  return {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  };
};
