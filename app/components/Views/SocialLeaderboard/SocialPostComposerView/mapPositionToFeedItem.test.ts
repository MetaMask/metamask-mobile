import type { Position } from '@metamask/social-controllers';
import {
  KLIPY_STATIC_GIF_EXAMPLE,
  KLIPY_STATIC_GIF_HOST,
} from '../../../UI/SocialFeed/utils/klipyGifComment';
import { computeLivePositionFigures } from '../../../UI/SocialFeed/live/computeLivePositionFigures';
import { mapPositionToFeedItem } from './mapPositionToFeedItem';

jest.mock('../../../UI/SocialFeed/utils/formatters', () => ({
  formatPercent: (value: number | null | undefined) =>
    value == null ? '—' : `${value}%`,
  formatSignedUsd: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
  formatSignedAbbreviatedUsd: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
  formatTradeUnitPrice: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
  formatAbbreviatedUsd: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
  formatUsd: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
}));

jest.mock('../../../UI/SocialFeed/utils/perp', () => ({
  isPerpPosition: (position: { perpPositionType?: string; chain?: string }) =>
    position.perpPositionType != null || position.chain === 'hyperliquid',
  isClosedPosition: () => false,
  getPerpPositionDirection: (position: {
    perpPositionType?: 'long' | 'short' | null;
  }) => position.perpPositionType ?? null,
  getSupportedXyzPerpMarketSymbol: (symbol: string) => ({
    targetSymbol: symbol,
    requiresXyzMarketCheck: false,
  }),
}));

const openSpot: Position = {
  positionId: 'eth-spot',
  tokenSymbol: 'ETH',
  tokenName: 'Ethereum',
  tokenAddress: '0xeth',
  chain: 'ethereum',
  positionAmount: 0.24,
  boughtUsd: 442,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 442,
  trades: [
    {
      direction: 'buy',
      intent: 'enter',
      tokenAmount: 0.24,
      usdCost: 442,
      timestamp: 1_700_000_000,
      transactionHash: '0x1',
    },
  ],
  lastTradeAt: 1_700_007_200,
  currentValueUSD: 720,
  pnlValueUsd: 278,
  pnlPercent: 0.02,
};

const closedSpot: Position = {
  ...openSpot,
  positionAmount: 0,
  currentValueUSD: 0,
  realizedPnl: 100,
  pnlValueUsd: 100,
  trades: [
    {
      direction: 'buy',
      intent: 'enter',
      tokenAmount: 2,
      usdCost: 200,
      timestamp: 1_700_000_000,
      transactionHash: '0x1',
    },
    {
      direction: 'sell',
      intent: 'exit',
      tokenAmount: 2,
      usdCost: 300,
      timestamp: 1_700_003_600,
      transactionHash: '0x2',
    },
  ],
  lastTradeAt: 1_700_003_600,
};

const openPerp: Position = {
  ...openSpot,
  positionId: 'btc-perp',
  tokenSymbol: 'BTC',
  tokenName: 'Bitcoin',
  chain: 'hyperliquid',
  tokenAddress: '',
  perpPositionType: 'short',
  perpLeverage: 40,
  positionAmount: 0.01,
  positionAmountWithLeverage: 0.4,
  costBasis: 43000,
  currentValueUSD: 450,
  pnlPercent: 9.4,
  pnlValueUsd: 42,
};

const LIVE_SPOT_TOKEN_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';

describe('mapPositionToFeedItem', () => {
  it('maps an open spot position to a share card with copy trade', () => {
    const item = mapPositionToFeedItem(openSpot, 'this is alpha', {
      isClosed: false,
    });

    expect(item.variant).toBe('spotShare');
    if (item.variant !== 'spotShare') {
      return;
    }
    expect(item.comment).toBe('this is alpha');
    expect(item.author.username).toBe('giga-whale');
    expect(item.timestamp).toEqual(expect.any(Number));
    expect(item.side).toBe('buy');
    expect(item.showCopyTrade).toBe(true);
    expect(item.asset.symbol).toBe('ETH');
  });

  it('maps an open perp to the open perps card', () => {
    const item = mapPositionToFeedItem(openPerp, 'this is alpha', {
      isClosed: false,
    });

    expect(item.variant).toBe('perpsOpen');
    if (item.variant !== 'perpsOpen') {
      return;
    }
    expect(item.direction).toBe('short');
    expect(item.leverageLabel).toBe('40x');
  });

  it('maps a closed perp without copy trade', () => {
    const item = mapPositionToFeedItem(
      { ...openPerp, currentValueUSD: 0, realizedPnl: 100 },
      'this is alpha',
      { isClosed: true },
    );

    expect(item.variant).toBe('perpsClosed');
    if (item.variant !== 'perpsClosed') {
      return;
    }
    expect(item.holdTimeLabel).toBeTruthy();
    expect(item.isPnlPositive).toBe(true);
  });

  it('prices and dates a closed perp from its fills', () => {
    const closedPerp: Position = {
      ...openPerp,
      isOpen: false,
      positionAmount: 0,
      positionAmountWithLeverage: 0,
      currentValueUSD: 0,
      realizedPnl: 100,
      trades: [
        {
          direction: 'sell',
          intent: 'enter',
          tokenAmount: 1,
          usdCost: 43000,
          timestamp: 1_700_000_000,
          transactionHash: '0x1',
        },
        {
          direction: 'buy',
          intent: 'exit',
          tokenAmount: 1,
          usdCost: 42000,
          timestamp: 1_700_003_600,
          transactionHash: '0x2',
        },
      ],
      lastTradeAt: 1_700_003_600,
    };

    const item = mapPositionToFeedItem(closedPerp, 'closed perp', {
      isClosed: true,
    });

    expect(item.variant).toBe('perpsClosed');
    if (item.variant !== 'perpsClosed') {
      return;
    }
    expect(item.entryPriceLabel).toBe('$43000');
    expect(item.exitPriceLabel).toBe('$42000');
    expect(item.closedAtMs).toBe(1_700_003_600_000);
  });

  it('maps a closed spot position to the closed card without copy trade', () => {
    const item = mapPositionToFeedItem(
      { ...openSpot, realizedPnl: -12, currentValueUSD: 0 },
      'closed spot',
      { isClosed: true },
    );

    expect(item.variant).toBe('spotClosed');
    if (item.variant !== 'spotClosed') {
      return;
    }
    expect(item).not.toHaveProperty('showCopyTrade');
    expect(item.isPnlPositive).toBe(false);
  });

  it('derives closed spot entry and exit prices from the fills', () => {
    const item = mapPositionToFeedItem(closedSpot, 'closed spot', {
      isClosed: true,
    });

    expect(item.variant).toBe('spotClosed');
    if (item.variant !== 'spotClosed') {
      return;
    }
    expect(item.entryPriceLabel).toBe('$100');
    expect(item.exitPriceLabel).toBe('$150');
  });

  it('quotes closed spot entry and exit in market cap when the fills recorded one', () => {
    const item = mapPositionToFeedItem(
      {
        ...closedSpot,
        trades: [
          closedSpot.trades[0],
          { ...closedSpot.trades[1], marketCap: 1500 },
        ],
      },
      'closed spot',
      { isClosed: true },
    );

    expect(item.variant).toBe('spotClosed');
    if (item.variant !== 'spotClosed') {
      return;
    }
    expect(item.entryMarketCapLabel).toBe('$1000');
    expect(item.exitMarketCapLabel).toBe('$1500');
  });

  it('dates a closed spot position from its last trade', () => {
    const item = mapPositionToFeedItem(closedSpot, 'closed spot', {
      isClosed: true,
    });

    expect(item.variant).toBe('spotClosed');
    if (item.variant !== 'spotClosed') {
      return;
    }
    expect(item.closedAtMs).toBe(1_700_003_600_000);
  });

  it('maps a short spot side from a negative position amount', () => {
    const item = mapPositionToFeedItem(
      { ...openSpot, positionAmount: -1.5 },
      'short spot',
      { isClosed: false },
    );

    expect(item.variant).toBe('spotShare');
    if (item.variant !== 'spotShare') {
      return;
    }
    expect(item.side).toBe('sell');
  });

  it('omits entry price when there is neither costBasis nor entry fills', () => {
    const item = mapPositionToFeedItem(
      { ...openPerp, costBasis: null, trades: [] },
      'this is alpha',
      { isClosed: false },
    );

    expect(item.variant).toBe('perpsOpen');
    if (item.variant !== 'perpsOpen') {
      return;
    }
    expect(item.entryPriceLabel).toBeUndefined();
  });

  it('omits leverage when the perp has no leverage field', () => {
    const item = mapPositionToFeedItem(
      { ...openPerp, perpLeverage: undefined },
      'this is alpha',
      { isClosed: false },
    );

    expect(item.variant).toBe('perpsOpen');
    if (item.variant !== 'perpsOpen') {
      return;
    }
    expect(item.leverageLabel).toBeUndefined();
  });

  it('uses lastTradeAt when there are no trades for hold time', () => {
    const item = mapPositionToFeedItem(
      {
        ...openSpot,
        trades: [],
        lastTradeAt: 1_700_000_000,
      },
      'no trades',
      { isClosed: true },
    );

    expect(item.variant).toBe('spotClosed');
    if (item.variant !== 'spotClosed') {
      return;
    }
    expect(item.holdTimeLabel).toBeTruthy();
  });

  it('builds a live price source for an open composer position', () => {
    const position = { ...openSpot, tokenAddress: LIVE_SPOT_TOKEN_ADDRESS };

    const item = mapPositionToFeedItem(position, 'this is alpha', {
      isClosed: false,
    });

    expect(item).toMatchObject({
      live: expect.objectContaining({
        key: 'spot:eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
        kind: 'spot',
        positionAmount: 0.24,
        direction: 1,
        snapshotPrice: expect.closeTo(3000),
        marketCapPerPrice: null,
      }),
    });
  });

  it('builds a live perp price source for an open composer position', () => {
    const item = mapPositionToFeedItem(openPerp, 'this is alpha', {
      isClosed: false,
    });

    expect(item).toMatchObject({
      live: expect.objectContaining({
        key: 'perp:BTC',
        kind: 'perp',
        symbol: 'BTC',
        positionAmount: 0.01,
        direction: -1,
        snapshotPrice: expect.closeTo(45_000),
      }),
    });
  });

  it('prices the static mark of a leveraged perp on the feed basis', () => {
    const item = mapPositionToFeedItem(openPerp, 'this is alpha', {
      isClosed: false,
    });

    expect(item.variant).toBe('perpsOpen');
    if (item.variant !== 'perpsOpen') {
      return;
    }
    expect(item.markPriceLabel).toBe('$45000');
  });

  it('keeps the first live tick of a leveraged perp on the static P&L', () => {
    const item = mapPositionToFeedItem(openPerp, 'this is alpha', {
      isClosed: false,
    });

    expect(item.variant).toBe('perpsOpen');
    expect(item).toHaveProperty('live');
    if (item.variant !== 'perpsOpen' || item.live === undefined) {
      return;
    }
    const firstTick = computeLivePositionFigures(item.live, 45_000);
    expect(firstTick.pnlUsd).toBeCloseTo(42);
  });

  it('leaves an open composer position without a live source when live ticks are off', () => {
    const position = { ...openSpot, tokenAddress: LIVE_SPOT_TOKEN_ADDRESS };

    const item = mapPositionToFeedItem(position, 'this is alpha', {
      isClosed: false,
      liveTicks: false,
    });

    expect(item.variant).toBe('spotShare');
    expect(item).not.toHaveProperty('live');
  });

  it('leaves a closed composer position without a live price source', () => {
    const position = { ...closedSpot, tokenAddress: LIVE_SPOT_TOKEN_ADDRESS };

    const item = mapPositionToFeedItem(position, 'closed spot', {
      isClosed: true,
    });

    expect(item.variant).toBe('spotClosed');
    expect(item).not.toHaveProperty('live');
  });

  it('leaves a closed composer perp without a live price source', () => {
    const position = {
      ...openPerp,
      currentValueUSD: 0,
      positionAmount: 0,
      realizedPnl: 100,
    };

    const item = mapPositionToFeedItem(position, 'closed perp', {
      isClosed: true,
    });

    expect(item.variant).toBe('perpsClosed');
    expect(item).not.toHaveProperty('live');
  });

  it('carries the KLIPY GIF URL as commentGifUrl for a GIF-only pending post', () => {
    const item = mapPositionToFeedItem(openSpot, '', {
      isClosed: false,
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });

    expect(item).toMatchObject({
      comment: '',
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });
  });

  it('keeps the caption text free of the GIF URL', () => {
    const item = mapPositionToFeedItem(openPerp, 'this is alpha', {
      isClosed: false,
      commentGifUrl: KLIPY_STATIC_GIF_EXAMPLE,
    });

    expect(item.comment).toBe('this is alpha');
    expect(item.comment).not.toContain(KLIPY_STATIC_GIF_HOST);
  });

  it('ignores a commentGifUrl that is not a KLIPY static GIF', () => {
    const item = mapPositionToFeedItem(openSpot, 'this is alpha', {
      isClosed: false,
      commentGifUrl: 'https://media.test/party.gif',
    });

    expect(item).not.toHaveProperty('commentGifUrl');
  });
});
