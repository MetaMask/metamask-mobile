import {
  buildDisplayOrdersWithSyntheticTpsl,
  isOrderAssociatedWithFullPosition,
  isSyntheticOrderCancelable,
  isSyntheticPlaceholderOrderId,
  shouldDisplayOrderInMarketDetailsOrders,
  formatOrderLabel,
  getOrderLabelDirection,
  getOrderDirection,
  willFlipPosition,
  determineMakerStatus,
} from './orderUtils';
import { Order, OrderParams } from '@metamask/perps-controller';
import { Position } from '../hooks';

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

describe('orderUtils', () => {
  describe('formatOrderLabel', () => {
    it('should format opening long market order', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: false,
        isTrigger: false,
      };

      expect(formatOrderLabel(order)).toBe('Market long');
    });

    it('should format opening short market order', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: false,
        isTrigger: false,
      };

      expect(formatOrderLabel(order)).toBe('Market short');
    });

    it('should format closing long market order (sell side with reduceOnly)', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: false,
      };

      expect(formatOrderLabel(order)).toBe('Market close long');
    });

    it('should format closing short market order (buy side with reduceOnly)', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: false,
      };

      expect(formatOrderLabel(order)).toBe('Market close short');
    });

    it('should format limit long order', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'ETH',
        side: 'buy',
        orderType: 'limit',
        size: '1',
        originalSize: '1',
        price: '3000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: false,
        isTrigger: false,
      };

      expect(formatOrderLabel(order)).toBe('Limit long');
    });

    it('should format limit close short order', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'ETH',
        side: 'buy',
        orderType: 'limit',
        size: '1',
        originalSize: '1',
        price: '3000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: false,
      };

      expect(formatOrderLabel(order)).toBe('Limit close short');
    });

    it('should use detailedOrderType when available for Stop Market', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        detailedOrderType: 'Stop Market',
        size: '1',
        originalSize: '1',
        price: '45000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: true,
      };

      expect(formatOrderLabel(order)).toBe('Stop market close long');
    });

    it('should use detailedOrderType for Take Profit Limit', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'limit',
        detailedOrderType: 'Take Profit Limit',
        size: '1',
        originalSize: '1',
        price: '55000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: true,
      };

      expect(formatOrderLabel(order)).toBe('Take profit limit close long');
    });

    it('should handle trigger orders as closing orders', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'ETH',
        side: 'buy',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '2800',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: false,
        isTrigger: true,
      };

      expect(formatOrderLabel(order)).toBe('Market close short');
    });
  });

  describe('getOrderLabelDirection', () => {
    it('should return "long" for opening buy order', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: false,
        isTrigger: false,
      };

      expect(getOrderLabelDirection(order)).toBe('long');
    });

    it('should return "short" for opening sell order', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: false,
        isTrigger: false,
      };

      expect(getOrderLabelDirection(order)).toBe('short');
    });

    it('should return "Close Long" for closing long position', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'sell',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: false,
      };

      expect(getOrderLabelDirection(order)).toBe('Close Long');
    });

    it('should return "Close Short" for closing short position', () => {
      const order: Order = {
        orderId: '1',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'market',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
        reduceOnly: true,
        isTrigger: false,
      };

      expect(getOrderLabelDirection(order)).toBe('Close Short');
    });
  });

  describe('getOrderDirection', () => {
    it('should return long for buy with no position', () => {
      const result = getOrderDirection('buy', undefined);
      expect(result).toBe('long');
    });

    it('should return short for sell with no position', () => {
      const result = getOrderDirection('sell', undefined);
      expect(result).toBe('short');
    });

    it('should return long for positive position', () => {
      const result = getOrderDirection('sell', '1.5');
      expect(result).toBe('long');
    });

    it('should return short for negative position', () => {
      const result = getOrderDirection('buy', '-1.5');
      expect(result).toBe('short');
    });
  });

  describe('order display association helpers', () => {
    const mockLongPosition: Position = {
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

    const mockShortPosition: Position = {
      ...mockLongPosition,
      size: '-1.0',
    };

    const mockReduceOnlyOrder: Order = {
      orderId: 'tp-order',
      symbol: 'BTC',
      side: 'sell',
      orderType: 'limit',
      size: '1.0',
      originalSize: '1.0',
      price: '50000',
      filledSize: '0',
      remainingSize: '1.0',
      status: 'open',
      timestamp: Date.now(),
      reduceOnly: true,
      isTrigger: true,
    };

    it('associates full-position TP/SL via native flag', () => {
      const result = isOrderAssociatedWithFullPosition(
        { ...mockReduceOnlyOrder, isPositionTpsl: true },
        mockLongPosition,
      );

      expect(result).toBe(true);
    });

    it('associates full-position TP/SL via size fallback when flag is missing', () => {
      const result = isOrderAssociatedWithFullPosition(
        mockReduceOnlyOrder,
        mockLongPosition,
      );

      expect(result).toBe(true);
    });

    it('associates full-position TP/SL for short positions via size fallback when flag is missing', () => {
      const result = isOrderAssociatedWithFullPosition(
        { ...mockReduceOnlyOrder, side: 'buy' },
        mockShortPosition,
      );

      expect(result).toBe(true);
    });

    it('does not use size fallback when provider explicitly sets isPositionTpsl to false', () => {
      const result = isOrderAssociatedWithFullPosition(
        { ...mockReduceOnlyOrder, isPositionTpsl: false },
        mockLongPosition,
      );

      expect(result).toBe(false);
    });

    it('does not associate when reduce-only order size does not match full position', () => {
      const result = isOrderAssociatedWithFullPosition(
        { ...mockReduceOnlyOrder, size: '0.25', originalSize: '0.25' },
        mockLongPosition,
      );

      expect(result).toBe(false);
    });

    it('does not associate when side does not close the existing position', () => {
      const result = isOrderAssociatedWithFullPosition(
        { ...mockReduceOnlyOrder, side: 'buy' },
        mockLongPosition,
      );

      expect(result).toBe(false);
    });

    it('shows non-reduce-only orders in Market Details orders section', () => {
      const result = shouldDisplayOrderInMarketDetailsOrders(
        { ...mockReduceOnlyOrder, reduceOnly: false },
        mockLongPosition,
      );

      expect(result).toBe(true);
    });

    it('hides full-position reduce-only TP/SL orders from Market Details orders section', () => {
      const result = shouldDisplayOrderInMarketDetailsOrders(
        { ...mockReduceOnlyOrder, isPositionTpsl: true },
        mockLongPosition,
      );

      expect(result).toBe(false);
    });

    it('hides full-position reduce-only TP/SL orders for short positions from Market Details orders section', () => {
      const result = shouldDisplayOrderInMarketDetailsOrders(
        { ...mockReduceOnlyOrder, side: 'buy' },
        mockShortPosition,
      );

      expect(result).toBe(false);
    });

    it('shows standalone reduce-only TP/SL orders in Market Details orders section', () => {
      const result = shouldDisplayOrderInMarketDetailsOrders(
        { ...mockReduceOnlyOrder, size: '0.25', originalSize: '0.25' },
        mockLongPosition,
      );

      expect(result).toBe(true);
    });
  });

  describe('buildDisplayOrdersWithSyntheticTpsl', () => {
    const timestamp = 1730151332000;

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

    it('creates a synthetic TP row from parent TP metadata', () => {
      const result = buildDisplayOrdersWithSyntheticTpsl([
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
        },
      ]);

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        orderId: 'parent-limit-1-synthetic-tp',
        parentOrderId: 'parent-limit-1',
        isSynthetic: true,
        isTrigger: true,
        reduceOnly: true,
        side: 'sell',
        detailedOrderType: 'Take Profit Limit',
        triggerPrice: '95000',
        price: '95000',
      });
    });

    it('creates both TP and SL synthetic rows when both prices exist', () => {
      const result = buildDisplayOrdersWithSyntheticTpsl([
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
          stopLossPrice: '89000',
        },
      ]);

      expect(result).toHaveLength(3);
      expect(result.map((order) => order.orderId)).toEqual([
        'parent-limit-1',
        'parent-limit-1-synthetic-tp',
        'parent-limit-1-synthetic-sl',
      ]);
    });

    it('uses existing child TP/SL order IDs as synthetic row cancel targets when available', () => {
      const result = buildDisplayOrdersWithSyntheticTpsl([
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
          stopLossPrice: '89000',
          takeProfitOrderId: 'child-tp-order-id',
          stopLossOrderId: 'child-sl-order-id',
        },
      ]);

      expect(result).toHaveLength(3);
      expect(result.map((order) => order.orderId)).toEqual([
        'parent-limit-1',
        'child-tp-order-id',
        'child-sl-order-id',
      ]);
      expect(result[1].isSynthetic).toBe(true);
      expect(result[2].isSynthetic).toBe(true);
    });

    it('does not create duplicate synthetic row when matching real child trigger exists', () => {
      const result = buildDisplayOrdersWithSyntheticTpsl([
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
          takeProfitOrderId: 'real-child-tp',
        },
        {
          orderId: 'real-child-tp',
          symbol: 'BTC',
          side: 'sell',
          orderType: 'limit',
          size: '0.5',
          originalSize: '0.5',
          price: '95000',
          filledSize: '0',
          remainingSize: '0.5',
          status: 'open',
          timestamp,
          detailedOrderType: 'Take Profit Limit',
          isTrigger: true,
          reduceOnly: true,
          triggerPrice: '95000',
        },
      ]);

      expect(result).toHaveLength(2);
      expect(result.find((order) => order.isSynthetic)).toBeUndefined();
    });

    it('does not suppress synthetic rows for a different parent with the same trigger price', () => {
      const secondParentOrder: Order = {
        ...parentLimitOrder,
        orderId: 'parent-limit-2',
      };

      const result = buildDisplayOrdersWithSyntheticTpsl([
        {
          ...parentLimitOrder,
          takeProfitPrice: '95000',
          takeProfitOrderId: 'real-child-parent-1',
        },
        {
          ...secondParentOrder,
          takeProfitPrice: '95000',
        },
        {
          orderId: 'real-child-parent-1',
          symbol: 'BTC',
          side: 'sell',
          orderType: 'limit',
          size: '0.5',
          originalSize: '0.5',
          price: '95000',
          filledSize: '0',
          remainingSize: '0.5',
          status: 'open',
          timestamp,
          detailedOrderType: 'Take Profit Limit',
          isTrigger: true,
          reduceOnly: true,
          triggerPrice: '95000',
        },
      ]);

      expect(result).toHaveLength(4);
      expect(
        result.find((order) => order.orderId === 'parent-limit-1-synthetic-tp'),
      ).toBeUndefined();
      expect(
        result.find((order) => order.orderId === 'parent-limit-2-synthetic-tp'),
      ).toBeDefined();
    });
  });

  describe('synthetic order cancelability', () => {
    it('detects placeholder synthetic IDs', () => {
      expect(isSyntheticPlaceholderOrderId('abc-synthetic-tp')).toBe(true);
      expect(isSyntheticPlaceholderOrderId('abc-synthetic-sl')).toBe(true);
      expect(isSyntheticPlaceholderOrderId('real-child-id-123')).toBe(false);
    });

    it('treats non-synthetic orders as cancelable', () => {
      const order: Order = {
        orderId: 'real-order',
        symbol: 'BTC',
        side: 'buy',
        orderType: 'limit',
        size: '1',
        originalSize: '1',
        price: '50000',
        filledSize: '0',
        remainingSize: '1',
        status: 'open',
        timestamp: Date.now(),
      };

      expect(isSyntheticOrderCancelable(order)).toBe(true);
    });

    it('treats synthetic placeholder orders as non-cancelable', () => {
      const syntheticOrder = {
        orderId: 'parent-123-synthetic-tp',
        isSynthetic: true,
      } as Order;

      expect(isSyntheticOrderCancelable(syntheticOrder)).toBe(false);
    });

    it('treats synthetic orders with real child IDs as cancelable', () => {
      const syntheticOrder = {
        orderId: 'child-tp-order-id',
        isSynthetic: true,
      } as Order;

      expect(isSyntheticOrderCancelable(syntheticOrder)).toBe(true);
    });
  });

  describe('willFlipPosition', () => {
    const mockPosition: Position = {
      size: '100',
      entryPrice: '50000',
      unrealizedPnl: '100',
      liquidationPrice: '40000',
      leverage: { type: 'isolated', value: 2 },
      symbol: 'BTC',
      positionValue: '100000',
      marginUsed: '2500',
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

    const mockOrderParams: OrderParams = {
      symbol: 'BTC',
      isBuy: false,
      size: '150',
      orderType: 'market',
      reduceOnly: false,
    };

    it('returns false when reduceOnly is true', () => {
      const orderParams = { ...mockOrderParams, reduceOnly: true };
      const result = willFlipPosition(mockPosition, orderParams);
      expect(result).toBe(false);
    });

    it('returns false when orderType is not market', () => {
      const orderParams = {
        ...mockOrderParams,
        orderType: 'limit' as OrderParams['orderType'],
      };
      const result = willFlipPosition(mockPosition, orderParams);
      expect(result).toBe(false);
    });

    it('returns false when position and order direction match', () => {
      const orderParams = { ...mockOrderParams, isBuy: true };
      const result = willFlipPosition(mockPosition, orderParams);
      expect(result).toBe(false);
    });

    it('returns true when order size exceeds absolute position size', () => {
      const result = willFlipPosition(mockPosition, mockOrderParams);
      expect(result).toBe(true);
    });

    it('returns false when order size does not exceed absolute position size', () => {
      const orderParams = { ...mockOrderParams, size: '50' };
      const result = willFlipPosition(mockPosition, orderParams);
      expect(result).toBe(false);
    });

    it('returns false when order size equals position size', () => {
      const currentPosition: Position = {
        symbol: 'BTC',
        size: '0.5',
        entryPrice: '45000',
        positionValue: '22500',
        unrealizedPnl: '0',
        marginUsed: '500',
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

      const orderParams: OrderParams = {
        symbol: 'BTC',
        isBuy: false,
        size: '0.5',
        orderType: 'market',
      };

      const result = willFlipPosition(currentPosition, orderParams);
      expect(result).toBe(false);
    });

    it('handles negative position sizes correctly', () => {
      const currentPosition: Position = {
        symbol: 'BTC',
        size: '-0.5',
        entryPrice: '45000',
        positionValue: '22500',
        unrealizedPnl: '0',
        marginUsed: '500',
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

      const orderParams: OrderParams = {
        symbol: 'BTC',
        isBuy: true,
        size: '1.0',
        orderType: 'market',
      };

      const result = willFlipPosition(currentPosition, orderParams);
      expect(result).toBe(true);
    });
  });

  describe('determineMakerStatus', () => {
    describe('Market Orders', () => {
      it('treats market orders as taker regardless of price', () => {
        const result = determineMakerStatus({
          orderType: 'market',
          direction: 'long',
          limitPrice: '50000',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });
    });

    describe('Limit Orders - Long Direction', () => {
      it('treats buy limit above ask as taker', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '50100',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('treats buy limit at ask price as taker', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '50001',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('treats buy limit below ask as maker', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '49500',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(true);
      });
    });

    describe('Limit Orders - Short Direction', () => {
      it('treats sell limit below bid as taker', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'short',
          limitPrice: '49900',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('treats sell limit at bid price as taker', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'short',
          limitPrice: '49999',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('treats sell limit above bid as maker', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'short',
          limitPrice: '50500',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('defaults to taker when limitPrice is missing', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('defaults to taker when limitPrice is empty string', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('defaults to taker when limitPrice is NaN', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: 'invalid',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('defaults to taker when limitPrice is zero', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '0',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('defaults to taker when limitPrice is negative', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '-1000',
          bestAsk: 50001,
          bestBid: 49999,
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('defaults to taker when bid/ask data is unavailable', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '49500',
          symbol: 'BTC',
        });

        expect(result).toBe(false);
      });
    });
  });
});
