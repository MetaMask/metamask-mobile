import type { Order, Position, TwapOrder } from '@metamask/perps-controller';
import {
  DEFAULT_PRO_ORDER_SIDE_FILTER,
  DEFAULT_PRO_POSITION_SIDE_FILTER,
  filterProOrdersBySide,
  filterProPositionsBySide,
  filterProTwapOrdersBySide,
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

    const result = filterProOrdersBySide(orders, DEFAULT_PRO_ORDER_SIDE_FILTER);

    expect(result).toEqual(orders);
  });

  it('filters opening orders by their own side', () => {
    const longOrder = makeOrder({ orderId: 'long', side: 'buy' });
    const shortOrder = makeOrder({ orderId: 'short', side: 'sell' });

    const longResult = filterProOrdersBySide([longOrder, shortOrder], 'long');
    const shortResult = filterProOrdersBySide([longOrder, shortOrder], 'short');

    expect(longResult).toEqual([longOrder]);
    expect(shortResult).toEqual([shortOrder]);
  });

  it('groups a reduce-only close-long order under short, not long', () => {
    const closeLongOrder = makeOrder({
      orderId: 'close-long',
      side: 'sell',
      reduceOnly: true,
    });

    const longResult = filterProOrdersBySide([closeLongOrder], 'long');
    const shortResult = filterProOrdersBySide([closeLongOrder], 'short');

    expect(longResult).toEqual([]);
    expect(shortResult).toEqual([closeLongOrder]);
  });

  it('groups a trigger close-long order under short, not long', () => {
    const tpslCloseLongOrder = makeOrder({
      orderId: 'tpsl-close-long',
      side: 'sell',
      isTrigger: true,
      detailedOrderType: 'Stop Market',
    });

    const longResult = filterProOrdersBySide([tpslCloseLongOrder], 'long');
    const shortResult = filterProOrdersBySide([tpslCloseLongOrder], 'short');

    expect(longResult).toEqual([]);
    expect(shortResult).toEqual([tpslCloseLongOrder]);
  });

  it('groups a reduce-only close-short order under long, not short', () => {
    const closeShortOrder = makeOrder({
      orderId: 'close-short',
      side: 'buy',
      reduceOnly: true,
    });

    const longResult = filterProOrdersBySide([closeShortOrder], 'long');
    const shortResult = filterProOrdersBySide([closeShortOrder], 'short');

    expect(longResult).toEqual([closeShortOrder]);
    expect(shortResult).toEqual([]);
  });

  it('keeps closing orders in the list when the filter is all', () => {
    const closeLongOrder = makeOrder({
      orderId: 'close-long',
      side: 'sell',
      reduceOnly: true,
    });
    const orders = [makeOrder({ orderId: 'open-long' }), closeLongOrder];

    const result = filterProOrdersBySide(orders, DEFAULT_PRO_ORDER_SIDE_FILTER);

    expect(result).toEqual(orders);
  });
});

describe('filterProTwapOrdersBySide', () => {
  const makeTwapOrder = (overrides: Partial<TwapOrder> = {}): TwapOrder => ({
    orderId: 'twap-1',
    symbol: 'BTC',
    side: 'buy',
    size: '10',
    executedSize: '4',
    remainingSize: '6',
    executedNotional: '400',
    fillProgressBps: 4000,
    timeProgressBps: 5000,
    elapsedTimeMilliseconds: 60_000,
    durationMinutes: 30,
    randomize: false,
    reduceOnly: false,
    status: 'active',
    startedAt: 1_000,
    lastUpdated: 2_000,
    fills: [],
    ...overrides,
  });

  it('groups a buy schedule under long', () => {
    const buySchedule = makeTwapOrder({ orderId: 'buy', side: 'buy' });

    const result = filterProTwapOrdersBySide([buySchedule], 'long');

    expect(result).toEqual([buySchedule]);
  });

  it('groups a sell schedule under short', () => {
    const sellSchedule = makeTwapOrder({ orderId: 'sell', side: 'sell' });

    const result = filterProTwapOrdersBySide([sellSchedule], 'short');

    expect(result).toEqual([sellSchedule]);
  });

  it('does not invert a reduce-only schedule', () => {
    const reduceOnlySell = makeTwapOrder({
      orderId: 'reduce-only',
      side: 'sell',
      reduceOnly: true,
    });

    const longResult = filterProTwapOrdersBySide([reduceOnlySell], 'long');
    const shortResult = filterProTwapOrdersBySide([reduceOnlySell], 'short');

    expect(longResult).toEqual([]);
    expect(shortResult).toEqual([reduceOnlySell]);
  });

  it('returns every schedule when the filter is all', () => {
    const schedules = [
      makeTwapOrder({ orderId: 'buy', side: 'buy' }),
      makeTwapOrder({ orderId: 'sell', side: 'sell' }),
    ];

    const result = filterProTwapOrdersBySide(
      schedules,
      DEFAULT_PRO_ORDER_SIDE_FILTER,
    );

    expect(result).toEqual(schedules);
  });
});
