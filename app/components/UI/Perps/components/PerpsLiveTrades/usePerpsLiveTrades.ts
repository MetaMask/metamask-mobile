import { useEffect, useRef, useState } from 'react';
import {
  HYPERLIQUID_CAIP2_CHAIN_ID,
  useSocialFeed,
  type SocialFeedQuery,
  type SocialV1FeedPost,
} from '../../../SocialFeed';
import { feedItemAssetClass } from '../../../../Views/SocialLeaderboard/shell/filters/filterSocialV1FeedPosts';
import { PERPS_LIVE_TRADES_CONFIG } from '../../constants/perpsConfig';

const LIVE_TRADES_SOURCE: SocialFeedQuery = {
  scope: 'all',
  chains: [HYPERLIQUID_CAIP2_CHAIN_ID],
};

export const isLiveTradePost = (post: SocialV1FeedPost): boolean =>
  feedItemAssetClass(post.item) === 'perps' &&
  (post.item.author.winRatePercent ?? 0) >
    PERPS_LIVE_TRADES_CONFIG.MinWinRatePercent;

/**
 * Posts not shown yet, newest capped at the list size, oldest first so the
 * newest ends up on top once each is added.
 */
export const selectNewLiveTrades = (
  posts: readonly SocialV1FeedPost[],
  seenIds: ReadonlySet<string>,
): SocialV1FeedPost[] =>
  posts
    .filter((post) => !seenIds.has(post.id))
    .slice(0, PERPS_LIVE_TRADES_CONFIG.MaxTrades)
    .reverse();

export interface UsePerpsLiveTradesOptions {
  /** Streams and adds new trades only while true. */
  isActive: boolean;
}

export interface UsePerpsLiveTradesResult {
  /** Newest first, at most `MaxTrades`. */
  trades: SocialV1FeedPost[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const usePerpsLiveTrades = ({
  isActive,
}: UsePerpsLiveTradesOptions): UsePerpsLiveTradesResult => {
  const { posts, isLoading, error, refresh } = useSocialFeed(
    LIVE_TRADES_SOURCE,
    { filterPost: isLiveTradePost, realtime: isActive },
  );
  const [trades, setTrades] = useState<SocialV1FeedPost[] | null>(null);
  const [hasQueuedTrades, setHasQueuedTrades] = useState(false);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const queueRef = useRef<SocialV1FeedPost[]>([]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (seenIdsRef.current === null) {
      if (posts.length === 0) {
        return;
      }
      seenIdsRef.current = new Set(posts.map((post) => post.id));
      setTrades(posts.slice(0, PERPS_LIVE_TRADES_CONFIG.MaxTrades));
      return;
    }
    const seenIds = seenIdsRef.current;
    const newTrades = selectNewLiveTrades(posts, seenIds);
    posts.forEach((post) => seenIds.add(post.id));
    if (newTrades.length === 0) {
      return;
    }
    queueRef.current = [...queueRef.current, ...newTrades].slice(
      -PERPS_LIVE_TRADES_CONFIG.MaxTrades,
    );
    setHasQueuedTrades(true);
  }, [isLoading, posts]);

  useEffect(() => {
    if (!hasQueuedTrades || !isActive) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      const nextTrade = queueRef.current.shift();
      if (nextTrade) {
        setTrades((current) =>
          [
            nextTrade,
            ...(current ?? []).filter((trade) => trade.id !== nextTrade.id),
          ].slice(0, PERPS_LIVE_TRADES_CONFIG.MaxTrades),
        );
      }
      if (queueRef.current.length === 0) {
        setHasQueuedTrades(false);
      }
    }, PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);
    return () => clearInterval(intervalId);
  }, [hasQueuedTrades, isActive]);

  const visibleTrades =
    trades ?? posts.slice(0, PERPS_LIVE_TRADES_CONFIG.MaxTrades);

  return {
    trades: visibleTrades,
    isLoading: isLoading && visibleTrades.length === 0,
    error,
    refresh,
  };
};
