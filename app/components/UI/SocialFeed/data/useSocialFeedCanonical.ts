import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { useSocialFeed } from './useSocialFeed';
import type { SocialV1FeedPost, TraderFeedRow } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';
import type { SocialFeedSource } from './socialFeedSource';
import {
  createSocialFeedEntrances,
  type SocialFeedEntrances,
} from './socialFeedEntrances';

export const SOCIAL_FEED_BUFFER_SIZE = 60;
const SOCIAL_FEED_PAGE_SIZE = 30;
const SOCIAL_FEED_REVEAL_BATCH_SIZE = 2;
const SOCIAL_FEED_REVEAL_INTERVAL_MS = 16;

export interface SocialFeedRow extends TraderFeedRow {
  stableId: string;
  sortTimestamp: number;
  realtimeEventId?: string;
  feedItemId: string;
  revision?: number;
}

interface PendingRealtimeEvent {
  event: SocialFeedEvent;
  animate: boolean;
}

interface CachedFeedPost {
  core: CoreFeedItem;
  item: TraderFeedRow['item'];
  now: number;
  post: SocialV1FeedPost;
}

export type SocialFeedScope = 'all' | 'trending' | 'following';

export const toSocialFeedSource = (
  scope: SocialFeedScope,
): SocialFeedSource => ({
  kind: 'all',
  audience: scope === 'following' ? 'following' : 'all',
  scope,
});

/**
 * Full realtime events are normalized by Core and can hydrate a row without
 * an HTTP snapshot. An existing HTTP row is still used to preserve any
 * client-side enrichment that the event does not carry.
 */
export const mergeRealtimeFeedItem = (
  current: CoreFeedItem | undefined,
  event: SocialFeedEvent,
): CoreFeedItem =>
  ({
    ...(current ?? {}),
    ...event.data,
    eventId: event.eventId,
    revision: event.revision,
    occurredAt: event.occurredAt,
  }) as CoreFeedItem;

export const toSocialFeedRow = (row: TraderFeedRow): SocialFeedRow => ({
  ...row,
  stableId: row.item.id,
  sortTimestamp: row.item.timestamp,
  feedItemId: row.core.positionId,
});

export const getVisiblePendingNewCount = (
  pendingNewCount: number,
  paused: boolean,
  nearTop: boolean,
): number => (paused || !nearTop ? pendingNewCount : 0);

export const shouldDeferPendingNewRow = (
  pending: Pick<PendingRealtimeEvent, 'animate'> | undefined,
): boolean => pending?.animate === true;

export const applyRealtimeEventToRow = (
  row: TraderFeedRow | undefined,
  event: SocialFeedEvent,
  previous: SocialFeedRow | undefined,
  animate: boolean,
): SocialFeedRow | null => {
  const mergedCore = mergeRealtimeFeedItem(row?.core, event);
  const mappedItem = mapFeedItem(mergedCore);
  if (!mappedItem) {
    return null;
  }

  const stableId = previous?.stableId ?? row?.item.id ?? mappedItem.id;

  return {
    item: {
      ...mappedItem,
      id: stableId,
    },
    core: mergedCore,
    stableId,
    sortTimestamp:
      previous?.sortTimestamp ?? row?.item.timestamp ?? mappedItem.timestamp,
    realtimeEventId: previous
      ? previous.realtimeEventId
      : animate
        ? event.eventId
        : undefined,
    feedItemId: event.feedItemId,
    revision: event.revision,
  };
};

export interface UseSocialFeedCanonicalResult {
  /** Posts of realtime rows carry the `realtimeEventId` of their entrance. */
  posts: SocialV1FeedPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  error: string | null;
  refresh: () => Promise<void>;
  entrances: SocialFeedEntrances;
  pendingNewCount: number;
}

export interface UseSocialFeedCanonicalOptions {
  enabled?: boolean;
  paused?: boolean;
  nearTop?: boolean;
  scope?: SocialFeedScope;
  realtime?: boolean;
}

export const useSocialFeedCanonical = ({
  enabled = true,
  paused = false,
  nearTop = true,
  scope = 'all',
  realtime = false,
}: UseSocialFeedCanonicalOptions = {}): UseSocialFeedCanonicalResult => {
  const isFocused = useIsFocused();
  const realtimeService = Engine.context.SocialRealtimeService;
  const [realtimeRows, setRealtimeRows] = useState<SocialFeedRow[]>([]);
  const pendingEvents = useRef(new Map<string, PendingRealtimeEvent>());
  const postCache = useRef(new Map<string, CachedFeedPost>());
  const [entrances] = useState(createSocialFeedEntrances);

  const source = useMemo(() => toSocialFeedSource(scope), [scope]);
  const realtimeEnabled = realtime && scope !== 'following';
  const realtimeScope = scope === 'trending' ? 'trending' : 'all';
  const feed = useSocialFeed(source, {
    enabled: enabled && isFocused,
    pageSize: SOCIAL_FEED_PAGE_SIZE,
    ...(realtimeEnabled ? { maxPages: 2 } : {}),
  });
  const { refresh } = feed;
  const rowsRef = useRef(feed.rows);
  rowsRef.current = feed.rows;
  const pausedRef = useRef(paused);
  const nearTopRef = useRef(nearTop);
  pausedRef.current = paused;
  nearTopRef.current = nearTop;

  const [pendingNewCount, setPendingNewCount] = useState(0);
  const [pendingDrainVersion, setPendingDrainVersion] = useState(0);
  const queuePendingEvent = useCallback(
    (event: SocialFeedEvent, animate: boolean) => {
      const previous = pendingEvents.current.get(event.feedItemId);
      if (previous && previous.event.revision >= event.revision) {
        return;
      }
      pendingEvents.current.set(event.feedItemId, {
        event,
        animate: previous?.animate || animate,
      });
      while (pendingEvents.current.size > SOCIAL_FEED_BUFFER_SIZE) {
        const oldest = pendingEvents.current.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        pendingEvents.current.delete(oldest);
      }
      setPendingNewCount(pendingEvents.current.size);
    },
    [],
  );

  const applyEvent = useCallback(
    (
      event: SocialFeedEvent,
      row: TraderFeedRow | undefined,
      animate: boolean,
    ) => {
      setRealtimeRows((existing) => {
        const previous = existing.find(
          (candidate) => candidate.feedItemId === event.feedItemId,
        );
        if (previous && previous.revision !== undefined) {
          if (previous.revision >= event.revision) {
            return existing;
          }
        }

        const next = applyRealtimeEventToRow(row, event, previous, animate);
        if (!next) {
          return existing;
        }

        return [
          next,
          ...existing.filter(
            (candidate) => candidate.feedItemId !== event.feedItemId,
          ),
        ].slice(0, SOCIAL_FEED_BUFFER_SIZE);
      });
    },
    [],
  );

  const handleRealtimeEvent = useCallback(
    (event: SocialFeedEvent, eventScope: string) => {
      if (!realtimeEnabled || eventScope !== scope) {
        return;
      }

      const row = rowsRef.current.find(
        (candidate) => candidate.core.positionId === event.feedItemId,
      );

      if (pausedRef.current || !nearTopRef.current) {
        queuePendingEvent(event, !row);
        return;
      }

      if (row) {
        applyEvent(event, row, false);
        return;
      }

      applyEvent(event, undefined, true);
    },
    [applyEvent, queuePendingEvent, realtimeEnabled, scope],
  );

  useEffect(() => {
    if (!enabled || !isFocused || !realtimeEnabled || !realtimeService) {
      setRealtimeRows((existing) => (existing.length === 0 ? existing : []));
      return undefined;
    }

    const removeListener = realtimeService.addListener(handleRealtimeEvent);
    const removeReconnectListener = realtimeService.addReconnectListener(() => {
      refresh().catch(() => undefined);
    });
    realtimeService
      .setScopes([realtimeScope])
      .then(() => realtimeService.setActive(true))
      .catch(() => undefined);
    return () => {
      removeListener();
      removeReconnectListener();
      setRealtimeRows([]);
      realtimeService.setActive(false).catch(() => undefined);
    };
  }, [
    enabled,
    handleRealtimeEvent,
    isFocused,
    realtimeEnabled,
    realtimeScope,
    realtimeService,
    refresh,
  ]);

  useEffect(() => {
    if (paused || !nearTop || pendingEvents.current.size === 0) {
      return undefined;
    }

    const batch = Array.from(pendingEvents.current.entries()).slice(
      0,
      SOCIAL_FEED_REVEAL_BATCH_SIZE,
    );
    for (const [feedItemId, pending] of batch) {
      const row = feed.rows.find(
        (candidate) => candidate.core.positionId === feedItemId,
      );
      applyEvent(pending.event, row, pending.animate);
      pendingEvents.current.delete(feedItemId);
    }
    setPendingNewCount(pendingEvents.current.size);

    if (pendingEvents.current.size === 0) {
      return undefined;
    }

    const nextBatchTimer = setTimeout(
      () => setPendingDrainVersion((version) => version + 1),
      SOCIAL_FEED_REVEAL_INTERVAL_MS,
    );
    return () => clearTimeout(nextBatchTimer);
  }, [applyEvent, feed.rows, nearTop, paused, pendingDrainVersion]);

  const rows = useMemo(() => {
    const byPositionId = new Map<string, SocialFeedRow>();
    feed.rows.forEach((row) => {
      if (
        pendingNewCount > 0 &&
        shouldDeferPendingNewRow(pendingEvents.current.get(row.core.positionId))
      ) {
        return;
      }

      const liveRow = toSocialFeedRow(row);
      byPositionId.set(liveRow.core.positionId, liveRow);
    });
    realtimeRows.forEach((row) => byPositionId.set(row.core.positionId, row));
    return [...byPositionId.values()]
      .sort((a, b) => b.sortTimestamp - a.sortTimestamp)
      .slice(0, SOCIAL_FEED_BUFFER_SIZE);
  }, [feed.rows, pendingNewCount, realtimeRows]);

  const posts = useMemo(() => {
    const now = feed.dataUpdatedAt ?? Date.now();
    const activeIds = new Set(rows.map((row) => row.stableId));
    const nextPosts = rows.map((row) => {
      const cached = postCache.current.get(row.stableId);
      if (
        cached &&
        cached.core === row.core &&
        cached.item === row.item &&
        cached.now === now &&
        cached.post.realtimeEventId === row.realtimeEventId
      ) {
        return cached.post;
      }

      const [mappedPost] = toSocialFeedPosts([row], now);
      const post = row.realtimeEventId
        ? { ...mappedPost, realtimeEventId: row.realtimeEventId }
        : mappedPost;
      postCache.current.set(row.stableId, {
        core: row.core,
        item: row.item,
        now,
        post,
      });
      return post;
    });

    postCache.current.forEach((_cached, id) => {
      if (!activeIds.has(id)) {
        postCache.current.delete(id);
      }
    });

    return nextPosts;
  }, [feed.dataUpdatedAt, rows]);
  const visiblePendingNewCount = getVisiblePendingNewCount(
    pendingNewCount,
    paused,
    nearTop,
  );
  // A played entrance only matters while its row stays in the realtime buffer.
  useEffect(() => {
    entrances.retain(
      new Set(
        realtimeRows.flatMap((row) =>
          row.realtimeEventId ? [row.realtimeEventId] : [],
        ),
      ),
    );
  }, [entrances, realtimeRows]);

  return {
    posts,
    isLoading: feed.isLoading,
    isFetchingNextPage: feed.isFetchingNextPage,
    hasNextPage: feed.hasNextPage,
    loadMore: feed.loadMore,
    error: feed.error,
    refresh: feed.refresh,
    entrances,
    pendingNewCount: visiblePendingNewCount,
  };
};
