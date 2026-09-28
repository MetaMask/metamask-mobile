import { useMemo } from 'react';
import type { SocialV1FeedPost, UseSocialV1HotTokensResult } from '../types';
import {
  pinSelectedHotToken,
  rankFeedHotTokens,
} from '../utils/rankFeedHotTokens';

/**
 * Hot-token rail for the loaded feed: the assets that show up most often,
 * capped at ten. Derived from the posts already on screen, so it moves as
 * further pages arrive and needs no separate ranking endpoint.
 */
export const useSocialV1HotTokens = (
  posts: readonly SocialV1FeedPost[],
  isLoading = false,
  selectedTokenId: string | null = null,
): UseSocialV1HotTokensResult =>
  useMemo(() => {
    const waitingForFirstPage = isLoading && posts.length === 0;

    return {
      tokens: waitingForFirstPage
        ? []
        : pinSelectedHotToken(rankFeedHotTokens(posts), posts, selectedTokenId),
      isLoading: waitingForFirstPage,
      error: null,
    };
  }, [isLoading, posts, selectedTokenId]);
