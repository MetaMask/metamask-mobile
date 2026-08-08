import type {
  FeedItem as CoreFeedItem,
  FeedResponse,
  Trade,
} from '@metamask/social-controllers';

/**
 * Core-shaped feed fixtures (`Position` + `actor` + `timestamp`) used only by
 * adapter and hook tests. Timestamps are Unix seconds, matching the API.
 */

/** Extra fields present on raw feed payloads but not yet on `CoreFeedItem`. */
type CoreFeedItemOverrides = Partial<CoreFeedItem> & {
  marginUsd?: number | null;
};

const buildTrade = (overrides: Partial<Trade> = {}): Trade => ({
  direction: 'buy',
  intent: 'enter',
  tokenAmount: 1000,
  usdCost: 120000,
  timestamp: 1_700_000_000,
  transactionHash: '0xhash',
  classification: 'spot',
  ...overrides,
});

/** An open spot buy on Ethereum. */
export const mockSpotFeedItem = (
  overrides: Partial<CoreFeedItem> = {},
): CoreFeedItem => ({
  positionId: 'pos-spot-1',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
  positionAmount: 1000,
  boughtUsd: 100000,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 100000,
  trades: [buildTrade({ timestamp: 1_700_000_000 })],
  lastTradeAt: 1_700_000_000,
  tokenImageUrl: null,
  currentValueUSD: 123000.5,
  pnlValueUsd: 12345,
  pnlPercent: 12,
  actor: {
    profileId: 'profile-1',
    address: '0x1111111111111111111111111111111111111111',
    name: 'dutchiono',
    imageUrl: null,
  },
  timestamp: 1_700_000_000,
  ...overrides,
});

/** A closed perp long on Hyperliquid. */
export const mockPerpFeedItem = (
  overrides: CoreFeedItemOverrides = {},
): CoreFeedItem =>
  ({
    positionId: 'pos-perp-1',
    tokenSymbol: 'ETH',
    tokenName: 'Ethereum',
    tokenAddress: '',
    chain: 'hyperliquid',
    positionAmount: 5,
    boughtUsd: 50600,
    soldUsd: 0,
    realizedPnl: 8000,
    costBasis: 50600,
    trades: [
      buildTrade({
        direction: 'sell',
        intent: 'exit',
        tokenAmount: 5,
        usdCost: 88000,
        timestamp: 1_700_000_500,
        classification: 'perp',
        perpPositionType: 'long',
        perpLeverage: 8,
      }),
    ],
    lastTradeAt: 1_700_000_500,
    tokenImageUrl: null,
    currentValueUSD: 0,
    pnlValueUsd: 8000,
    pnlPercent: 12,
    perpPositionType: 'long',
    perpLeverage: 8,
    actor: {
      profileId: 'profile-2',
      address: '0x2222222222222222222222222222222222222222',
      name: 'aparjey',
      imageUrl: null,
    },
    timestamp: 1_700_000_500,
    ...overrides,
  }) as CoreFeedItem;

/** Wraps items in a `FeedResponse` with cursor pagination. */
export const mockFeedResponse = (
  items: CoreFeedItem[],
  olderCursor: string | null = null,
): FeedResponse => ({
  items,
  pagination: {
    olderCursor,
    newerCursor: null,
  },
});
