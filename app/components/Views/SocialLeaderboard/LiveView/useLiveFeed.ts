import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { useSocialFeed } from '../../../UI/SocialFeed/data/useSocialFeed';
import type {
  SocialV1FeedPost,
  TraderFeedRow,
} from '../../../UI/SocialFeed/types';
import { mapFeedItem } from '../../../UI/SocialFeed/utils/mapFeedItem';
import { toSocialFeedPosts } from '../../../UI/SocialFeed/utils/toSocialFeedPosts';
import type { SocialFeedSource } from '../../../UI/SocialFeed/data/socialFeedSource';

export const LIVE_FEED_BUFFER_SIZE = 60;
const LIVE_FEED_PAGE_SIZE = 30;

const LIVE_FEED_SOURCE: SocialFeedSource = {
  kind: 'all',
  audience: 'all',
  scope: 'all',
};

type RealtimeRow = TraderFeedRow & {
  realtimeEventId: string;
  feedItemId: string;
  revision: number;
};

const isCompleteTrade = (
  value: unknown,
): value is CoreFeedItem['trades'][number] =>
  typeof value === 'object' &&
  value !== null &&
  'direction' in value &&
  'intent' in value &&
  'tokenAmount' in value &&
  'usdCost' in value &&
  'timestamp' in value &&
  'transactionHash' in value;

/**
 * Realtime events carry a compact hydrated payload. The HTTP snapshot remains
 * authoritative for presentation fields; the event supplies identity and
 * revision metadata and replaces any fields that are complete in both shapes.
 */
export const mergeRealtimeFeedItem = (
  current: CoreFeedItem,
  event: SocialFeedEvent,
): CoreFeedItem => {
  const trades = event.data.metadata.trades.filter(isCompleteTrade);

  return {
    ...current,
    positionId: event.data.itemId,
    timestamp: event.data.timestamp,
    trades: trades.length > 0 ? trades : current.trades,
    eventId: event.eventId,
    revision: event.revision,
    occurredAt: event.occurredAt,
  };
};

export interface UseLiveFeedResult {
  posts: SocialV1FeedPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  error: string | null;
  refresh: () => Promise<void>;
  realtimeEventIds: ReadonlyMap<string, string>;
  markRealtimeEventAnimated: (eventId: string) => void;
  pendingNewCount: number;
}

export interface UseLiveFeedOptions {
  enabled?: boolean;
  paused?: boolean;
  nearTop?: boolean;
}

export const useLiveFeed = ({
  enabled = true,
  paused = false,
  nearTop = true,
}: UseLiveFeedOptions = {}): UseLiveFeedResult => {
  const isFocused = useIsFocused();
  const realtimeService = Engine.context.SocialRealtimeService;
  const [realtimeRows, setRealtimeRows] = useState<RealtimeRow[]>([]);
  const pendingEvents = useRef(new Map<string, SocialFeedEvent>());

  const feed = useSocialFeed(LIVE_FEED_SOURCE, {
    enabled: enabled && isFocused,
    pageSize: LIVE_FEED_PAGE_SIZE,
    maxPages: 2,
  });
  const { refresh } = feed;
  const rowsRef = useRef(feed.rows);
  rowsRef.current = feed.rows;
  const pausedRef = useRef(paused);
  const nearTopRef = useRef(nearTop);
  pausedRef.current = paused;
  nearTopRef.current = nearTop;

  const [pendingNewCount, setPendingNewCount] = useState(0);
  const queuePendingEvent = useCallback((event: SocialFeedEvent) => {
    const previous = pendingEvents.current.get(event.feedItemId);
    if (previous && previous.revision >= event.revision) {
      return;
    }
    pendingEvents.current.set(event.feedItemId, event);
    while (pendingEvents.current.size > LIVE_FEED_BUFFER_SIZE) {
      const oldest = pendingEvents.current.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      pendingEvents.current.delete(oldest);
    }
    setPendingNewCount(pendingEvents.current.size);
  }, []);

  const applyEvent = useCallback(
    (event: SocialFeedEvent, row: TraderFeedRow) => {
      const item = mapFeedItem(mergeRealtimeFeedItem(row.core, event));
      if (!item) {
        return;
      }

      setRealtimeRows((existing) => {
        const previous = existing.find(
          (candidate) => candidate.feedItemId === event.feedItemId,
        );
        if (previous && previous.revision >= event.revision) {
          return existing;
        }

        const next: RealtimeRow = {
          item,
          core: mergeRealtimeFeedItem(row.core, event),
          realtimeEventId: event.eventId,
          feedItemId: event.feedItemId,
          revision: event.revision,
        };
        return [
          next,
          ...existing.filter(
            (candidate) =>
              candidate.feedItemId !== event.feedItemId &&
              candidate.item.id !== item.id,
          ),
        ].slice(0, LIVE_FEED_BUFFER_SIZE);
      });
    },
    [],
  );

  const handleRealtimeEvent = useCallback(
    (event: SocialFeedEvent, scope: string) => {
      if (scope !== 'all') {
        return;
      }

      if (pausedRef.current || !nearTopRef.current) {
        queuePendingEvent(event);
        return;
      }

      const row = rowsRef.current.find(
        (candidate) => candidate.core.positionId === event.feedItemId,
      );
      if (row) {
        applyEvent(event, row);
        return;
      }

      queuePendingEvent(event);
      refresh().catch(() => undefined);
    },
    [applyEvent, queuePendingEvent, refresh],
  );

  useEffect(() => {
    if (!enabled || !isFocused || !realtimeService) {
      setRealtimeRows((existing) => (existing.length === 0 ? existing : []));
      return undefined;
    }

    const removeListener = realtimeService.addListener(handleRealtimeEvent);
    const removeReconnectListener = realtimeService.addReconnectListener(() => {
      refresh().catch(() => undefined);
    });
    realtimeService.setActive(true).catch(() => undefined);
    return () => {
      removeListener();
      removeReconnectListener();
      setRealtimeRows([]);
      realtimeService.setActive(false).catch(() => undefined);
    };
  }, [enabled, handleRealtimeEvent, isFocused, realtimeService, refresh]);

  useEffect(() => {
    if (
      paused ||
      !nearTop ||
      feed.rows.length === 0 ||
      pendingEvents.current.size === 0
    ) {
      return;
    }
    for (const [feedItemId, event] of pendingEvents.current) {
      const row = feed.rows.find(
        (candidate) => candidate.core.positionId === feedItemId,
      );
      if (!row) {
        continue;
      }
      applyEvent(event, row);
      pendingEvents.current.delete(feedItemId);
    }
    setPendingNewCount(pendingEvents.current.size);
  }, [applyEvent, feed.rows, nearTop, paused]);

  const rows = useMemo(() => {
    const byPositionId = new Map(
      feed.rows.map((row) => [row.core.positionId, row]),
    );
    realtimeRows.forEach((row) => byPositionId.set(row.core.positionId, row));
    return [...byPositionId.values()]
      .sort((a, b) => b.item.timestamp - a.item.timestamp)
      .slice(0, LIVE_FEED_BUFFER_SIZE);
  }, [feed.rows, realtimeRows]);

  const posts = useMemo(
    () => toSocialFeedPosts(rows, feed.dataUpdatedAt ?? Date.now()),
    [feed.dataUpdatedAt, rows],
  );
  const realtimeEventIds = useMemo(
    () =>
      new Map(realtimeRows.map((row) => [row.item.id, row.realtimeEventId])),
    [realtimeRows],
  );

  return {
    posts,
    isLoading: feed.isLoading,
    isFetchingNextPage: feed.isFetchingNextPage,
    hasNextPage: feed.hasNextPage,
    loadMore: feed.loadMore,
    error: feed.error,
    refresh: feed.refresh,
    realtimeEventIds,
    markRealtimeEventAnimated: () => undefined,
    pendingNewCount,
  };
};
