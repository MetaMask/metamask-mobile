import type { Position } from '@metamask/social-controllers';
import { mapPositionToFeedItem } from './mapPositionToFeedItem';

jest.mock('../utils/formatters', () => ({
  formatPercent: (value: number | null | undefined) =>
    value == null ? '—' : `${value}%`,
  formatSignedUsd: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
  formatTradeUnitPrice: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
  formatUsd: (value: number | null | undefined) =>
    value == null ? '—' : `$${value}`,
}));

jest.mock('../utils/perp', () => ({
  isPerpPosition: (position: { perpPositionType?: string; chain?: string }) =>
    position.perpPositionType != null || position.chain === 'hyperliquid',
  isClosedPosition: () => false,
  getPerpPositionDirection: (position: {
    perpPositionType?: 'long' | 'short' | null;
  }) => position.perpPositionType ?? null,
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
  });
});
