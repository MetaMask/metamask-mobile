import type {
  AuthorComment,
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import { mockSpotFeedItem } from '../mocks/coreFeed.mock';
import type { SocialV1FeedPost, TraderFeedRow } from '../types';
import {
  buildSocialFeedListItems,
  getSocialFeedListItemKey,
} from '../utils/buildSocialFeedListItems';
import { getFeedItemId } from '../utils/feedItemId';
import { mapFeedItem } from '../utils/mapFeedItem';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';
import {
  SOCIAL_FEED_REALTIME_BUFFER_SIZE,
  applyRealtimeEventToRow,
  countPendingNewPosts,
  foldRealtimeRows,
  getRowFeedItemId,
  getRowSortTimestamp,
  getVisiblePendingNewCount,
  mergeRealtimeFeedItem,
  mergeRealtimeRows,
  pinRealtimeRows,
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

const buildCall = (
  uid: string,
  engagement: AuthorComment['engagement'] = {
    reactions: [],
    userReaction: null,
  },
): AuthorComment => ({
  uid,
  text: 'this is alpha',
  timestamp: 1_700_000_000,
  engagement,
});

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

    it('carries the envelope feed item id onto the merged item', () => {
      const event = buildEvent({
        feedItemId: 'item-comment',
        data: { positionId: 'pos-spot-1' },
      });

      const merged = mergeRealtimeFeedItem(undefined, event);

      expect(getFeedItemId(merged)).toBe('item-comment');
    });

    it('keys socket-only cards of one position apart in the list', () => {
      const data = { positionId: 'pos-spot-1' };
      const posts = [
        buildEvent({ feedItemId: 'item-trade', eventId: 'event-1', data }),
        buildEvent({ feedItemId: 'item-comment', eventId: 'event-2', data }),
      ].map((event) => {
        const [post] = toSocialFeedPosts([buildSocketRow(event)], 0);
        return post;
      });

      const keys = buildSocialFeedListItems(posts, []).map(
        getSocialFeedListItemKey,
      );

      expect(keys).toEqual(['item-trade', 'item-comment']);
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

    it('clears the rest authorComment when the realtime copy carries a null authorComment', () => {
      const restCall = buildCall('call-rest');
      const current = mockSpotFeedItem({ authorComment: restCall });
      const event = buildEvent({ data: { authorComment: null } });

      const merged = mergeRealtimeFeedItem(current, event);

      expect(merged.authorComment).toBeNull();
    });

    it('keeps the rest authorComment when the realtime copy omits authorComment', () => {
      const restCall = buildCall('call-rest');
      const current = mockSpotFeedItem({ authorComment: restCall });
      const event = buildEvent();

      const merged = mergeRealtimeFeedItem(current, event);

      expect(event.data).not.toHaveProperty('authorComment');
      expect(merged.authorComment).toEqual(restCall);
    });

    it('takes the realtime authorComment when it carries a Call', () => {
      const restCall = buildCall('call-rest');
      const realtimeCall = buildCall('call-realtime');
      const current = mockSpotFeedItem({ authorComment: restCall });
      const event = buildEvent({ data: { authorComment: realtimeCall } });

      const merged = mergeRealtimeFeedItem(current, event);

      expect(merged.authorComment).toEqual(realtimeCall);
    });

    it('keeps known userReaction while accepting realtime engagement', () => {
      const knownEngagement = {
        reactions: [{ emotion: '👍', count: 1, profiles: [] }],
        userReaction: '👍',
      };
      const knownCall = buildCall('call-shared', knownEngagement);
      const realtimeCall = buildCall('call-shared', {
        reactions: [{ emotion: '🔥', count: 2, profiles: [] }],
        userReaction: null,
      });
      const current = mockSpotFeedItem({ authorComment: knownCall });
      const event = buildEvent({ data: { authorComment: realtimeCall } });

      const merged = mergeRealtimeFeedItem(current, event);

      expect(merged.authorComment).toEqual({
        ...realtimeCall,
        engagement: {
          ...realtimeCall.engagement,
          userReaction: knownEngagement.userReaction,
        },
      });
    });
  });

  describe('toSocialFeedRow', () => {
    it('keys a row on the feed item id the HTTP feed returns', () => {
      const row = buildRow({
        positionId: 'pos-a',
        feedItemId: 'item-a',
      } as Partial<CoreFeedItem>);

      const live = toSocialFeedRow(row);

      expect(live.feedItemId).toBe('item-a');
      expect(live.stableId).toBe('item-a');
    });

    it('keys a row on its position when the feed returns no item id', () => {
      const row = buildRow({ positionId: 'pos-a' });

      const live = toSocialFeedRow(row);

      expect(live.feedItemId).toBe('pos-a');
      expect(live.stableId).toBe(row.item.id);
    });

    it('gives two items of one position distinct identities', () => {
      const comment = buildRow({
        positionId: 'pos-a',
        feedItemId: 'item-comment',
      } as Partial<CoreFeedItem>);
      const trade = buildRow({
        positionId: 'pos-a',
        feedItemId: 'item-trade',
      } as Partial<CoreFeedItem>);

      const merged = mergeRealtimeRows({
        serverRows: [comment, trade],
        socketRows: [],
        revisedRows: new Map(),
        pending: new Map(),
      });

      expect(merged.map((row) => row.stableId)).toEqual([
        'item-comment',
        'item-trade',
      ]);
    });
  });

  describe('getRowFeedItemId', () => {
    it('prefers the feed item id over the position id', () => {
      expect(
        getRowFeedItemId(
          buildRow({ feedItemId: 'item-a' } as Partial<CoreFeedItem>),
        ),
      ).toBe('item-a');
    });
  });

  describe('getRowSortTimestamp', () => {
    it('places a row at the time the server placed it', () => {
      const row = buildRow({
        timestamp: 1_700_000_000,
        occurredAt: '2026-01-01T00:00:00.000Z',
      });

      expect(getRowSortTimestamp(row)).toBe(
        Date.parse('2026-01-01T00:00:00.000Z'),
      );
    });

    it('falls back to the latest trade when the row has no placement', () => {
      const row = buildRow({ timestamp: 1_700_000_000 });

      expect(getRowSortTimestamp(row)).toBe(row.item.timestamp);
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

    it('identifies a socket-only row by its feed item id', () => {
      const row = buildSocketRow(buildEvent({ feedItemId: 'item-new' }));

      expect(row.stableId).toBe('item-new');
      expect(row.item.id).toBe('item-new');
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
      expect(folded.revisedRows.get('pos-a')).toEqual(socketRow);
    });

    it('clears the rest authorComment when a promoted socket copy carries a null authorComment', () => {
      const restCall = buildCall('call-rest');
      const socketRow = buildSocketRow(
        buildEvent({
          feedItemId: 'pos-a',
          revision: 3,
          data: { authorComment: null },
        }),
      );
      const serverRow = buildRow({
        positionId: 'pos-a',
        revision: 2,
        authorComment: restCall,
      });

      const folded = foldRealtimeRows(
        [socketRow],
        new Map(),
        new Map([['pos-a', serverRow]]),
      );

      expect(folded.revisedRows.get('pos-a')?.core.authorComment).toBeNull();
    });

    it('keeps the rest authorComment when a promoted socket copy omits authorComment', () => {
      const restCall = buildCall('call-rest');
      const socketRow = buildSocketRow(
        buildEvent({ feedItemId: 'pos-a', revision: 3 }),
      );
      const serverRow = buildRow({
        positionId: 'pos-a',
        revision: 2,
        authorComment: restCall,
      });

      const folded = foldRealtimeRows(
        [socketRow],
        new Map(),
        new Map([['pos-a', serverRow]]),
      );

      expect(folded.revisedRows.get('pos-a')?.core.authorComment).toEqual(
        restCall,
      );
    });

    it('uses refreshed server engagement for a promoted socket copy', () => {
      const serverCall = buildCall('call-shared', {
        reactions: [{ emotion: '👍', count: 1, profiles: [] }],
        userReaction: '👍',
      });
      const socketCall = buildCall('call-shared', {
        reactions: [{ emotion: '🔥', count: 2, profiles: [] }],
        userReaction: null,
      });
      const socketRow = buildSocketRow(
        buildEvent({
          feedItemId: 'pos-a',
          revision: 3,
          data: { authorComment: socketCall },
        }),
      );
      const serverRow = buildRow({
        positionId: 'pos-a',
        revision: 2,
        authorComment: serverCall,
      });

      const folded = foldRealtimeRows(
        [socketRow],
        new Map(),
        new Map([['pos-a', serverRow]]),
      );

      expect(
        folded.revisedRows.get('pos-a')?.core.authorComment?.engagement,
      ).toEqual(serverCall.engagement);
    });

    it('refreshes engagement on a newer revised row from the server copy', () => {
      const staleCall = buildCall('call-shared', {
        reactions: [{ emotion: '🔥', count: 2, profiles: [] }],
        userReaction: null,
      });
      const liveCall = buildCall('call-shared', {
        reactions: [{ emotion: '👍', count: 1, profiles: [] }],
        userReaction: '👍',
      });
      const revisedRow = buildSocketRow(
        buildEvent({
          feedItemId: 'pos-a',
          revision: 3,
          data: { authorComment: staleCall },
        }),
      );
      const serverRow = buildRow({
        positionId: 'pos-a',
        revision: 2,
        authorComment: liveCall,
      });

      const folded = foldRealtimeRows(
        [],
        new Map([['pos-a', revisedRow]]),
        new Map([['pos-a', serverRow]]),
      );

      expect(
        folded.revisedRows.get('pos-a')?.core.authorComment?.engagement,
      ).toEqual(liveCall.engagement);
      expect(folded.changed).toBe(true);
    });

    it('keeps live socket counts while the server engagement is unchanged', () => {
      const serverRow = buildRow({
        positionId: 'pos-a',
        revision: 2,
        authorComment: buildCall('call-shared', {
          reactions: [{ emotion: '👍', count: 1, profiles: [] }],
          userReaction: '👍',
        }),
      });
      const revisedRow = applyRealtimeEventToRow(
        serverRow,
        buildEvent({
          feedItemId: 'pos-a',
          revision: 3,
          data: {
            authorComment: buildCall('call-shared', {
              reactions: [{ emotion: '👍', count: 4, profiles: [] }],
              userReaction: null,
            }),
          },
        }),
        undefined,
        false,
      );
      if (!revisedRow) {
        throw new Error('Expected the event to map');
      }

      const folded = foldRealtimeRows(
        [],
        new Map([['pos-a', revisedRow]]),
        new Map([['pos-a', serverRow]]),
      );

      expect(folded.revisedRows.get('pos-a')).toBe(revisedRow);
      expect(revisedRow.core.authorComment?.engagement).toEqual({
        reactions: [{ emotion: '👍', count: 4, profiles: [] }],
        userReaction: '👍',
      });
      expect(folded.changed).toBe(false);
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

  describe('pinRealtimeRows', () => {
    const rowAt = (
      feedItemId: string,
      sortTimestamp: number,
    ): SocialFeedRow => ({
      ...buildSocketRow(buildEvent({ feedItemId })),
      sortTimestamp,
    });
    const order = (rows: SocialFeedRow[]): [string, number][] =>
      rows.map((row) => [row.feedItemId, row.sortTimestamp]);

    it('keeps own keys on the first placement', () => {
      const rows = [rowAt('pos-b', 200), rowAt('pos-a', 100)];

      const pinned = pinRealtimeRows(rows, new Map());

      expect(order(pinned.rows)).toEqual([
        ['pos-b', 200],
        ['pos-a', 100],
      ]);
      expect([...pinned.placed]).toEqual([
        ['pos-b', 200],
        ['pos-a', 100],
      ]);
    });

    it('keeps a shown row in place when its key moves forward', () => {
      const placed = new Map([
        ['pos-b', 200],
        ['pos-a', 100],
      ]);

      const pinned = pinRealtimeRows(
        [rowAt('pos-a', 300), rowAt('pos-b', 200)],
        placed,
      );

      expect(order(pinned.rows)).toEqual([
        ['pos-b', 200],
        ['pos-a', 100],
      ]);
    });

    it('raises a late row that would land between shown rows above the top', () => {
      const placed = new Map([
        ['pos-c', 300],
        ['pos-a', 100],
      ]);

      const pinned = pinRealtimeRows(
        [rowAt('pos-c', 300), rowAt('pos-b', 200), rowAt('pos-a', 100)],
        placed,
      );

      expect(order(pinned.rows)).toEqual([
        ['pos-b', 301],
        ['pos-c', 300],
        ['pos-a', 100],
      ]);
      expect(pinned.placed.get('pos-b')).toBe(301);
    });

    it('raises several late rows above the top in their own order', () => {
      const placed = new Map([['pos-top', 500]]);

      const pinned = pinRealtimeRows(
        [
          rowAt('pos-newer', 520),
          rowAt('pos-top', 500),
          rowAt('pos-late', 500),
          rowAt('pos-later', 510),
        ],
        placed,
      );

      expect(order(pinned.rows)).toEqual([
        ['pos-newer', 520],
        ['pos-later', 510],
        ['pos-late', 501],
        ['pos-top', 500],
      ]);
    });

    it('keeps own keys for rows older than everything shown', () => {
      const placed = new Map([['pos-shown', 500]]);
      const older = rowAt('pos-older', 100);

      const pinned = pinRealtimeRows([rowAt('pos-shown', 500), older], placed);

      expect(pinned.rows[1]).toBe(older);
    });

    it('forgets rows no longer present', () => {
      const placed = new Map([
        ['pos-gone', 900],
        ['pos-a', 100],
      ]);

      const pinned = pinRealtimeRows([rowAt('pos-a', 100)], placed);

      expect([...pinned.placed]).toEqual([['pos-a', 100]]);
    });

    it('returns the same placement when pinned again', () => {
      const rows = [
        rowAt('pos-c', 300),
        rowAt('pos-b', 200),
        rowAt('pos-a', 100),
      ];
      const first = pinRealtimeRows(
        rows,
        new Map([
          ['pos-c', 300],
          ['pos-a', 100],
        ]),
      );

      const second = pinRealtimeRows(rows, first.placed);

      expect(order(second.rows)).toEqual(order(first.rows));
      expect(second.placed).toEqual(first.placed);
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
