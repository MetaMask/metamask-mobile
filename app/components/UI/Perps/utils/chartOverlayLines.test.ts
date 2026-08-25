import type { Order, Position } from '@metamask/perps-controller';
import {
  buildChartOverlayLines,
  getChartLimitOrderLines,
} from './chartOverlayLines';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: 'limit-1',
  symbol: 'BTC',
  side: 'buy',
  orderType: 'limit',
  size: '1',
  originalSize: '1',
  price: '50000',
  filledSize: '0',
  remainingSize: '1',
  status: 'open',
  timestamp: 1,
  reduceOnly: false,
  isTrigger: false,
  ...overrides,
});

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  symbol: 'BTC',
  size: '1',
  entryPrice: '49000',
  positionValue: '49000',
  unrealizedPnl: '0',
  marginUsed: '4900',
  leverage: { type: 'isolated', value: 10 },
  liquidationPrice: '40000',
  maxLeverage: 40,
  returnOnEquity: '0',
  cumulativeFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

describe('getChartLimitOrderLines', () => {
  it('returns a buy line for an open resting limit', () => {
    const orders = [makeOrder()];

    const result = getChartLimitOrderLines(orders);

    expect(result).toEqual([{ id: 'limit-1', price: '50000', side: 'buy' }]);
  });

  it('maps sell limits to sell overlay side', () => {
    const orders = [makeOrder({ orderId: 'limit-sell', side: 'sell' })];

    const result = getChartLimitOrderLines(orders);

    expect(result).toEqual([
      { id: 'limit-sell', price: '50000', side: 'sell' },
    ]);
  });

  it('includes limits identified only by detailedOrderType', () => {
    const orders = [
      makeOrder({
        orderId: 'detailed-limit',
        orderType: 'market',
        detailedOrderType: 'Limit',
      }),
    ];

    const result = getChartLimitOrderLines(orders);

    expect(result).toEqual([
      { id: 'detailed-limit', price: '50000', side: 'buy' },
    ]);
  });

  it('skips filled and canceled orders', () => {
    const orders = [
      makeOrder({ orderId: 'filled', status: 'filled' }),
      makeOrder({ orderId: 'canceled', status: 'canceled' }),
    ];

    expect(getChartLimitOrderLines(orders)).toEqual([]);
  });

  it('skips synthetic placeholder orders', () => {
    const orders = [makeOrder({ isSynthetic: true })];

    expect(getChartLimitOrderLines(orders)).toEqual([]);
  });

  it('skips trigger TP/SL even when detailed type includes limit', () => {
    const orders = [
      makeOrder({
        orderId: 'stop-limit',
        isTrigger: true,
        detailedOrderType: 'Stop Limit',
      }),
    ];

    expect(getChartLimitOrderLines(orders)).toEqual([]);
  });

  it('skips market orders that are not limits', () => {
    const orders = [
      makeOrder({ orderType: 'market', detailedOrderType: 'Market' }),
    ];

    expect(getChartLimitOrderLines(orders)).toEqual([]);
  });

  it('skips limits with a missing or non-positive price', () => {
    const orders = [
      makeOrder({ orderId: 'blank', price: '' }),
      makeOrder({ orderId: 'zero', price: '0' }),
    ];

    expect(getChartLimitOrderLines(orders)).toEqual([]);
  });
});

describe('buildChartOverlayLines', () => {
  it('returns undefined when there is no price, position, or limit', () => {
    const result = buildChartOverlayLines({
      limitOrders: [],
    });

    expect(result).toBeUndefined();
  });

  it('returns limitOrders without an entry price', () => {
    const limitOrders = [
      { id: 'limit-1', price: '50000', side: 'buy' as const },
    ];

    const result = buildChartOverlayLines({
      currentPrice: '50500',
      limitOrders,
    });

    expect(result).toEqual({
      currentPrice: '50500',
      limitOrders,
    });
  });

  it('copies position TPSL onto the overlay with limit lines', () => {
    const limitOrders = [
      { id: 'limit-1', price: '50000', side: 'buy' as const },
    ];
    const existingPosition = makePosition({
      takeProfitPrice: '55000',
      stopLossPrice: '45000',
    });

    const result = buildChartOverlayLines({
      currentPrice: '50500',
      existingPosition,
      limitOrders,
    });

    expect(result).toEqual({
      currentPrice: '50500',
      entryPrice: '49000',
      takeProfitPrice: '55000',
      stopLossPrice: '45000',
      liquidationPrice: '40000',
      limitOrders,
    });
  });
});
