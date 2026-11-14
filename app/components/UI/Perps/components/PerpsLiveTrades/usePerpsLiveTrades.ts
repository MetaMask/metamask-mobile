import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export const isLiveTradePost = (post: SocialV1FeedPost): boolean => {
  if (feedItemAssetClass(post.item) !== 'perps') {
    return false;
  }
  const { winRatePercent } = post.item.author;
  return (
    winRatePercent !== null &&
    Number.isFinite(winRatePercent) &&
    winRatePercent > PERPS_LIVE_TRADES_CONFIG.MinWinRatePercent
  );
};

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
  isOffline: boolean;
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
  isOffline,
}: UsePerpsLiveTradesOptions): UsePerpsLiveTradesResult => {
  const { posts, isLoading, error, refresh, dataUpdatedAt } = useSocialFeed(
    LIVE_TRADES_SOURCE,
    { enabled: !isOffline, filterPost: isLiveTradePost, realtime: isActive },
  );
  const [shownIds, setShownIds] = useState<ReadonlySet<string> | null>(null);
  const [hasQueuedTrades, setHasQueuedTrades] = useState(false);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const queueRef = useRef<string[]>([]);
  const postsRef = useRef(posts);
  postsRef.current = posts;

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (seenIdsRef.current === null) {
      if (posts.length === 0) {
        return;
      }
      const ids = posts.map((post) => post.id);
      seenIdsRef.current = new Set(ids);
      setShownIds(new Set(ids));
      return;
    }
    const seenIds = seenIdsRef.current;
    const newIds = selectNewLiveTrades(posts, seenIds).map((post) => post.id);
    posts.forEach((post) => seenIds.add(post.id));
    if (newIds.length === 0) {
      return;
    }
    queueRef.current = [...queueRef.current, ...newIds].slice(
      -PERPS_LIVE_TRADES_CONFIG.MaxTrades,
    );
    setHasQueuedTrades(true);
  }, [isLoading, posts]);

  useEffect(() => {
    if (!hasQueuedTrades || !isActive || isOffline) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      const feedIds = new Set(postsRef.current.map((post) => post.id));
      const queue = queueRef.current;
      const nextIndex = queue.findIndex((id) => feedIds.has(id));
      queueRef.current = nextIndex === -1 ? [] : queue.slice(nextIndex + 1);
      if (nextIndex !== -1) {
        const revealedId = queue[nextIndex];
        setShownIds((current) => new Set(current).add(revealedId));
      }
      if (queueRef.current.length === 0) {
        setHasQueuedTrades(false);
      }
    }, PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);
    return () => clearInterval(intervalId);
  }, [hasQueuedTrades, isActive, isOffline]);

  const feedTrades = useMemo(
    () =>
      (shownIds ? posts.filter((post) => shownIds.has(post.id)) : posts).slice(
        0,
        PERPS_LIVE_TRADES_CONFIG.MaxTrades,
      ),
    [posts, shownIds],
  );
  const activeTradesRef = useRef<SocialV1FeedPost[] | null>(null);
  if (isActive) {
    activeTradesRef.current = feedTrades;
  }
  const trades = isActive
    ? feedTrades
    : (activeTradesRef.current ?? feedTrades);

  const refreshWhenOnline = useCallback(async () => {
    if (isOffline) {
      return;
    }
    await refresh();
  }, [isOffline, refresh]);

  const isAwaitingOfflineData = isOffline && dataUpdatedAt === undefined;

  return {
    trades,
    isLoading: (isLoading || isAwaitingOfflineData) && trades.length === 0,
    error,
    refresh: refreshWhenOnline,
  };
};
