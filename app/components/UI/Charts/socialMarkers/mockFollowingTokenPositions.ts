import type {
  FollowingTokenPositionsResponse,
  FollowingPositionActor,
} from './types';

/**
 * TEMPORARY (ASSETS-4102 spike): hand-built mock of the
 * `GET /api/v1/positions/{assetId}/followed-by-me` response so the chart avatar
 * markers can be exercised without an authenticated account that follows active
 * traders. Toggled by `SPIKE_USE_MOCK` in `fetchFollowingTokenPositions`.
 *
 * REMOVE this file (and the short-circuit that calls it) before merge.
 *
 * Design notes:
 * Timestamps are relative to `Date.now()` (seconds, matching the real API). The
 * overlay declusters on zoom only when trades sit on DIFFERENT candles — trades
 * on the same candle share one X and can never be pulled apart — so every trade
 * is placed on its own distinct 4h candle. Offsets are arranged into three
 * bunches of 4-5 trades on nearby candles (so each forms a bubble at the default
 * zoom) separated by big gaps, plus two lone older trades. On a 4h chart this
 * shows three count bubbles (5 / 4 / 4) at the default zoom that break into
 * smaller clusters and then individual avatars as you zoom in. The most-recent
 * trade is kept a few candles back (not on the live/forming candle) so no marker
 * sits on the bar whose high updates every tick — that bar would make its marker
 * jiggle/flash on each redraw. `actor.imageUrl`
 * points at the real social-assets avatar CDN (RN resolves it to a data URI
 * before the WebView renders it); one actor has `imageUrl: null` to exercise the
 * initials fallback. `intent` alternates enter/exit to exercise the buy (+) /
 * sell (-) badges.
 */

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface MockActorSpec {
  actor: FollowingPositionActor;
  /** Seconds-ago offsets from now; sign of index picks enter/exit. */
  offsetsSec: number[];
}

const MOCK_ACTORS: MockActorSpec[] = [
  {
    actor: {
      profileId: 'mock-alice',
      address: '0xa11ce0000000000000000000000000000000a11c',
      name: 'alice.eth',
      imageUrl:
        'https://social-assets.dev-api.cx.metamask.io/t/sm/images/c0/c0b877a8-3d45-4892-aacc-eda69816c1e6',
    },
    // bunch A (candle 3), bunch A (candle 6), bunch B (candle 18), bunch C (candle 32)
    offsetsSec: [14 * HOUR, 26 * HOUR, 3 * DAY, 128 * HOUR],
  },
  {
    actor: {
      profileId: 'mock-bob',
      address: '0xb0b0000000000000000000000000000000000b0b',
      name: 'bob.sol',
      imageUrl:
        'https://social-assets.dev-api.cx.metamask.io/t/sm/images/7d/7d049264-d445-404a-9690-11fab60ffdd2.png',
    },
    // bunch A (candle 1), bunch B (candle 15), bunch C (candle 34), lone old trade
    offsetsSec: [7 * HOUR, 60 * HOUR, 136 * HOUR, 8 * DAY],
  },
  {
    actor: {
      profileId: 'mock-carol',
      address: '0xca2010000000000000000000000000000000ca20',
      name: 'carol',
      imageUrl:
        'https://social-assets.dev-api.cx.metamask.io/t/sm/images/89/893b14d1-b09c-4e70-8192-6ed580b1c40f',
    },
    // bunch A (candle 2), bunch B (candle 16), bunch C (candle 30), lone old trade
    offsetsSec: [10 * HOUR, 64 * HOUR, 5 * DAY, 10 * DAY],
  },
  {
    actor: {
      profileId: 'mock-dave',
      address: '0xda7e0000000000000000000000000000000da7e0',
      name: 'Dave Whale',
      imageUrl: null, // exercises the initials fallback
    },
    // bunch A (candle 5), bunch B (candle 17), bunch C (candle 31)
    offsetsSec: [22 * HOUR, 68 * HOUR, 124 * HOUR],
  },
];

/**
 * Builds a realistic followed-by-me response. `assetId` is accepted for parity
 * with the real client but ignored — every token shows the same mock set.
 */
export const buildMockFollowingTokenPositions = (
  assetId: string,
): FollowingTokenPositionsResponse => {
  const nowSec = Math.floor(Date.now() / 1000);

  const items = MOCK_ACTORS.map(({ actor, offsetsSec }, actorIndex) => ({
    chain: 'solana',
    tokenAddress: assetId.split(':').pop() ?? 'mock-token',
    tokenSymbol: 'MOCK',
    tokenName: 'Mock Token',
    positionAmount: 1000 + actorIndex * 250,
    boughtUsd: 500 + actorIndex * 100,
    soldUsd: 200 + actorIndex * 50,
    realizedPnl: 123.45 * (actorIndex + 1),
    costBasis: 0.42,
    marginUsd: 0,
    copyCount: 0,
    positionId: `mock-pos-${actor.profileId}`,
    profileId: actor.profileId,
    isOpen: true,
    flags: [],
    perpPositionType: null,
    perpLeverage: null,
    positionAmountWithLeverage: null,
    costBasisWithLeverage: null,
    actor,
    trades: offsetsSec.map((offset, tradeIndex) => {
      const intent = tradeIndex % 2 === 0 ? 'enter' : 'exit';
      return {
        direction: intent === 'enter' ? 'buy' : 'sell',
        intent,
        action: intent === 'enter' ? 'opened' : 'reduced',
        category: 'spot',
        classification: 'spot',
        perpPositionType: null,
        perpLeverage: null,
        tokenAmount: intent === 'enter' ? 1000 : -500,
        usdCost: intent === 'enter' ? 420 : -210,
        marketCap: null,
        timestamp: nowSec - offset,
        transactionHash: `mock-tx-${actor.profileId}-${tradeIndex}`,
        comment: null,
        comments: [],
      };
    }),
  }));

  return {
    items,
    pagination: { hasMore: false },
  } as unknown as FollowingTokenPositionsResponse;
};
