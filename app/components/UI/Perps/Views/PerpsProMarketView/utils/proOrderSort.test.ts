import type { Order } from '@metamask/perps-controller';
import { DEFAULT_PRO_ORDER_SORT, sortProOrders } from './proOrderSort';

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

describe('sortProOrders', () => {
  it('defaults to newest order first', () => {
    const orders = [
      makeOrder({ orderId: 'old', timestamp: 100 }),
      makeOrder({ orderId: 'new', timestamp: 300 }),
      makeOrder({ orderId: 'middle', timestamp: 200 }),
    ];

    const result = sortProOrders(orders, DEFAULT_PRO_ORDER_SORT);

    expect(result.map((order) => order.orderId)).toEqual([
      'new',
      'middle',
      'old',
    ]);
  });

  it('sorts order value from high to low', () => {
    const orders = [
      makeOrder({ orderId: 'small', originalSize: '1', price: '100' }),
      makeOrder({ orderId: 'large', originalSize: '5', price: '50' }),
    ];

    const result = sortProOrders(orders, {
      field: 'orderValue',
      direction: 'desc',
    });

    expect(result.map((order) => order.orderId)).toEqual(['large', 'small']);
  });

  it('sorts absolute size from low to high', () => {
    const orders = [
      makeOrder({ orderId: 'large', originalSize: '5' }),
      makeOrder({ orderId: 'small', originalSize: '1' }),
    ];

    const result = sortProOrders(orders, {
      field: 'size',
      direction: 'asc',
    });

    expect(result.map((order) => order.orderId)).toEqual(['small', 'large']);
  });

  it('sorts trigger-limit orders using their displayed limit price', () => {
    const orders = [
      makeOrder({
        orderId: 'high',
        isTrigger: true,
        triggerOrderType: 'take_profit_limit',
        triggerPrice: '200',
        price: '100',
      }),
      makeOrder({
        orderId: 'low',
        isTrigger: true,
        triggerOrderType: 'take_profit_limit',
        triggerPrice: '150',
        price: '300',
      }),
    ];

    const result = sortProOrders(orders, {
      field: 'price',
      direction: 'asc',
    });

    expect(result.map((order) => order.orderId)).toEqual(['high', 'low']);
  });

  it.each(['price', 'orderValue'] as const)(
    'sorts trigger-market %s using its estimated price',
    (field) => {
      const orders = [
        makeOrder({
          orderId: 'limit',
          price: '100',
        }),
        makeOrder({
          orderId: 'trigger-market',
          orderType: 'market',
          isTrigger: true,
          triggerOrderType: 'stop_market',
          detailedOrderType: 'Stop Market',
          triggerPrice: '200',
          price: '198',
        }),
      ];

      const result = sortProOrders(orders, {
        field,
        direction: 'asc',
      });

      expect(result.map((order) => order.orderId)).toEqual([
        'limit',
        'trigger-market',
      ]);
    },
  );
});
