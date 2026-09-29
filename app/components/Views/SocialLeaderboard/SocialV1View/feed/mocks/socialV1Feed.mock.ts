import { HOUR, MINUTE } from '../../../../../../constants/time';
import type {
  SocialV1FeedItem,
  SocialV1PerpsClosedFeedItem,
  SocialV1PerpsOpenFeedItem,
  SocialV1SpotCompactFeedItem,
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

export const mockCompactSpotFeedItem = (
  overrides: Partial<SocialV1SpotCompactFeedItem> = {},
): SocialV1SpotCompactFeedItem => ({
  id: 'v1-feed-pepe-compact',
  variant: 'spotCompact',
  author: {
    id: 'v1-trader-frog',
    username: 'frogwater',
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    avatarUri: null,
    winRatePercent: null,
  },
  timestamp: minutesAgo(8),
  asset: {
    symbol: 'PEPE',
    avatar: {
      positionId: 'v1-pos-pepe-compact',
      chain: 'ethereum',
      tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      tokenImageUrl: null,
      tokenSymbol: 'PEPE',
    },
  },
  side: 'buy',
  marketCapLabel: '$4.2B',
  volumeLabel: '$44.5M',
  valueLabel: '$5,610.00',
  pnlLabel: '+9.84%',
  isPnlPositive: true,
  ...overrides,
});

export const MOCK_SOCIAL_V1_FEED_ITEMS: SocialV1FeedItem[] = [
  mockOpenPerpsFeedItem(),
  mockClosedPerpsFeedItem(),
  mockCompactSpotFeedItem(),
];
