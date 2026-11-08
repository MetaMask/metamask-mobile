import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import {
  buildSocialProfileOgImageRequest,
  buildSocialTradeOgImageRequest,
  downsampleSeries,
  fetchPerpOgSeries,
  type SocialTradeOgCardInput,
} from './socialOgImageCards';

const mockFetchHyperliquid = jest.fn();

jest.mock('../utils/hyperliquidPrices', () => ({
  ...jest.requireActual('../utils/hyperliquidPrices'),
  fetchHyperliquidHistoricalPrices: (...args: unknown[]) =>
    mockFetchHyperliquid(...args),
}));

const OPEN_SECONDS = 1793985370;
const CLOSE_SECONDS = 1793985519;

const sndkLong = {
  positionId: 'ab5e2773-89f9-4b37-bfd7-e087deb800fc',
  tokenSymbol: 'xyz:SNDK',
  tokenName: 'SNDK-USDC',
  tokenAddress: 'xyz:SNDK',
  chain: 'hyperliquid',
  positionAmount: 0,
  isOpen: false,
  boughtUsd: 11.259618,
  soldUsd: 11.325546,
  realizedPnl: 0.32964,
  costBasis: 0,
  lastTradeAt: CLOSE_SECONDS,
  perpPositionType: 'long',
  perpLeverage: 5,
  tokenImageUrl: 'https://social-assets.api.cx.metamask.io/images/sndk.jpg',
  trades: [
    {
      direction: 'buy',
      intent: 'enter',
      tokenAmount: 0.0134,
      usdCost: 11.259618,
      timestamp: OPEN_SECONDS,
      transactionHash: '0xopen',
    },
    {
      direction: 'sell',
      intent: 'exit',
      tokenAmount: -0.0134,
      usdCost: -11.325546,
      timestamp: CLOSE_SECONDS,
      transactionHash: '0xclose',
    },
  ],
} as Position;

const minutePrices = (startSeconds: number, count: number): TokenPrice[] =>
  Array.from({ length: count }, (_, index) => [
    String((startSeconds + index * 60) * 1000),
    840 + index,
  ]);

const tradeInput = (
  overrides: Partial<SocialTradeOgCardInput> = {},
): SocialTradeOgCardInput => ({
  traderId: '7a7e08ce-49fe-4c9d-a33e-4447acf0fec6',
  positionId: sndkLong.positionId,
  username: 'wen_silent_gecko',
  avatarUrl: 'https://cdn.test/avatar.png',
  position: sndkLong,
  market: 'SNDK',
  marketIconUrl: sndkLong.tokenImageUrl,
  isPerp: true,
  isClosed: true,
  pnlUsd: 0.32964,
  pnlPct: 2.93,
  prices: minutePrices(OPEN_SECONDS - 120, 10),
  ...overrides,
});

describe('downsampleSeries', () => {
  it('keeps the first and last point and caps the length', () => {
    const points = Array.from({ length: 1000 }, (_, index) => index);

    const result = downsampleSeries(points, 200);

    expect(result).toHaveLength(200);
    expect(result[0]).toBe(0);
    expect(result[199]).toBe(999);
  });
});

describe('buildSocialTradeOgImageRequest', () => {
  it('builds a closed perp card with entry, exit, leverage, and trade markers', () => {
    const request = buildSocialTradeOgImageRequest(tradeInput());

    expect(request).toEqual({
      kind: 'trade',
      traderId: '7a7e08ce-49fe-4c9d-a33e-4447acf0fec6',
      positionId: sndkLong.positionId,
      trade: {
        handle: '@wen_silent_gecko',
        avatarUrl: 'https://cdn.test/avatar.png',
        market: 'SNDK',
        marketIconUrl: sndkLong.tokenImageUrl,
        side: 'Long',
        leverage: 5,
        status: 'closed',
        closedAt: CLOSE_SECONDS * 1000,
        pnlUsd: 0.32964,
        pnlPct: 2.93,
        entryPrice: 11.259618 / 0.0134,
        exitPrice: 11.325546 / 0.0134,
        markPrice: undefined,
        series: [840, 841, 842, 843, 844, 845, 846, 847, 848, 849],
        entryIndex: 2,
        exitIndex: 4,
        showDollar: true,
      },
    });
  });

  it('draws an open spot position as a long at the mark price', () => {
    const openSpot = {
      ...sndkLong,
      chain: 'base',
      isOpen: true,
      perpPositionType: null,
      perpLeverage: null,
      trades: [sndkLong.trades[0]],
    } as Position;

    const request = buildSocialTradeOgImageRequest(
      tradeInput({
        position: openSpot,
        isPerp: false,
        isClosed: false,
        markPrice: 900,
      }),
    );

    expect(request?.kind).toBe('trade');
    const trade = request?.kind === 'trade' ? request.trade : undefined;
    expect(trade).toMatchObject({
      side: 'Long',
      status: 'open',
      markPrice: 900,
    });
    expect(trade?.leverage).toBeUndefined();
    expect(trade?.closedAt).toBeUndefined();
    expect(trade?.exitPrice).toBeUndefined();
    expect(trade?.exitIndex).toBeUndefined();
  });

  it('leaves out image urls that are not https', () => {
    const request = buildSocialTradeOgImageRequest(
      tradeInput({
        avatarUrl: 'http://cdn.test/avatar.png',
        marketIconUrl: 'data:image/svg+xml;base64,AAAA',
      }),
    );

    const trade = request?.kind === 'trade' ? request.trade : undefined;
    expect(trade?.avatarUrl).toBeUndefined();
    expect(trade?.marketIconUrl).toBeUndefined();
  });

  it.each([
    ['no username', { username: '  ' }],
    ['no P&L', { pnlUsd: null }],
    ['fewer than two prices', { prices: minutePrices(OPEN_SECONDS, 1) }],
    [
      'a perp with no side',
      { position: { ...sndkLong, perpPositionType: null } as Position },
    ],
  ])('returns undefined with %s', (_label, overrides) => {
    expect(buildSocialTradeOgImageRequest(tradeInput(overrides))).toBe(
      undefined,
    );
  });
});

describe('fetchPerpOgSeries', () => {
  beforeEach(() => {
    mockFetchHyperliquid.mockReset();
    mockFetchHyperliquid.mockResolvedValue([]);
  });

  it('uses the finest interval that covers the position within the candle cap', async () => {
    const nowMs = 1_800_000_000_000;

    await fetchPerpOgSeries('xyz:SNDK', nowMs - 2 * 60 * 60 * 1000, nowMs);
    expect(mockFetchHyperliquid).toHaveBeenLastCalledWith(
      expect.objectContaining({ symbol: 'xyz:SNDK', interval: '1m' }),
    );

    await fetchPerpOgSeries(
      'xyz:SNDK',
      nowMs - 30 * 24 * 60 * 60 * 1000,
      nowMs,
    );
    expect(mockFetchHyperliquid).toHaveBeenLastCalledWith(
      expect.objectContaining({ interval: '1h' }),
    );
  });
});

describe('buildSocialProfileOgImageRequest', () => {
  const nowMs = 1_800_000_000_000;
  const daySeconds = 24 * 60 * 60;
  const profile = {
    profile: {
      profileId: '796a9c22-4831-4813-ba75-4f3277825420',
      address: '0xba88205a874019fcaa1fd1b8b1b9ac519b2b86cb',
      allAddresses: [],
      name: 'dip_spicy_maxi',
      imageUrl: 'https://cdn.test/dip.png',
    },
    stats: { pnl30d: 1200, winRate30d: 0.64, tradeCount30d: 31 },
    followerCount: 12,
  } as unknown as TraderProfileResponse;
  const closed = (daysAgo: number, realizedPnl: number | null): Position =>
    ({
      ...sndkLong,
      realizedPnl,
      lastTradeAt: nowMs / 1000 - daysAgo * daySeconds,
    }) as Position;

  it('builds a profile card from stats and recent closed positions, without the address', () => {
    const request = buildSocialProfileOgImageRequest({
      traderId: '796a9c22-4831-4813-ba75-4f3277825420',
      username: 'dip_spicy_maxi',
      avatarUrl: profile.profile.imageUrl,
      profile,
      closedPositions: [closed(2, 300), closed(40, 900), closed(10, -100)],
      nowMs,
    });

    expect(request).toEqual({
      kind: 'profile',
      traderId: '796a9c22-4831-4813-ba75-4f3277825420',
      profile: {
        handle: '@dip_spicy_maxi',
        avatarUrl: 'https://cdn.test/dip.png',
        pnl30dUsd: 1200,
        winRatePct: 64,
        tradeCount: 31,
        bestTradeUsd: 300,
        followers: 12,
        pnlSeries: [0, -100, 200],
      },
    });
  });

  it('draws a line to the 30-day P&L when nothing closed in the window', () => {
    const request = buildSocialProfileOgImageRequest({
      traderId: 'trader-1',
      username: '@dip_spicy_maxi',
      profile,
      closedPositions: [],
      nowMs,
    });

    const card = request?.kind === 'profile' ? request.profile : undefined;
    expect(card?.handle).toBe('@dip_spicy_maxi');
    expect(card?.pnlSeries).toEqual([0, 1200]);
    expect(card?.bestTradeUsd).toBe(0);
  });

  it('returns undefined without a 30-day P&L', () => {
    expect(
      buildSocialProfileOgImageRequest({
        traderId: 'trader-1',
        username: 'dip_spicy_maxi',
        profile: { ...profile, stats: {} } as TraderProfileResponse,
        closedPositions: [],
        nowMs,
      }),
    ).toBeUndefined();
  });
});
