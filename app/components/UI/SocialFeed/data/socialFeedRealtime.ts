import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import type { SocialV1FeedPost, TraderFeedRow } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';

/**
 * Most posts the realtime layer holds at once: socket-only rows in the list,
 * held-back new posts, and remembered evictions. Also the pill's "N+" cap.
 *
 * Must stay below `FEED_PAGE_LIMIT`: a catch-up refresh reloads only the
 * first page, which has to cover every socket-only post that was dropped.
 */
export const SOCIAL_FEED_REALTIME_BUFFER_SIZE = 20;

/** Held-back events applied per drain tick while the list sits at the top. */
export const SOCIAL_FEED_REVEAL_BATCH_SIZE = 2;

/** Delay between two drain ticks. */
export const SOCIAL_FEED_REVEAL_INTERVAL_MS = 16;

export interface SocialFeedRow extends TraderFeedRow {
  stableId: string;
  sortTimestamp: number;
  realtimeEventId?: string;
  feedItemId: string;
  revision?: number;
}

export interface PendingRealtimeEvent {
  event: SocialFeedEvent;
  /** True when the event announced a post the list did not have yet. */
  isNew: boolean;
}

/**
 * Records the highest revision of a socket-only post dropped from the list,
 * so a later revision does not bring it back as a new row. Holds at most
 * {@link SOCIAL_FEED_REALTIME_BUFFER_SIZE} posts, dropping the oldest.
 */
export const rememberEvictedRevision = (
  ledger: Map<string, number>,
  feedItemId: string,
  revision: number,
): void => {
  ledger.set(feedItemId, Math.max(ledger.get(feedItemId) ?? 0, revision));
  while (ledger.size > SOCIAL_FEED_REALTIME_BUFFER_SIZE) {
    const oldest = ledger.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    ledger.delete(oldest);
  }
};

/**
 * Full realtime events are normalized by Core and can hydrate a row without
 * an HTTP snapshot. An existing HTTP row is still used to preserve any
 * client-side enrichment that the event does not carry.
 */
export const mergeRealtimeFeedItem = (
  current: CoreFeedItem | undefined,
  event: SocialFeedEvent,
): CoreFeedItem => ({
  ...current,
  ...event.data,
  eventId: event.eventId,
  revision: event.revision,
  occurredAt: event.occurredAt,
});

export const toSocialFeedRow = (row: TraderFeedRow): SocialFeedRow => ({
  ...row,
  stableId: row.item.id,
  sortTimestamp: row.item.timestamp,
  feedItemId: row.core.positionId,
  revision: row.core.revision,
});

export const getVisiblePendingNewCount = (
  pendingNewCount: number,
  holding: boolean,
  nearTop: boolean,
  pendingRevealRequested = false,
): number => {
  if (pendingRevealRequested) {
    return 0;
  }

  return holding || !nearTop ? pendingNewCount : 0;
};

/** A server row stays hidden while the same post waits behind the pill. */
export const shouldDeferPendingNewRow = (
  pending: Pick<PendingRealtimeEvent, 'isNew'> | undefined,
): boolean => pending?.isNew === true;

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

/** The post an event would render as, for `filterPost`. `null` if unmappable. */
export const toRealtimeEventPost = (
  event: SocialFeedEvent,
  now: number,
): SocialV1FeedPost | null => {
  const row = applyRealtimeEventToRow(undefined, event, undefined, false);
  return row ? (toSocialFeedPosts([row], now)[0] ?? null) : null;
};

/** True when a socket copy carries a newer revision than the server copy. */
export const isNewerThanServer = (
  socketRow: Pick<SocialFeedRow, 'revision'>,
  serverRow: TraderFeedRow,
): boolean => (socketRow.revision ?? -1) > (serverRow.core.revision ?? -1);

export interface FoldedRealtimeRows {
  socketRows: SocialFeedRow[];
  revisedRows: Map<string, SocialFeedRow>;
  changed: boolean;
}

/**
 * Moves socket-only rows the server now returns out of the socket list, and
 * forgets revisions the server caught up with or no longer loads. A socket
 * copy newer than the server copy is kept as a revision of the loaded post.
 */
export const foldRealtimeRows = (
  socketRows: readonly SocialFeedRow[],
  revisedRows: ReadonlyMap<string, SocialFeedRow>,
  serverRowsById: ReadonlyMap<string, TraderFeedRow>,
): FoldedRealtimeRows => {
  let changed = false;
  const nextRevised = new Map<string, SocialFeedRow>();
  revisedRows.forEach((row, feedItemId) => {
    const serverRow = serverRowsById.get(feedItemId);
    if (serverRow && isNewerThanServer(row, serverRow)) {
      nextRevised.set(feedItemId, row);
    } else {
      changed = true;
    }
  });

  const nextSocket = socketRows.filter((row) => {
    const serverRow = serverRowsById.get(row.feedItemId);
    if (!serverRow) {
      return true;
    }
    changed = true;
    if (isNewerThanServer(row, serverRow)) {
      nextRevised.set(row.feedItemId, row);
    }
    return false;
  });

  return {
    socketRows: changed ? nextSocket : [...socketRows],
    revisedRows: nextRevised,
    changed,
  };
};

/**
 * Server rows, with their realtime revisions applied, plus socket-only rows,
 * newest first. Server rows of new posts still behind the pill stay hidden.
 */
export const mergeRealtimeRows = ({
  serverRows,
  socketRows,
  revisedRows,
  pending,
}: {
  serverRows: readonly TraderFeedRow[];
  socketRows: readonly SocialFeedRow[];
  revisedRows: ReadonlyMap<string, SocialFeedRow>;
  pending: ReadonlyMap<string, PendingRealtimeEvent>;
}): SocialFeedRow[] => {
  const byId = new Map<string, SocialFeedRow>();
  const serverById = new Map<string, TraderFeedRow>();
  serverRows.forEach((row) => {
    const feedItemId = row.core.positionId;
    serverById.set(feedItemId, row);
    if (shouldDeferPendingNewRow(pending.get(feedItemId))) {
      return;
    }
    byId.set(feedItemId, revisedRows.get(feedItemId) ?? toSocialFeedRow(row));
  });
  socketRows.forEach((row) => {
    const serverRow = serverById.get(row.feedItemId);
    if (!serverRow || isNewerThanServer(row, serverRow)) {
      byId.set(row.feedItemId, row);
    }
  });
  return [...byId.values()].sort((a, b) => b.sortTimestamp - a.sortTimestamp);
};

/** Held-back new posts that pass `filterPost`. */
export const countPendingNewPosts = (
  pending: ReadonlyMap<string, PendingRealtimeEvent>,
  filterPost: ((post: SocialV1FeedPost) => boolean) | undefined,
  now: number,
): number => {
  let count = 0;
  pending.forEach(({ event, isNew }) => {
    if (!isNew) {
      return;
    }
    if (filterPost) {
      const post = toRealtimeEventPost(event, now);
      if (!post || !filterPost(post)) {
        return;
      }
    }
    count += 1;
  });
  return count;
};
