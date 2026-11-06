import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import { mockSpotFeedItem } from '../mocks/coreFeed.mock';
import type { SocialV1FeedPost, TraderFeedRow } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import {
  SOCIAL_FEED_REALTIME_BUFFER_SIZE,
  applyRealtimeEventToRow,
  countPendingNewPosts,
  foldRealtimeRows,
  getVisiblePendingNewCount,
  mergeRealtimeFeedItem,
  mergeRealtimeRows,
  rememberEvictedRevision,
  shouldDeferPendingNewRow,
  toRealtimeEventPost,
  toSocialFeedRow,
  type PendingRealtimeEvent,
  type SocialFeedRow,
} from './socialFeedRealtime';
import { FEED_PAGE_LIMIT } from './socialFeedQueries';

const buildRow = (overrides: Partial<CoreFeedItem> = {}): TraderFeedRow => {
  const core = mockSpotFeedItem(overrides);
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('Expected the feed item to map');
  }
  return { core, item };
};

const buildEvent = (
  overrides: Partial<Omit<SocialFeedEvent, 'data'>> & {
    data?: Partial<CoreFeedItem>;
  } = {},
): SocialFeedEvent => {
  const { data, ...rest } = overrides;
  const feedItemId = rest.feedItemId ?? data?.positionId ?? 'pos-spot-1';
  return {
    version: 1,
    kind: 'feed-item',
    eventId: 'event-1',
    revision: 1,
    occurredAt: '2026-01-01T00:00:01.000Z',
    ...rest,
    feedItemId,
    data: mockSpotFeedItem({ positionId: feedItemId, ...data }),
  };
};

const buildSocketRow = (event: SocialFeedEvent): SocialFeedRow => {
  const row = applyRealtimeEventToRow(undefined, event, undefined, true);
  if (!row) {
    throw new Error('Expected the event to map');
  }
  return row;
};

describe('socialFeedRealtime', () => {
  it('keeps the buffer below the page size so a catch-up covers evictions', () => {
    expect(SOCIAL_FEED_REALTIME_BUFFER_SIZE).toBeLessThan(FEED_PAGE_LIMIT);
  });

  describe('mergeRealtimeFeedItem', () => {
    it('preserves HTTP fields while applying event revision metadata', () => {
      const current = mockSpotFeedItem({ commentCount: 4 });
      const event = buildEvent({
        eventId: 'event-2',
        revision: 2,
        data: { timestamp: 1_700_000_200 },
      });

      const merged = mergeRealtimeFeedItem(current, event);

      expect(merged).toMatchObject({
        positionId: 'pos-spot-1',
        timestamp: 1_700_000_200,
        commentCount: 4,
        eventId: 'event-2',
        revision: 2,
        occurredAt: '2026-01-01T00:00:01.000Z',
      });
    });

    it('normalizes a full event without an HTTP row', () => {
      const event = buildEvent({ eventId: 'event-2', revision: 2 });

      const merged = mergeRealtimeFeedItem(undefined, event);

      expect(merged).toMatchObject({
        positionId: 'pos-spot-1',
        tokenSymbol: 'PEPE',
        eventId: 'event-2',
        revision: 2,
      });
    });
  });

  describe('applyRealtimeEventToRow', () => {
    it('preserves identity and ordering while revising a loaded row', () => {
      const row = buildRow();
      const liveRow = toSocialFeedRow(row);
      const event = buildEvent({
        eventId: 'event-2',
        revision: 2,
        data: { timestamp: 1_700_000_200 },
      });

      const revised = applyRealtimeEventToRow(row, event, liveRow, false);

      expect(revised).toMatchObject({
        stableId: liveRow.stableId,
        sortTimestamp: liveRow.sortTimestamp,
        realtimeEventId: undefined,
        revision: 2,
        item: { id: liveRow.item.id, timestamp: 1_700_000_200_000 },
      });
    });

    it('carries the event ID when a new row animates in', () => {
      const event = buildEvent({ eventId: 'event-2' });

      const row = applyRealtimeEventToRow(buildRow(), event, undefined, true);

      expect(row?.realtimeEventId).toBe('event-2');
    });

    it('keeps the entrance event ID across later revisions', () => {
      const entered: SocialFeedRow = {
        ...toSocialFeedRow(buildRow()),
        realtimeEventId: 'event-1',
        revision: 1,
      };
      const event = buildEvent({ eventId: 'event-2', revision: 2 });

      const revised = applyRealtimeEventToRow(undefined, event, entered, true);

      expect(revised?.realtimeEventId).toBe('event-1');
      expect(revised?.revision).toBe(2);
    });
  });

  describe('getVisiblePendingNewCount', () => {
    it('hides the count while live at the top', () => {
      expect(getVisiblePendingNewCount(1, false, true)).toBe(0);
      expect(getVisiblePendingNewCount(1, true, true)).toBe(1);
      expect(getVisiblePendingNewCount(1, false, false)).toBe(1);
    });

    it('hides the count while held posts are being revealed', () => {
      expect(getVisiblePendingNewCount(6, true, true, true)).toBe(0);
    });
  });

  it('defers the server row only while a new post is held', () => {
    expect(shouldDeferPendingNewRow({ isNew: true })).toBe(true);
    expect(shouldDeferPendingNewRow({ isNew: false })).toBe(false);
    expect(shouldDeferPendingNewRow(undefined)).toBe(false);
  });

  it('keeps the evicted revision ledger bounded and monotonic', () => {
    const ledger = new Map<string, number>();

    rememberEvictedRevision(ledger, 'pos-0', 3);
    rememberEvictedRevision(ledger, 'pos-0', 2);
    const keptRevision = ledger.get('pos-0');
    for (let index = 1; index <= SOCIAL_FEED_REALTIME_BUFFER_SIZE; index++) {
      rememberEvictedRevision(ledger, `pos-${index}`, index);
    }

    expect(keptRevision).toBe(3);
    expect(ledger.has('pos-0')).toBe(false);
    expect(ledger.get(`pos-${SOCIAL_FEED_REALTIME_BUFFER_SIZE}`)).toBe(
      SOCIAL_FEED_REALTIME_BUFFER_SIZE,
    );
    expect(ledger.size).toBe(SOCIAL_FEED_REALTIME_BUFFER_SIZE);
  });

  it('maps an event to the post it would render as', () => {
    const event = buildEvent({ data: { positionId: 'pos-new' } });

    const post = toRealtimeEventPost(event, 1_700_000_000_000);

    expect(post?.position?.positionId).toBe('pos-new');
  });

  describe('foldRealtimeRows', () => {
    it('moves socket rows the server now returns out of the socket list', () => {
      const socketRow = buildSocketRow(
        buildEvent({ data: { positionId: 'pos-a', revision: 1 } }),
      );
      const serverRow = buildRow({ positionId: 'pos-a', revision: 1 });

      const folded = foldRealtimeRows(
        [socketRow],
        new Map(),
        new Map([['pos-a', serverRow]]),
      );

      expect(folded.changed).toBe(true);
      expect(folded.socketRows).toEqual([]);
      expect(folded.revisedRows.size).toBe(0);
    });

    it('keeps a socket copy newer than the server copy as a revision', () => {
      const socketRow = buildSocketRow(
        buildEvent({ feedItemId: 'pos-a', revision: 3 }),
      );
      const serverRow = buildRow({ positionId: 'pos-a', revision: 2 });

      const folded = foldRealtimeRows(
        [socketRow],
        new Map(),
        new Map([['pos-a', serverRow]]),
      );

      expect(folded.socketRows).toEqual([]);
      expect(folded.revisedRows.get('pos-a')).toBe(socketRow);
    });

    it('forgets revisions the server caught up with or no longer loads', () => {
      const caughtUp = buildSocketRow(
        buildEvent({ feedItemId: 'pos-a', revision: 2 }),
      );
      const unloaded = buildSocketRow(
        buildEvent({ feedItemId: 'pos-b', revision: 2 }),
      );

      const folded = foldRealtimeRows(
        [],
        new Map([
          ['pos-a', caughtUp],
          ['pos-b', unloaded],
        ]),
        new Map([['pos-a', buildRow({ positionId: 'pos-a', revision: 2 })]]),
      );

      expect(folded.changed).toBe(true);
      expect(folded.revisedRows.size).toBe(0);
    });

    it('reports no change when nothing folds', () => {
      const socketRow = buildSocketRow(buildEvent({ feedItemId: 'pos-a' }));

      const folded = foldRealtimeRows([socketRow], new Map(), new Map());

      expect(folded.changed).toBe(false);
      expect(folded.socketRows).toEqual([socketRow]);
    });
  });

  describe('mergeRealtimeRows', () => {
    it('sorts server and socket rows newest first', () => {
      const older = buildRow({ positionId: 'pos-old', timestamp: 100 });
      const newer = buildSocketRow(
        buildEvent({ feedItemId: 'pos-new', data: { timestamp: 200 } }),
      );

      const merged = mergeRealtimeRows({
        serverRows: [older],
        socketRows: [newer],
        revisedRows: new Map(),
        pending: new Map(),
      });

      expect(merged.map((row) => row.feedItemId)).toEqual([
        'pos-new',
        'pos-old',
      ]);
    });

    it('applies revisions to server rows', () => {
      const server = buildRow({ positionId: 'pos-a', revision: 1 });
      const revised = applyRealtimeEventToRow(
        server,
        buildEvent({ feedItemId: 'pos-a', revision: 2, eventId: 'event-2' }),
        undefined,
        false,
      );
      if (!revised) {
        throw new Error('Expected the event to map');
      }

      const merged = mergeRealtimeRows({
        serverRows: [server],
        socketRows: [],
        revisedRows: new Map([['pos-a', revised]]),
        pending: new Map(),
      });

      expect(merged).toEqual([revised]);
    });

    it('hides the server row of a new post held behind the pill', () => {
      const server = buildRow({ positionId: 'pos-a' });
      const held: PendingRealtimeEvent = {
        event: buildEvent({ feedItemId: 'pos-a' }),
        isNew: true,
      };

      const merged = mergeRealtimeRows({
        serverRows: [server],
        socketRows: [],
        revisedRows: new Map(),
        pending: new Map([['pos-a', held]]),
      });

      expect(merged).toEqual([]);
    });

    it('prefers a socket copy only when newer than the server copy', () => {
      const server = buildRow({ positionId: 'pos-a', revision: 2 });
      const stale = buildSocketRow(
        buildEvent({ feedItemId: 'pos-a', revision: 1 }),
      );

      const merged = mergeRealtimeRows({
        serverRows: [server],
        socketRows: [stale],
        revisedRows: new Map(),
        pending: new Map(),
      });

      expect(merged).toHaveLength(1);
      expect(merged[0]?.revision).toBe(2);
    });
  });

  describe('countPendingNewPosts', () => {
    const pending = new Map<string, PendingRealtimeEvent>([
      ['pos-a', { event: buildEvent({ feedItemId: 'pos-a' }), isNew: true }],
      ['pos-b', { event: buildEvent({ feedItemId: 'pos-b' }), isNew: true }],
      ['pos-c', { event: buildEvent({ feedItemId: 'pos-c' }), isNew: false }],
    ]);

    it('counts only new posts', () => {
      expect(countPendingNewPosts(pending, undefined, 0)).toBe(2);
    });

    it('counts only new posts that pass the filter', () => {
      const filterPost = jest.fn(
        (post: SocialV1FeedPost) => post.position?.positionId === 'pos-a',
      );

      const count = countPendingNewPosts(pending, filterPost, 0);

      expect(count).toBe(1);
      expect(filterPost).toHaveBeenCalledTimes(2);
    });
  });
});
