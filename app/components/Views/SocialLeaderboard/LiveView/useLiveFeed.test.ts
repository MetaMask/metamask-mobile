import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import { mergeRealtimeFeedItem } from './useLiveFeed';

const current = {
  positionId: 'position-1',
  timestamp: 100,
  trades: [],
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
});
