import { HOUR, MINUTE } from '../../../../../../constants/time';
import type {
  SocialV1FeedItem,
  SocialV1PerpsClosedFeedItem,
  SocialV1PerpsOpenFeedItem,
  SocialV1SpotClosedFeedItem,
  SocialV1SpotOpenFeedItem,
} from '../types';

// Relative so the mock posts keep reading as recent activity rather than
// aging into an absolute date as the fixture gets older.
const minutesAgo = (minutes: number) => Date.now() - minutes * MINUTE;
const hoursAgo = (hours: number) => Date.now() - hours * HOUR;

export const mockOpenPerpsFeedItem = (
  overrides: Partial<SocialV1PerpsOpenFeedItem> = {},
): SocialV1PerpsOpenFeedItem => ({
  id: 'v1-feed-btc-open',
  variant: 'perpsOpen',
  author: {
    id: 'v1-trader-doji',
    username: 'Doji',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    avatarUri: null,
    winRatePercent: 92,
    pnl30d: 50_000,
    followerCount: 17_200,
  },
  timestamp: minutesAgo(40),
  comment: 'Leverage is a lifestyle.',
  asset: {
    symbol: 'BTC',
    avatar: {
      positionId: 'v1-pos-btc-open',
      chain: 'hyperliquid',
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: 'BTC',
    },
  },
  direction: 'short',
  markPriceLabel: '$104,213',
  valueLabel: '$212,000.00',
  pnlLabel: '+128.6%',
  isPnlPositive: true,
  leverageLabel: '40X',
  autoCloseLabel: 'TP $101,214 / SL $110,905',
  entryPriceLabel: '$107,675',
  ...overrides,
});

export const mockClosedPerpsFeedItem = (
  overrides: Partial<SocialV1PerpsClosedFeedItem> = {},
): SocialV1PerpsClosedFeedItem => ({
  id: 'v1-feed-eth-closed',
  variant: 'perpsClosed',
  author: {
    id: 'v1-trader-kaito',
    username: 'kaito.eth',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    avatarUri: null,
    winRatePercent: 61,
    pnl30d: 128_400,
    followerCount: 4_310,
  },
  timestamp: hoursAgo(3),
  comment: 'Risk managed. Mostly.',
  asset: {
    symbol: 'ETH',
    avatar: {
      positionId: 'v1-pos-eth-closed',
      chain: 'hyperliquid',
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: 'ETH',
    },
  },
  direction: 'short',
  leverageLabel: '15x',
  valueLabel: '+$96,378.60',
  pnlLabel: '+38.2%',
  isPnlPositive: true,
  entryPriceLabel: '$1,890',
  exitPriceLabel: '$1,842',
  holdTimeLabel: '8h',
  ...overrides,
});

export const mockOpenSpotFeedItem = (
  overrides: Partial<SocialV1SpotOpenFeedItem> = {},
): SocialV1SpotOpenFeedItem => ({
  id: 'v1-feed-pump-open',
  variant: 'spotOpen',
  author: {
    id: 'v1-trader-frog',
    username: 'frogwater',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    avatarUri: null,
    // No stats at all: the header falls back to just the name.
    winRatePercent: null,
  },
  timestamp: minutesAgo(8),
  asset: {
    symbol: 'PUMP',
    avatar: {
      positionId: 'v1-pos-pump-open',
      chain: 'solana',
      tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
      tokenImageUrl: null,
      tokenSymbol: 'PUMP',
    },
  },
  side: 'buy',
  markPriceLabel: '$0.0\u20868618',
  entryPriceLabel: '$0.0\u20844947',
  holdTimeLabel: '1d 20h',
  valueLabel: '$128,400.00',
  pnlLabel: '+74.2%',
  isPnlPositive: true,
  ...overrides,
});

export const mockClosedSpotFeedItem = (
  overrides: Partial<SocialV1SpotClosedFeedItem> = {},
): SocialV1SpotClosedFeedItem => ({
  id: 'v1-feed-aapl-closed',
  variant: 'spotClosed',
  author: {
    id: 'v1-trader-lark',
    username: 'lark.eth',
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
    avatarUri: null,
    winRatePercent: 74,
    pnl30d: -8_200,
    followerCount: 612,
  },
  timestamp: hoursAgo(6),
  asset: {
    symbol: 'AAPL',
    avatar: {
      positionId: 'v1-pos-aapl-closed',
      chain: 'ethereum',
      tokenAddress: '0x0000000000000000000000000000000000000001',
      tokenImageUrl: null,
      tokenSymbol: 'AAPL',
    },
  },
  side: 'sell',
  entryPriceLabel: '$207.57',
  exitPriceLabel: '$237.88',
  holdTimeLabel: '6d',
  valueLabel: '+$9,373.20',
  pnlLabel: '+14.6%',
  isPnlPositive: true,
  ...overrides,
});

export const MOCK_SOCIAL_V1_FEED_ITEMS: SocialV1FeedItem[] = [
  mockOpenPerpsFeedItem(),
  mockOpenSpotFeedItem(),
  mockClosedPerpsFeedItem(),
  mockClosedSpotFeedItem(),
];
