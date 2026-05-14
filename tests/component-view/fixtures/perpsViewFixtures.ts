import type {
  AccountState,
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
  marketType: 'crypto',
};

export const createEthMarketForViews = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  ...defaultEthMarketForViews,
  ...overrides,
});

const defaultLongPositionForViews: Position = {
  symbol: 'ETH',
  size: '1',
  marginUsed: '833.33',
  entryPrice: '2500',
  liquidationPrice: '1800',
  unrealizedPnl: '0',
  returnOnEquity: '0',
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
