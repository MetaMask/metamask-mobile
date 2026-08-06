import type { Order, Position } from '@metamask/perps-controller';
import {
  getReservedReduceOnlySize,
  validateReduceOnlyOrder,
} from './reduceOnlyValidation';

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    symbol: 'BTC',
    size: '1',
    entryPrice: '50000',
    positionValue: '50000',
    unrealizedPnl: '0',
    marginUsed: '5000',
    leverage: { type: 'isolated', value: 10 },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '0',
    cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
    takeProfitCount: 0,
    stopLossCount: 0,
    ...overrides,
  }) as Position;

const createOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    orderId: 'order-1',
    symbol: 'BTC',
    side: 'sell',
    orderType: 'limit',
    size: '0.2',
    originalSize: '0.2',
    price: '51000',
    filledSize: '0',
    remainingSize: '0.2',
    status: 'open',
    timestamp: 1,
    reduceOnly: true,
    isTrigger: false,
    detailedOrderType: 'Limit',
    ...overrides,
  }) as Order;

describe('getReservedReduceOnlySize', () => {
  it('sums remaining size of matching open reduce-only closing orders', () => {
    const openOrders = [
      createOrder({ orderId: 'a', remainingSize: '0.2' }),
      createOrder({ orderId: 'b', remainingSize: '0.3' }),
    ];

    const reserved = getReservedReduceOnlySize({
      openOrders,
      symbol: 'BTC',
      positionDirection: 'long',
    });

    expect(reserved).toBeCloseTo(0.5);
  });

  it('excludes TP/SL trigger orders from reserved capacity', () => {
    const openOrders = [
      createOrder({
        orderId: 'trigger',
        remainingSize: '1',
        isTrigger: true,
        detailedOrderType: 'Take Profit Limit',
      }),
      createOrder({
        orderId: 'tpsl-type',
        remainingSize: '1',
        isTrigger: false,
        detailedOrderType: 'Stop Market',
      }),
      createOrder({ orderId: 'resting', remainingSize: '0.1' }),
    ];

    const reserved = getReservedReduceOnlySize({
      openOrders,
      symbol: 'BTC',
      positionDirection: 'long',
    });

    expect(reserved).toBeCloseTo(0.1);
  });

  it('excludes orders for a different symbol, side, status, or non-reduce-only', () => {
    const openOrders = [
      createOrder({
        orderId: 'other-symbol',
        symbol: 'ETH',
        remainingSize: '1',
      }),
      createOrder({
        orderId: 'wrong-side',
        side: 'buy',
        remainingSize: '1',
      }),
      createOrder({
        orderId: 'filled',
        status: 'filled',
        remainingSize: '1',
      }),
      createOrder({
        orderId: 'not-reduce',
        reduceOnly: false,
        remainingSize: '1',
      }),
      createOrder({ orderId: 'match', remainingSize: '0.25' }),
    ];

    const reserved = getReservedReduceOnlySize({
      openOrders,
      symbol: 'BTC',
      positionDirection: 'long',
    });

    expect(reserved).toBeCloseTo(0.25);
  });

  it('reserves buy-side reduce-only orders when closing a short', () => {
    const openOrders = [
      createOrder({
        orderId: 'close-short',
        side: 'buy',
        remainingSize: '0.4',
      }),
      createOrder({
        orderId: 'wrong-side',
        side: 'sell',
        remainingSize: '0.9',
      }),
    ];

    const reserved = getReservedReduceOnlySize({
      openOrders,
      symbol: 'BTC',
      positionDirection: 'short',
    });

    expect(reserved).toBeCloseTo(0.4);
  });
});

describe('validateReduceOnlyOrder', () => {
  it('returns valid when reduceOnly is false', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: false,
      direction: 'long',
      orderSize: '10',
      position: null,
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result).toEqual({
      isValid: true,
      isFullClose: false,
      remainingClosableSize: 0,
    });
  });

  it('returns no_position when there is no open position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.1',
      position: null,
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('no_position');
    expect(result.isValid).toBe(false);
    expect(result.isFullClose).toBe(false);
  });

  it('returns no_position when position size is zero', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.1',
      position: createPosition({ size: '0' }),
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('no_position');
    expect(result.isValid).toBe(false);
  });

  it('returns wrong_side when the order matches the position direction', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'long',
      orderSize: '0.1',
      position: createPosition({ size: '1' }),
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('wrong_side');
    expect(result.isValid).toBe(false);
  });

  it('returns wrong_side for a short position with a short order', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.1',
      position: createPosition({ size: '-1' }),
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('wrong_side');
    expect(result.isValid).toBe(false);
  });

  it('returns too_large when order size exceeds remaining closable capacity', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '1.1',
      position: createPosition({ size: '1' }),
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('too_large');
    expect(result.isValid).toBe(false);
    expect(result.remainingClosableSize).toBeCloseTo(1);
  });

  it('subtracts reserved resting reduce-only size before the too_large check', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.9',
      position: createPosition({ size: '1' }),
      openOrders: [createOrder({ remainingSize: '0.2' })],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('too_large');
    expect(result.remainingClosableSize).toBeCloseTo(0.8);
  });

  it('ignores TP/SL trigger orders when computing remaining closable size', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '1',
      position: createPosition({ size: '1' }),
      openOrders: [
        createOrder({
          remainingSize: '1',
          isTrigger: true,
          detailedOrderType: 'Take Profit Market',
        }),
      ],
      symbol: 'BTC',
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(true);
    expect(result.remainingClosableSize).toBeCloseTo(1);
  });

  it('marks a full close when order size equals remaining closable capacity', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.8',
      position: createPosition({ size: '1' }),
      openOrders: [createOrder({ remainingSize: '0.2' })],
      symbol: 'BTC',
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(true);
    expect(result.remainingClosableSize).toBeCloseTo(0.8);
  });

  it('accepts a partial reduce-only order below remaining capacity', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'long',
      orderSize: '0.25',
      position: createPosition({ size: '-1' }),
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(false);
    expect(result.remainingClosableSize).toBeCloseTo(1);
  });

  it('treats empty or non-positive order size as valid when side and position match', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '',
      position: createPosition({ size: '1' }),
      openOrders: [],
      symbol: 'BTC',
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(false);
  });

  it('clamps remaining closable size at zero when reserved exceeds position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.01',
      position: createPosition({ size: '0.5' }),
      openOrders: [createOrder({ remainingSize: '0.8' })],
      symbol: 'BTC',
    });

    expect(result.errorCode).toBe('too_large');
    expect(result.remainingClosableSize).toBe(0);
  });
});
