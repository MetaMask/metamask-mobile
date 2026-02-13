import { type Order, type Position } from '@metamask/perps-controller';
import { normalizeMarketDetailsOrders } from './normalizeMarketDetailsOrders';

describe('normalizeMarketDetailsOrders', () => {
  const timestamp = 1730151332000;

  const mockPosition: Position = {
    symbol: 'BTC',
    size: '1.0',
    entryPrice: '45000',
    positionValue: '45000',
    unrealizedPnl: '0',
    marginUsed: '2000',
    leverage: { type: 'isolated', value: 5 },
    liquidationPrice: '40000',
    maxLeverage: 20,
    returnOnEquity: '0',
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  const parentLimitOrder: Order = {
    orderId: 'parent-limit-1',
    symbol: 'BTC',
    side: 'buy',
    orderType: 'limit',
    size: '0.5',
    originalSize: '0.5',
    price: '92000',
    filledSize: '0',
    remainingSize: '0.5',
    status: 'open',
    timestamp,
    isTrigger: false,
    reduceOnly: false,
  };

  it('returns empty array when no orders are provided', () => {
    const result = normalizeMarketDetailsOrders({ orders: [] });
    expect(result).toEqual([]);
  });

  it('hides full-position reduce-only TP/SL and keeps non-reduce-only parent orders', () => {
    const result = normalizeMarketDetailsOrders({
      orders: [
        parentLimitOrder,
        {
          ...parentLimitOrder,
          orderId: 'full-position-tpsl',
          side: 'sell',
          reduceOnly: true,
          isTrigger: true,
          detailedOrderType: 'Take Profit Limit',
          size: '1.0',
          originalSize: '1.0',
          isPositionTpsl: true,
        },
      ],
      existingPosition: mockPosition,
    });

    expect(result.map((order) => order.orderId)).toEqual(['parent-limit-1']);
  });

  it('shows standalone reduce-only TP/SL orders in market details', () => {
    const result = normalizeMarketDetailsOrders({
      orders: [
        {
          ...parentLimitOrder,
          orderId: 'standalone-tpsl',
          side: 'sell',
          reduceOnly: true,
          isTrigger: true,
          detailedOrderType: 'Take Profit Limit',
          size: '0.25',
          originalSize: '0.25',
          isPositionTpsl: false,
        },
      ],
      existingPosition: mockPosition,
    });

    expect(result.map((order) => order.orderId)).toEqual(['standalone-tpsl']);
  });

  it('creates synthetic TP/SL rows when parent includes TP/SL metadata', () => {
    const result = normalizeMarketDetailsOrders({
      orders: [
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
          stopLossPrice: '89000',
        },
      ],
    });

    expect(result.map((order) => order.orderId)).toEqual([
      'parent-limit-1',
      'parent-limit-1-synthetic-tp',
      'parent-limit-1-synthetic-sl',
    ]);
  });

  it('does not add duplicate synthetic rows when real child trigger order exists', () => {
    const result = normalizeMarketDetailsOrders({
      orders: [
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
          takeProfitOrderId: 'real-child-tp',
        },
        {
          ...parentLimitOrder,
          orderId: 'real-child-tp',
          side: 'sell',
          isTrigger: true,
          reduceOnly: true,
          detailedOrderType: 'Take Profit Limit',
          triggerPrice: '95000',
          price: '95000',
          parentOrderId: 'parent-limit-1',
        },
      ],
    });

    expect(result.map((order) => order.orderId)).toEqual([
      'parent-limit-1',
      'real-child-tp',
    ]);
    expect(result.find((order) => order.isSynthetic)).toBeUndefined();
  });
});
