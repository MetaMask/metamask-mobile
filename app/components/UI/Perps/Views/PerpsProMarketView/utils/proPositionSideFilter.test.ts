import type { Order, Position } from '@metamask/perps-controller';
import {
  DEFAULT_PRO_POSITION_SIDE_FILTER,
  filterProOrdersBySide,
  filterProPositionsBySide,
} from './proPositionSideFilter';

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
  size: '1',
  entryPrice: '50000',
  positionValue: '51000',
  unrealizedPnl: '1000',
  marginUsed: '10000',
  leverage: { type: 'cross', value: 5 },
  liquidationPrice: '40000',
  maxLeverage: 50,
  returnOnEquity: '0.10',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'order-1',
  symbol: 'BTC',
  side: 'buy',
  size: '1',
  originalSize: '1',
  filledSize: '0',
  remainingSize: '1',
  price: '50000',
  orderType: 'limit',
  status: 'open',
  timestamp: 1_711_756_800_000,
  reduceOnly: false,
  isTrigger: false,
  detailedOrderType: 'Limit',
  ...overrides,
});

describe('filterProPositionsBySide', () => {
  it('returns all positions when filter is all', () => {
    const positions = [
      makePosition({ symbol: 'BTC', size: '1' }),
      makePosition({ symbol: 'ETH', size: '-1' }),
    ];

    expect(
      filterProPositionsBySide(positions, DEFAULT_PRO_POSITION_SIDE_FILTER),
    ).toEqual(positions);
  });

  it('filters long positions only', () => {
    const positions = [
      makePosition({ symbol: 'BTC', size: '1' }),
      makePosition({ symbol: 'ETH', size: '-1' }),
      makePosition({ symbol: 'SOL', size: '0.5' }),
    ];

    expect(filterProPositionsBySide(positions, 'long')).toEqual([
      positions[0],
      positions[2],
    ]);
  });

  it('filters short positions only', () => {
    const positions = [
      makePosition({ symbol: 'BTC', size: '1' }),
      makePosition({ symbol: 'ETH', size: '-1' }),
    ];

    expect(filterProPositionsBySide(positions, 'short')).toEqual([
      positions[1],
    ]);
  });
});

describe('filterProOrdersBySide', () => {
  it('returns all orders when filter is all', () => {
    const orders = [
      makeOrder({ orderId: 'long', side: 'buy' }),
      makeOrder({ orderId: 'short', side: 'sell' }),
    ];

    const result = filterProOrdersBySide(
      orders,
      DEFAULT_PRO_POSITION_SIDE_FILTER,
    );

    expect(result).toEqual(orders);
  });

  it('filters orders by their resulting position direction', () => {
    const longOrder = makeOrder({ orderId: 'long', side: 'buy' });
    const shortOrder = makeOrder({ orderId: 'short', side: 'sell' });

    const longResult = filterProOrdersBySide([longOrder, shortOrder], 'long');
    const shortResult = filterProOrdersBySide([longOrder, shortOrder], 'short');

    expect(longResult).toEqual([longOrder]);
    expect(shortResult).toEqual([shortOrder]);
  });

  it('uses reduce-only direction when filtering closing orders', () => {
    const closeLongOrder = makeOrder({
      orderId: 'close-long',
      side: 'sell',
      reduceOnly: true,
    });

    const result = filterProOrdersBySide([closeLongOrder], 'long');

    expect(result).toEqual([closeLongOrder]);
  });
});
