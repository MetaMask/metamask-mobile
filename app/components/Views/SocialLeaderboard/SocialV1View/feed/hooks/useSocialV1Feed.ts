import { useMemo } from 'react';
import { useTraderFeed } from '../../../FeedView/hooks/useTraderFeed';
import type { UseSocialV1FeedOptions, UseSocialV1FeedResult } from '../types';
import { toSocialV1FeedItems } from '../utils/toSocialV1FeedItem';

/**
 * V1 feed data source: live trader activity from `SocialService:fetchFeed`,
 * mapped into the V1 card model with the missing enrichment mocked and flagged.
 *
 * Delegates fetching to `useTraderFeed`, so V1 inherits V0's cursor pagination,
 * unlock gate, telemetry and error normalisation -- and shares its query keys,
 * which means either surface warms the cache for the other. All this hook adds
 * is the V1 map.
 */
export const useSocialV1Feed = (
  options: UseSocialV1FeedOptions = {},
): UseSocialV1FeedResult => {
  const { audience = 'all', enabled = true } = options;

  const {
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useTraderFeed({ audience, enabled });

  const items = useMemo(() => toSocialV1FeedItems(rows), [rows]);

  return {
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  };
};
