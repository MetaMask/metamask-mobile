import type {
  AccountState,
  Order,
  PerpsMarketData,
  Position,
} from '@metamask/perps-controller';

export const createFundedAccountForViews = (balance: string): AccountState => ({
  spendableBalance: balance,
  withdrawableBalance: balance,
  totalBalance: balance,
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
});

const defaultEthMarketForViews: PerpsMarketData = {
  symbol: 'ETH',
  name: 'Ethereum',
  maxLeverage: '50x',
  price: '$2,500.00',
  change24h: '+$50.00',
  change24hPercent: '+2.0%',
  volume: '$1.5B',
  openInterest: '$500M',
  marketType: 'crypto',
  fundingRate: 0.0001,
  szDecimals: 2,
};

export const createEthMarketForViews = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  ...defaultEthMarketForViews,
  ...overrides,
});

const defaultBtcMarketForViews: PerpsMarketData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '50x',
  price: '$50,000.00',
  change24h: '+$100.00',
  change24hPercent: '+0.2%',
  volume: '$2B',
  openInterest: '$800M',
  marketType: 'crypto',
  fundingRate: -0.0002,
  szDecimals: 5,
};

export const createBtcMarketForViews = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  ...defaultBtcMarketForViews,
  ...overrides,
});

const defaultLongPositionForViews: Position = {
  symbol: 'ETH',
  size: '1',
  marginUsed: '833.33',
  entryPrice: '2500',
  liquidationPrice: '1800',
  unrealizedPnl: '100',
  returnOnEquity: '0.10',
  leverage: { value: 3, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '0', allTime: '0', sinceChange: '0' },
  positionValue: '2500',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

export const createLongPositionForViews = (
  overrides: Partial<Position> = {},
): Position => ({
  ...defaultLongPositionForViews,
  ...overrides,
});

export const createShortPositionForViews = (
  overrides: Partial<Position> = {},
): Position =>
  createLongPositionForViews({
    symbol: 'BTC',
    size: '-0.5',
    marginUsed: '1000',
    entryPrice: '50000',
    liquidationPrice: '55000',
    unrealizedPnl: '-50',
    returnOnEquity: '-0.05',
    leverage: { value: 5, type: 'cross' },
    positionValue: '25000',
    ...overrides,
  });

const defaultLimitOrderForViews: Order = {
  orderId: 'pro-order-eth-1',
  symbol: 'ETH',
  side: 'buy',
  orderType: 'limit',
  detailedOrderType: 'Limit',
  size: '1',
  originalSize: '1',
  filledSize: '0',
  remainingSize: '1',
  price: '2400',
  reduceOnly: false,
  isTrigger: false,
  status: 'open',
  timestamp: 1_711_756_800_000,
  createdAt: 1_711_756_800_000,
  updatedAt: 1_711_756_800_000,
  fee: '0',
  averageFillPrice: undefined,
  triggerPrice: undefined,
  triggerDirection: undefined,
  timeInForce: 'Gtc',
} as Order;

export const createLimitOrderForViews = (
  overrides: Partial<Order> = {},
): Order => ({
  ...defaultLimitOrderForViews,
  ...overrides,
});
