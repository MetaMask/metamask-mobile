import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import type { TraderFeedRow } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import {
  applyRealtimeEventToRow,
  getVisiblePendingNewCount,
  mergeRealtimeFeedItem,
  rememberEvictedRevision,
  shouldDeferPendingNewRow,
  toSocialFeedSource,
  toSocialFeedRow,
} from './useSocialFeedCanonical';

const current = {
  positionId: 'position-1',
  timestamp: 100,
  trades: [],
} as unknown as CoreFeedItem;

const httpItem = {
  positionId: 'position-1',
  timestamp: 100,
  chain: 'base',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  tokenAddress: '0x0000000000000000000000000000000000000001',
  positionAmount: 1,
  isOpen: true,
  boughtUsd: null,
  soldUsd: null,
  realizedPnl: null,
  costBasis: null,
  lastTradeAt: 100,
  trades: [],
  actor: {
    profileId: 'profile-1',
    name: 'Trader',
    address: '0x0000000000000000000000000000000000000002',
    imageUrl: null,
  },
} as unknown as CoreFeedItem;

const event = {
  version: 1,
  kind: 'feed-item',
  eventId: 'event-2',
  feedItemId: 'position-1',
  revision: 2,
  occurredAt: '2026-01-01T00:00:02.000Z',
  data: {
    ...httpItem,
    timestamp: 200,
    lastTradeAt: 200,
  },
} as unknown as SocialFeedEvent;

describe('useSocialFeedCanonical helpers', () => {
  it('maps canonical scopes to HTTP feed sources', () => {
    expect(toSocialFeedSource('trending')).toEqual({
      kind: 'all',
      audience: 'all',
      scope: 'trending',
    });
    expect(toSocialFeedSource('following')).toEqual({
      kind: 'all',
      audience: 'following',
      scope: 'following',
    });
    expect(toSocialFeedSource('all')).toEqual({
      kind: 'all',
      audience: 'all',
      scope: 'all',
    });
  });

  it('preserves HTTP presentation fields while applying event revision metadata', () => {
    const merged = mergeRealtimeFeedItem(current, event);

    expect(merged).toMatchObject({
      positionId: 'position-1',
      timestamp: 200,
      eventId: 'event-2',
      revision: 2,
      occurredAt: '2026-01-01T00:00:02.000Z',
    });
    expect(merged?.trades).toEqual([]);
  });

  it('normalizes a full event without an HTTP row', () => {
    const fullEvent = {
      ...event,
      data: httpItem,
    } as unknown as SocialFeedEvent;
    const merged = mergeRealtimeFeedItem(undefined, fullEvent);

    expect(merged).toMatchObject({
      positionId: 'position-1',
      tokenSymbol: 'TKN',
      eventId: 'event-2',
      revision: 2,
    });
  });

  it('preserves Live identity and ordering while applying an existing row revision', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const liveRow = toSocialFeedRow(row);
    const revisedRow = applyRealtimeEventToRow(row, event, liveRow, false);

    expect(revisedRow).toMatchObject({
      stableId: liveRow.stableId,
      sortTimestamp: liveRow.sortTimestamp,
      realtimeEventId: undefined,
      revision: event.revision,
      item: {
        id: liveRow.item.id,
        timestamp: 200000,
      },
    });
  });

  it('retains the event ID when a pending new row enters the Live feed', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const liveRow = applyRealtimeEventToRow(row, event, undefined, true);

    expect(liveRow?.realtimeEventId).toBe(event.eventId);
  });

  it('keeps the entrance event ID of a Live row across later revisions', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const enteredRow = {
      ...toSocialFeedRow(row),
      realtimeEventId: 'event-1',
      revision: 1,
    };

    const revisedRow = applyRealtimeEventToRow(
      undefined,
      event,
      enteredRow,
      true,
    );

    expect(revisedRow?.realtimeEventId).toBe('event-1');
    expect(revisedRow?.revision).toBe(event.revision);
  });

  it('hides pending count while Live is active at the top', () => {
    expect(getVisiblePendingNewCount(1, false, true)).toBe(0);
    expect(getVisiblePendingNewCount(1, true, true)).toBe(1);
    expect(getVisiblePendingNewCount(1, false, false)).toBe(1);
  });

  it('hides pending count while queued posts are being revealed', () => {
    expect(getVisiblePendingNewCount(6, true, true, true)).toBe(0);
  });

  it('defers the HTTP row while a new realtime item is pending', () => {
    expect(shouldDeferPendingNewRow({ animate: true })).toBe(true);
    expect(shouldDeferPendingNewRow({ animate: false })).toBe(false);
    expect(shouldDeferPendingNewRow(undefined)).toBe(false);
  });

  it('keeps the evicted revision ledger bounded and monotonic', () => {
    const ledger = new Map<string, number>();

    rememberEvictedRevision(ledger, 'position-1', 3);
    rememberEvictedRevision(ledger, 'position-1', 2);
    for (let index = 2; index <= 61; index++) {
      rememberEvictedRevision(ledger, `position-${index}`, index);
    }

    expect(ledger.get('position-1')).toBeUndefined();
    expect(ledger.get('position-61')).toBe(61);
    expect(ledger.size).toBe(60);
  });
});
