import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
  SocialFeedRealtimeScope,
} from '@metamask/social-controllers';
import isEqual from 'lodash/isEqual';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Engine from '../../../../core/Engine';
import type { SocialV1FeedPost, TraderFeedRow } from '../types';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';
import {
  createSocialFeedEntrances,
  type SocialFeedEntrances,
} from './socialFeedEntrances';
import {
  SOCIAL_FEED_REALTIME_BUFFER_SIZE,
  SOCIAL_FEED_REVEAL_BATCH_SIZE,
  SOCIAL_FEED_REVEAL_INTERVAL_MS,
  applyRealtimeEventToRow,
  countPendingNewPosts,
  foldRealtimeRows,
  getVisiblePendingNewCount,
  mergeRealtimeRows,
  rememberEvictedRevision,
  toRealtimeEventPost,
  type PendingRealtimeEvent,
  type SocialFeedRow,
} from './socialFeedRealtime';

export interface SocialFeedRealtimeState {
  /** New posts waiting behind the pill; 0 while they flow straight in. */
  pendingNewCount: number;
  /** Applies every held-back post at once. */
  revealPending: () => void;
  entrances: SocialFeedEntrances;
}

export interface UseSocialFeedRealtimeInput {
  /** Server rows, newest first. */
  rows: TraderFeedRow[];
  dataUpdatedAt: number | undefined;
  /** Reloads the first server page. */
  refresh: () => Promise<void>;
}

export interface UseSocialFeedRealtimeOptions {
  /** `null` turns realtime off and passes nothing through. */
  realtimeScope: SocialFeedRealtimeScope | null;
  /** False while the feed is disabled (unfocused, offline, locked). */
  active: boolean;
  paused: boolean;
  nearTop: boolean;
  /** Holds new posts behind the pill even at the top. */
  holdNewPosts: boolean;
  filterPost?: (post: SocialV1FeedPost) => boolean;
}

export interface UseSocialFeedRealtimeResult {
  /** Merged and filtered posts. Posts of socket rows carry `realtimeEventId`. */
  posts: SocialV1FeedPost[];
  realtime: SocialFeedRealtimeState;
}

interface RealtimeStore {
  /** Posts known only from the socket, newest first. */
  socketRows: SocialFeedRow[];
  /** Socket revisions of server-loaded posts, by feed item id. */
  revisedRows: Map<string, SocialFeedRow>;
  /** Held-back events, by feed item id, in arrival order. */
  pending: Map<string, PendingRealtimeEvent>;
  /** Socket-only posts dropped from the list, with their last revision. */
  evicted: Map<string, number>;
}

type RealtimeView = Omit<RealtimeStore, 'evicted'>;

interface CachedFeedPost {
  core: CoreFeedItem;
  item: TraderFeedRow['item'];
  now: number;
  post: SocialV1FeedPost;
}

const createStore = (): RealtimeStore => ({
  socketRows: [],
  revisedRows: new Map(),
  pending: new Map(),
  evicted: new Map(),
});

const EMPTY_POSTS: SocialV1FeedPost[] = [];
const EMPTY_ROWS_BY_ID: ReadonlyMap<string, TraderFeedRow> = new Map();
const noop = () => undefined;

/**
 * Merges socket events into the server rows of `useSocialFeed`.
 *
 * New posts flow in at the top while the list sits there and is live, and are
 * held behind `pendingNewCount` otherwise. Updates to posts already shown are
 * held the same way and applied silently. Socket-only posts are capped at
 * {@link SOCIAL_FEED_REALTIME_BUFFER_SIZE}; going over the cap, a reconnect,
 * or becoming active again schedules a catch-up refresh, run once the list is
 * at the top and live. Rows survive while inactive.
 */
export const useSocialFeedRealtime = (
  { rows, dataUpdatedAt, refresh }: UseSocialFeedRealtimeInput,
  {
    realtimeScope,
    active,
    paused,
    nearTop,
    holdNewPosts,
    filterPost,
  }: UseSocialFeedRealtimeOptions,
): UseSocialFeedRealtimeResult | null => {
  const isLive = realtimeScope !== null && active;
  const storeRef = useRef<RealtimeStore>(createStore());
  const [view, setView] = useState<RealtimeView>(() => ({
    socketRows: [],
    revisedRows: new Map(),
    pending: new Map(),
  }));
  const [drainVersion, setDrainVersion] = useState(0);
  const [revealRequested, setRevealRequested] = useState(false);
  const [catchUpVersion, setCatchUpVersion] = useState(0);
  const [entrances] = useState(createSocialFeedEntrances);
  const postCache = useRef(new Map<string, CachedFeedPost>());

  const serverRowsById = useMemo(
    () =>
      realtimeScope
        ? new Map(rows.map((row) => [row.core.positionId, row]))
        : EMPTY_ROWS_BY_ID,
    [realtimeScope, rows],
  );

  const serverRowsByIdRef = useRef(serverRowsById);
  serverRowsByIdRef.current = serverRowsById;
  const scopeRef = useRef(realtimeScope);
  scopeRef.current = realtimeScope;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const nearTopRef = useRef(nearTop);
  nearTopRef.current = nearTop;
  const holdNewPostsRef = useRef(holdNewPosts);
  holdNewPostsRef.current = holdNewPosts;
  const filterPostRef = useRef(filterPost);
  filterPostRef.current = filterPost;
  const dataUpdatedAtRef = useRef(dataUpdatedAt);
  dataUpdatedAtRef.current = dataUpdatedAt;

  const publish = useCallback(() => {
    const { socketRows, revisedRows, pending } = storeRef.current;
    setView({ socketRows, revisedRows, pending: new Map(pending) });
  }, []);

  const catchUpPendingRef = useRef(false);
  const refreshingRef = useRef(false);
  const markCatchUp = useCallback(() => {
    catchUpPendingRef.current = true;
    setCatchUpVersion((version) => version + 1);
  }, []);

  // Events the old filter rejected were dropped, so widening it needs the
  // server rows again.
  const previousFilterPostRef = useRef(filterPost);
  useEffect(() => {
    if (previousFilterPostRef.current === filterPost) {
      return;
    }
    previousFilterPostRef.current = filterPost;
    markCatchUp();
  }, [filterPost, markCatchUp]);

  /** Applies one event to the store. Returns whether the rows changed. */
  const applyEvent = useCallback(
    (event: SocialFeedEvent, animate: boolean): boolean => {
      const store = storeRef.current;
      const { feedItemId } = event;
      const serverRow = serverRowsByIdRef.current.get(feedItemId);

      if (serverRow) {
        store.evicted.delete(feedItemId);
        const previous = store.revisedRows.get(feedItemId);
        const knownRevision = previous?.revision ?? serverRow.core.revision;
        if (knownRevision !== undefined && knownRevision >= event.revision) {
          return false;
        }
        const next = applyRealtimeEventToRow(
          serverRow,
          event,
          previous,
          animate,
        );
        if (!next) {
          return false;
        }
        store.revisedRows = new Map(store.revisedRows).set(feedItemId, next);
        return true;
      }

      const socketIndex = store.socketRows.findIndex(
        (row) => row.feedItemId === feedItemId,
      );
      if (socketIndex >= 0) {
        const previous = store.socketRows[socketIndex];
        if (
          previous.revision !== undefined &&
          previous.revision >= event.revision
        ) {
          return false;
        }
        const next = applyRealtimeEventToRow(
          undefined,
          event,
          previous,
          animate,
        );
        if (!next) {
          return false;
        }
        store.socketRows = store.socketRows.map((row, index) =>
          index === socketIndex ? next : row,
        );
        return true;
      }

      if (store.evicted.has(feedItemId)) {
        rememberEvictedRevision(store.evicted, feedItemId, event.revision);
        return false;
      }

      const next = applyRealtimeEventToRow(
        undefined,
        event,
        undefined,
        animate,
      );
      if (!next) {
        return false;
      }
      const socketRows = [next, ...store.socketRows];
      if (socketRows.length > SOCIAL_FEED_REALTIME_BUFFER_SIZE) {
        socketRows
          .slice(SOCIAL_FEED_REALTIME_BUFFER_SIZE)
          .forEach((dropped) => {
            if (dropped.revision !== undefined) {
              rememberEvictedRevision(
                store.evicted,
                dropped.feedItemId,
                dropped.revision,
              );
            }
          });
        markCatchUp();
      }
      store.socketRows = socketRows.slice(0, SOCIAL_FEED_REALTIME_BUFFER_SIZE);
      return true;
    },
    [markCatchUp],
  );

  const queuePending = useCallback(
    (event: SocialFeedEvent, isNew: boolean) => {
      const { pending } = storeRef.current;
      const previous = pending.get(event.feedItemId);
      if (previous && previous.event.revision >= event.revision) {
        return;
      }
      pending.set(event.feedItemId, {
        event,
        isNew: previous?.isNew === true || isNew,
      });

      const newIds = Array.from(pending.entries())
        .filter(([, held]) => held.isNew)
        .map(([feedItemId]) => feedItemId);
      const overflow = newIds.length - SOCIAL_FEED_REALTIME_BUFFER_SIZE;
      if (overflow > 0) {
        newIds
          .slice(0, overflow)
          .forEach((feedItemId) => pending.delete(feedItemId));
        markCatchUp();
      }
      publish();
    },
    [markCatchUp, publish],
  );

  const handleEvent = useCallback(
    (event: SocialFeedEvent, eventScope: SocialFeedRealtimeScope) => {
      if (eventScope !== scopeRef.current) {
        return;
      }
      const store = storeRef.current;
      const { feedItemId } = event;
      const isKnown =
        serverRowsByIdRef.current.has(feedItemId) ||
        store.socketRows.some((row) => row.feedItemId === feedItemId);

      if (!isKnown && store.evicted.has(feedItemId)) {
        rememberEvictedRevision(store.evicted, feedItemId, event.revision);
        return;
      }

      const filter = filterPostRef.current;
      if (!isKnown && filter) {
        const post = toRealtimeEventPost(
          event,
          dataUpdatedAtRef.current ?? Date.now(),
        );
        if (!post || !filter(post)) {
          return;
        }
      }

      if (
        pausedRef.current ||
        !nearTopRef.current ||
        (!isKnown && holdNewPostsRef.current)
      ) {
        queuePending(event, !isKnown);
        return;
      }

      if (applyEvent(event, !isKnown)) {
        publish();
      }
    },
    [applyEvent, publish, queuePending],
  );

  const lastScopeRef = useRef<SocialFeedRealtimeScope | null>(null);
  useEffect(() => {
    if (realtimeScope === null) {
      return;
    }
    if (
      lastScopeRef.current !== null &&
      lastScopeRef.current !== realtimeScope
    ) {
      storeRef.current = createStore();
      publish();
    }
    lastScopeRef.current = realtimeScope;
  }, [publish, realtimeScope]);

  useEffect(() => {
    if (!realtimeScope || !active) {
      return undefined;
    }
    const realtimeService = Engine.context.SocialRealtimeService;
    if (!realtimeService) {
      return undefined;
    }

    let cancelled = false;
    const removeListener = realtimeService.addListener(handleEvent);
    const removeReconnectListener =
      realtimeService.addReconnectListener(markCatchUp);
    realtimeService
      .setScopes([realtimeScope])
      .then(() => (cancelled ? undefined : realtimeService.setActive(true)))
      .catch(noop);
    return () => {
      cancelled = true;
      removeListener();
      removeReconnectListener();
      realtimeService.setActive(false).catch(noop);
    };
  }, [active, handleEvent, markCatchUp, realtimeScope]);

  // Coming back (focus, network, remount) with loaded rows: catch up on what
  // the socket missed. A first load without rows fetches on its own.
  const wasLiveRef = useRef(false);
  useEffect(() => {
    if (
      isLive &&
      !wasLiveRef.current &&
      dataUpdatedAtRef.current !== undefined
    ) {
      markCatchUp();
    }
    wasLiveRef.current = isLive;
  }, [isLive, markCatchUp]);

  useEffect(() => {
    if (
      !catchUpPendingRef.current ||
      !isLive ||
      paused ||
      !nearTop ||
      refreshingRef.current
    ) {
      return;
    }
    catchUpPendingRef.current = false;
    refreshingRef.current = true;
    refresh()
      .catch(noop)
      .finally(() => {
        refreshingRef.current = false;
        if (catchUpPendingRef.current) {
          setCatchUpVersion((version) => version + 1);
        }
      });
  }, [catchUpVersion, isLive, nearTop, paused, refresh]);

  useEffect(() => {
    if (!realtimeScope) {
      return;
    }
    const store = storeRef.current;
    serverRowsById.forEach((_row, feedItemId) =>
      store.evicted.delete(feedItemId),
    );
    const folded = foldRealtimeRows(
      store.socketRows,
      store.revisedRows,
      serverRowsById,
    );
    if (!folded.changed) {
      return;
    }
    store.socketRows = folded.socketRows;
    store.revisedRows = folded.revisedRows;
    publish();
  }, [publish, realtimeScope, serverRowsById]);

  useEffect(() => {
    const { pending } = storeRef.current;
    if (!realtimeScope) {
      return undefined;
    }
    const canDrain = revealRequested || (!paused && nearTop);
    const drainNew = revealRequested || !holdNewPosts;
    const drainable = canDrain
      ? Array.from(pending.entries()).filter(
          ([, held]) => drainNew || !held.isNew,
        )
      : [];
    if (drainable.length === 0) {
      if (revealRequested) {
        setRevealRequested(false);
      }
      return undefined;
    }

    const batch = revealRequested
      ? drainable
      : drainable.slice(0, SOCIAL_FEED_REVEAL_BATCH_SIZE);
    // A reveal plays one entrance, on the newest new post.
    const animatedRevealIndex = revealRequested
      ? batch.reduce(
          (lastIndex, [, held], index) => (held.isNew ? index : lastIndex),
          -1,
        )
      : -1;
    batch.forEach(([feedItemId, held], index) => {
      applyEvent(
        held.event,
        revealRequested ? index === animatedRevealIndex : held.isNew,
      );
      pending.delete(feedItemId);
    });

    if (revealRequested) {
      // Both updates share the transition: clearing the request before the
      // view lands would count the revealed posts behind the pill again.
      startTransition(() => {
        publish();
        setRevealRequested(false);
      });
      return undefined;
    }
    publish();
    if (drainable.length <= batch.length) {
      return undefined;
    }
    const nextBatchTimer = setTimeout(
      () => setDrainVersion((version) => version + 1),
      SOCIAL_FEED_REVEAL_INTERVAL_MS,
    );
    return () => clearTimeout(nextBatchTimer);
  }, [
    applyEvent,
    drainVersion,
    holdNewPosts,
    nearTop,
    paused,
    publish,
    realtimeScope,
    revealRequested,
  ]);

  // A played entrance only matters while its row stays in the realtime layer.
  useEffect(() => {
    const eventIds = new Set<string>();
    view.socketRows.forEach((row) => {
      if (row.realtimeEventId) {
        eventIds.add(row.realtimeEventId);
      }
    });
    view.revisedRows.forEach((row) => {
      if (row.realtimeEventId) {
        eventIds.add(row.realtimeEventId);
      }
    });
    entrances.retain(eventIds);
  }, [entrances, view.revisedRows, view.socketRows]);

  const mergedRows = useMemo(
    () =>
      realtimeScope
        ? mergeRealtimeRows({
            serverRows: rows,
            socketRows: view.socketRows,
            revisedRows: view.revisedRows,
            pending: view.pending,
          })
        : [],
    [realtimeScope, rows, view.pending, view.revisedRows, view.socketRows],
  );

  const posts = useMemo(() => {
    if (!realtimeScope) {
      return EMPTY_POSTS;
    }
    const now = dataUpdatedAt ?? Date.now();
    const activeIds = new Set(mergedRows.map((row) => row.stableId));
    const nextPosts = mergedRows.map((row) => {
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
      const rebuilt = row.realtimeEventId
        ? { ...mappedPost, realtimeEventId: row.realtimeEventId }
        : mappedPost;
      // A refresh hands back new objects for rows that did not change, and a
      // new post object re-renders its whole row.
      const post =
        cached && isEqual(cached.post, rebuilt) ? cached.post : rebuilt;
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

    return filterPost ? nextPosts.filter(filterPost) : nextPosts;
  }, [dataUpdatedAt, filterPost, mergedRows, realtimeScope]);

  const pendingNewCount = useMemo(
    () =>
      countPendingNewPosts(
        view.pending,
        filterPost,
        dataUpdatedAt ?? Date.now(),
      ),
    [dataUpdatedAt, filterPost, view.pending],
  );
  const visiblePendingNewCount = getVisiblePendingNewCount(
    pendingNewCount,
    paused || holdNewPosts,
    nearTop,
    revealRequested,
  );

  const revealPending = useCallback(() => {
    setRevealRequested(true);
  }, []);

  const realtime = useMemo<SocialFeedRealtimeState>(
    () => ({
      pendingNewCount: visiblePendingNewCount,
      revealPending,
      entrances,
    }),
    [entrances, revealPending, visiblePendingNewCount],
  );

  return realtimeScope ? { posts, realtime } : null;
};
