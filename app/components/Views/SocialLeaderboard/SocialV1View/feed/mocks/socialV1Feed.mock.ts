import type {
  SocialV1FeedItem,
  SocialV1PerpsClosedFeedItem,
  SocialV1PerpsOpenFeedItem,
  SocialV1SpotCompactFeedItem,
} from '../types';

const BTC_OPEN_CHART_SERIES = [
  98000, 99500, 101200, 103800, 102400, 104213, 108900, 112400, 118200, 124800,
];

export const mockOpenPerpsFeedItem = (
  overrides: Partial<SocialV1PerpsOpenFeedItem> = {},
): SocialV1PerpsOpenFeedItem => ({
  id: 'v1-feed-btc-open',
  variant: 'perpsOpen',
  comment: 'Leverage is a lifestyle.',
  showChart: true,
  chartSeries: BTC_OPEN_CHART_SERIES,
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
  comment: 'Risk managed. Mostly.',
  showChart: false,
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
