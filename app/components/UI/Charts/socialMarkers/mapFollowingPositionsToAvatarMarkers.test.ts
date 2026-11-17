import type { Position, Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import {
  DEFAULT_MAX_AVATAR_MARKERS,
  mapFollowingPositionsToAvatarMarkers,
} from './mapFollowingPositionsToAvatarMarkers';
import type { FollowingTokenPositionsResponse } from './types';

const BASE_TS = 1_700_000_000_000; // ms epoch
const INTERVAL = 60_000; // 1 minute

const makePrices = (n: number): TokenPrice[] =>
  Array.from({ length: n }, (_, i) => [
    String(BASE_TS + i * INTERVAL),
    100 + i,
  ]) as TokenPrice[];

const makeTrade = (overrides: Partial<Trade> = {}): Trade =>
  ({
    intent: 'enter',
    direction: 'buy',
    tokenAmount: 1,
    usdCost: 100,
    timestamp: BASE_TS + 2 * INTERVAL,
    transactionHash: '0xabc',
    ...overrides,
  }) as Trade;

const makePosition = (trades: Trade[]): Position =>
  ({ positionId: 'p1', trades }) as unknown as Position;

const makeResponse = (
  traders: {
    profileId: string;
    name: string;
    imageUrl?: string | null;
    trades: Trade[];
  }[],
): FollowingTokenPositionsResponse => ({
  items: traders.map((t) => ({
    ...makePosition(t.trades),
    actor: {
      profileId: t.profileId,
      address: `0x${t.profileId}`,
      name: t.name,
      imageUrl: t.imageUrl,
    },
  })),
  pagination: { hasMore: false },
});

describe('mapFollowingPositionsToAvatarMarkers', () => {
  it('returns [] for empty/invalid input', () => {
    expect(
      mapFollowingPositionsToAvatarMarkers(undefined, makePrices(5)),
    ).toEqual([]);
    expect(
      mapFollowingPositionsToAvatarMarkers(
        { items: [], pagination: { hasMore: false } },
        makePrices(5),
      ),
    ).toEqual([]);
    expect(
      mapFollowingPositionsToAvatarMarkers(
        makeResponse([
          { profileId: 'a', name: 'Alice', trades: [makeTrade()] },
        ]),
        makePrices(1),
      ),
    ).toEqual([]);
  });

  it('maps one marker per in-window trade and carries the parent avatar', () => {
    const response = makeResponse([
      {
        profileId: 'a',
        name: 'Alice',
        imageUrl: 'https://img/alice.png',
        trades: [
          makeTrade({
            timestamp: BASE_TS + 1 * INTERVAL,
            transactionHash: '0x1',
          }),
          makeTrade({
            intent: 'exit',
            direction: 'sell',
            timestamp: BASE_TS + 4 * INTERVAL,
            transactionHash: '0x2',
          }),
        ],
      },
    ]);

    const markers = mapFollowingPositionsToAvatarMarkers(
      response,
      makePrices(10),
    );

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({
      index: 1,
      intent: 'enter',
      avatarUrl: 'https://img/alice.png',
      traderName: 'Alice',
    });
    expect(markers[1]).toMatchObject({ index: 4, intent: 'exit' });
    // Avatar is per-trader: both markers reuse Alice's image.
    expect(markers[1].avatarUrl).toBe('https://img/alice.png');
  });

  it('leaves avatarUrl undefined when the trader has no imageUrl', () => {
    const response = makeResponse([
      { profileId: 'b', name: 'bob.eth', trades: [makeTrade()] },
    ]);
    const [marker] = mapFollowingPositionsToAvatarMarkers(
      response,
      makePrices(5),
    );
    expect(marker.avatarUrl).toBeUndefined();
    expect(marker.traderName).toBe('bob.eth');
  });

  it('drops out-of-window trades', () => {
    const response = makeResponse([
      {
        profileId: 'a',
        name: 'Alice',
        trades: [makeTrade({ timestamp: BASE_TS - INTERVAL })],
      },
    ]);
    expect(
      mapFollowingPositionsToAvatarMarkers(response, makePrices(5)),
    ).toEqual([]);
  });

  it('caps markers to maxMarkers, keeping the most recent in chronological order', () => {
    const prices = makePrices(50);
    const trades = Array.from({ length: 40 }, (_, i) =>
      makeTrade({
        timestamp: BASE_TS + i * INTERVAL,
        transactionHash: `0x${i}`,
      }),
    );
    const response = makeResponse([{ profileId: 'a', name: 'Alice', trades }]);

    const markers = mapFollowingPositionsToAvatarMarkers(response, prices, {
      maxMarkers: 5,
    });

    expect(markers).toHaveLength(5);
    expect(markers.map((m) => m.index)).toEqual([35, 36, 37, 38, 39]);
  });

  it('defaults the cap to DEFAULT_MAX_AVATAR_MARKERS', () => {
    const prices = makePrices(DEFAULT_MAX_AVATAR_MARKERS + 20);
    const trades = Array.from(
      { length: DEFAULT_MAX_AVATAR_MARKERS + 10 },
      (_, i) =>
        makeTrade({
          timestamp: BASE_TS + i * INTERVAL,
          transactionHash: `0x${i}`,
        }),
    );
    const markers = mapFollowingPositionsToAvatarMarkers(
      makeResponse([{ profileId: 'a', name: 'Alice', trades }]),
      prices,
    );
    expect(markers).toHaveLength(DEFAULT_MAX_AVATAR_MARKERS);
  });
});
