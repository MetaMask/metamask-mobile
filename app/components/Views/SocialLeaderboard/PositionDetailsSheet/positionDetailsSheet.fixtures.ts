import type { Position, Trade } from '@metamask/social-controllers';
import type { SocialV1FeedAuthor } from '../../../UI/SocialFeed/types';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const NOW_MS = Date.UTC(2026, 9, 13, 12, 0, 0);

export const buildTrade = (overrides: Partial<Trade> = {}): Trade => ({
  direction: 'buy',
  intent: 'enter',
  tokenAmount: 2,
  usdCost: 200,
  timestamp: NOW_MS - 2 * DAY_MS,
  transactionHash: '0xenter',
  ...overrides,
});

export const buildPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    positionId: 'position-1',
    tokenSymbol: 'PEPE',
    tokenName: 'Pepe',
    tokenAddress: '0xpepe',
    chain: 'ethereum',
    positionAmount: 2,
    boughtUsd: 200,
    soldUsd: null,
    realizedPnl: null,
    costBasis: 200,
    trades: [buildTrade()],
    lastTradeAt: NOW_MS - 2 * DAY_MS,
    currentValueUSD: 240,
    pnlValueUsd: 40,
    pnlPercent: 20,
    ...overrides,
  }) as Position;

export const buildPerpPosition = (overrides: Partial<Position> = {}) =>
  buildPosition({
    tokenSymbol: 'BTC',
    tokenName: 'BTC',
    tokenAddress: '',
    chain: 'hyperliquid',
    perpPositionType: 'short',
    perpLeverage: 40,
    trades: [
      buildTrade({
        direction: 'sell',
        tokenAmount: 1,
        usdCost: 100000,
        perpPositionType: 'short',
        perpLeverage: 40,
        action: 'opened',
      }),
    ],
    ...overrides,
  });

export const buildAuthor = (
  overrides: Partial<SocialV1FeedAuthor> = {},
): SocialV1FeedAuthor =>
  ({
    id: 'trader-1',
    username: 'satoshi',
    address: '0xTrader',
    avatarUri: null,
    winRatePercent: 60,
    pnl30d: null,
    ...overrides,
  }) as SocialV1FeedAuthor;
