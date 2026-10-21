import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import type { TraderFeedRow } from '../../../UI/SocialFeed/types';
import { mapFeedItem } from '../../../UI/SocialFeed/utils/mapFeedItem';
import {
  applyRealtimeEventToRow,
  mergeRealtimeFeedItem,
  toLiveFeedRow,
} from './useLiveFeed';

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
    itemId: 'position-1',
    timestamp: 200,
    cardLatestTradeAt: 200,
    actor: {
      type: 'user',
      address: '0x1',
      name: 'Trader',
      images: {},
      profile: { id: 'profile-1', metadata: {} },
    },
    metadata: {
      tokenChain: 'base',
      tokenAddress: '0xtoken',
      trades: [{ intent: 'enter', comments: [] }],
    },
  },
} as unknown as SocialFeedEvent;

describe('mergeRealtimeFeedItem', () => {
  it('preserves HTTP presentation fields while applying event revision metadata', () => {
    const merged = mergeRealtimeFeedItem(current, event);

    expect(merged).toMatchObject({
      positionId: 'position-1',
      timestamp: 200,
      eventId: 'event-2',
      revision: 2,
      occurredAt: '2026-01-01T00:00:02.000Z',
    });
    expect(merged.trades).toEqual([]);
  });

  it('preserves Live identity and ordering while applying an existing row revision', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const liveRow = toLiveFeedRow(row);
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
});
