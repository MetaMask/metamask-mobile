import type { Position, Trade } from '@metamask/social-controllers';
import { mapFollowingPositionsToCandleAvatarMarkersWithLookup } from './mapFollowingPositionsToCandleAvatarMarkers';
import type { FollowingTokenPositionsResponse } from './types';

const BASE_TS = 1_700_000_000_000;

const makeTrade = (i: number): Trade =>
  ({
    intent: i % 2 ? 'exit' : 'enter',
    direction: 'buy',
    tokenAmount: 1,
    usdCost: 100,
    timestamp: BASE_TS + i * 60_000,
    transactionHash: `0x${i}`,
  }) as Trade;

const makeResponse = (tradeCount: number): FollowingTokenPositionsResponse => ({
  items: [
    {
      ...({
        positionId: 'p1',
        trades: Array.from({ length: tradeCount }, (_, i) => makeTrade(i)),
      } as unknown as Position),
      actor: {
        profileId: 'alice',
        address: '0xalice',
        name: 'Alice',
        imageUrl: 'https://cdn.example/alice.png',
      },
    },
  ],
  pagination: { hasMore: false },
});

describe('mapFollowingPositionsToCandleAvatarMarkersWithLookup', () => {
  it('returns empty values for missing data', () => {
    expect(
      mapFollowingPositionsToCandleAvatarMarkersWithLookup(undefined),
    ).toEqual({
      markers: [],
      byId: {},
    });
  });

  it('keeps every trade (no global cap) with a complete lookup', () => {
    const { markers, byId } =
      mapFollowingPositionsToCandleAvatarMarkersWithLookup(makeResponse(100));

    expect(markers).toHaveLength(100);
    expect(Object.keys(byId)).toHaveLength(100);
    for (const marker of markers) {
      expect(byId[marker.id].actor.profileId).toBe('alice');
    }
  });

  it('returns markers in chronological order with the avatar url as key', () => {
    const { markers } = mapFollowingPositionsToCandleAvatarMarkersWithLookup(
      makeResponse(5),
    );

    const times = markers.map((m) => m.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(markers[0].avatarUrl).toBe('https://cdn.example/alice.png');
  });
});
