import {
  formatOrderLabel,
  getOrderLabelDirection,
  getOrderDirection,
  willFlipPosition,
  determineMakerStatus,
  isTakeProfitOrderType,
  isStopLossOrderType,
  determineTpSlFromPrice,
  extractTpSlTypeFromOrder,
} from './orderUtils';
import { Order, OrderParams } from '../controllers/types';
import { Position } from '../hooks';

// Mock i18n strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

import { strings } from '../../../../../locales/i18n';

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
    const mockStrings = strings as jest.MockedFunction<typeof strings>;

    it('should return long for buy with no position', () => {
      mockStrings.mockImplementation((key: string) => {
        if (key === 'perps.market.long') return 'Long';
        if (key === 'perps.market.short') return 'Short';
        return key;
      });

      const result = getOrderDirection('buy', undefined);
      expect(result).toBe('Long');
    });

    it('should return short for sell with no position', () => {
      mockStrings.mockImplementation((key: string) => {
        if (key === 'perps.market.long') return 'Long';
        if (key === 'perps.market.short') return 'Short';
        return key;
      });

      const result = getOrderDirection('sell', undefined);
      expect(result).toBe('Short');
    });

    it('should return long for positive position', () => {
      mockStrings.mockImplementation((key: string) => {
        if (key === 'perps.market.long') return 'Long';
        if (key === 'perps.market.short') return 'Short';
        return key;
      });

      const result = getOrderDirection('sell', '1.5');
      expect(result).toBe('Long');
    });

    it('should return short for negative position', () => {
      mockStrings.mockImplementation((key: string) => {
        if (key === 'perps.market.long') return 'Long';
        if (key === 'perps.market.short') return 'Short';
        return key;
      });

      const result = getOrderDirection('buy', '-1.5');
      expect(result).toBe('Short');
    });
  });

  describe('willFlipPosition', () => {
    const mockPosition: Position = {
      size: '100',
      entryPrice: '50000',
      unrealizedPnl: '100',
      liquidationPrice: '40000',
      leverage: { type: 'isolated', value: 2 },
      coin: 'BTC',
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
      coin: 'BTC',
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
        coin: 'BTC',
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
        coin: 'BTC',
        isBuy: false,
        size: '0.5',
        orderType: 'market',
      };

      const result = willFlipPosition(currentPosition, orderParams);
      expect(result).toBe(false);
    });

    it('handles negative position sizes correctly', () => {
      const currentPosition: Position = {
        coin: 'BTC',
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
        coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
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
          coin: 'BTC',
        });

        expect(result).toBe(false);
      });

      it('defaults to taker when bid/ask data is unavailable', () => {
        const result = determineMakerStatus({
          orderType: 'limit',
          direction: 'long',
          limitPrice: '49500',
          coin: 'BTC',
        });

        expect(result).toBe(false);
      });
    });
  });

  describe('isTakeProfitOrderType', () => {
    it('returns true for Take Profit Market order', () => {
      const result = isTakeProfitOrderType('Take Profit Market');

      expect(result).toBe(true);
    });

    it('returns true for Take Profit Limit order', () => {
      const result = isTakeProfitOrderType('Take Profit Limit');

      expect(result).toBe(true);
    });

    it('returns false for Stop Market order', () => {
      const result = isTakeProfitOrderType('Stop Market');

      expect(result).toBe(false);
    });

    it('returns false for Stop Limit order', () => {
      const result = isTakeProfitOrderType('Stop Limit');

      expect(result).toBe(false);
    });

    it('returns false for regular Limit order', () => {
      const result = isTakeProfitOrderType('Limit');

      expect(result).toBe(false);
    });

    it('returns false for undefined order type', () => {
      const result = isTakeProfitOrderType(undefined);

      expect(result).toBe(false);
    });
  });

  describe('isStopLossOrderType', () => {
    it('returns true for Stop Market order', () => {
      const result = isStopLossOrderType('Stop Market');

      expect(result).toBe(true);
    });

    it('returns true for Stop Limit order', () => {
      const result = isStopLossOrderType('Stop Limit');

      expect(result).toBe(true);
    });

    it('returns false for Take Profit Market order', () => {
      const result = isStopLossOrderType('Take Profit Market');

      expect(result).toBe(false);
    });

    it('returns false for Take Profit Limit order', () => {
      const result = isStopLossOrderType('Take Profit Limit');

      expect(result).toBe(false);
    });

    it('returns false for regular Limit order', () => {
      const result = isStopLossOrderType('Limit');

      expect(result).toBe(false);
    });

    it('returns false for undefined order type', () => {
      const result = isStopLossOrderType(undefined);

      expect(result).toBe(false);
    });
  });

  describe('determineTpSlFromPrice', () => {
    describe('long positions', () => {
      it('returns takeProfit when trigger price is above entry price', () => {
        const result = determineTpSlFromPrice(55000, 50000, true);

        expect(result).toBe('takeProfit');
      });

      it('returns stopLoss when trigger price is below entry price', () => {
        const result = determineTpSlFromPrice(45000, 50000, true);

        expect(result).toBe('stopLoss');
      });

      it('returns stopLoss when trigger price equals entry price', () => {
        const result = determineTpSlFromPrice(50000, 50000, true);

        expect(result).toBe('stopLoss');
      });
    });

    describe('short positions', () => {
      it('returns takeProfit when trigger price is below entry price', () => {
        const result = determineTpSlFromPrice(45000, 50000, false);

        expect(result).toBe('takeProfit');
      });

      it('returns stopLoss when trigger price is above entry price', () => {
        const result = determineTpSlFromPrice(55000, 50000, false);

        expect(result).toBe('stopLoss');
      });

      it('returns stopLoss when trigger price equals entry price', () => {
        const result = determineTpSlFromPrice(50000, 50000, false);

        expect(result).toBe('stopLoss');
      });
    });
  });

  describe('extractTpSlTypeFromOrder', () => {
    it('returns takeProfit for Take Profit Market order', () => {
      const order = { orderType: 'Take Profit Market', triggerPx: '55000' };

      const result = extractTpSlTypeFromOrder(order);

      expect(result).toBe('takeProfit');
    });

    it('returns takeProfit for Take Profit Limit order', () => {
      const order = { orderType: 'Take Profit Limit', triggerPx: '55000' };

      const result = extractTpSlTypeFromOrder(order);

      expect(result).toBe('takeProfit');
    });

    it('returns stopLoss for Stop Market order', () => {
      const order = { orderType: 'Stop Market', triggerPx: '45000' };

      const result = extractTpSlTypeFromOrder(order);

      expect(result).toBe('stopLoss');
    });

    it('returns stopLoss for Stop Limit order', () => {
      const order = { orderType: 'Stop Limit', triggerPx: '45000' };

      const result = extractTpSlTypeFromOrder(order);

      expect(result).toBe('stopLoss');
    });

    it('returns null when order has no triggerPx', () => {
      const order = { orderType: 'Take Profit Market' };

      const result = extractTpSlTypeFromOrder(order);

      expect(result).toBeNull();
    });

    it('falls back to price-based detection for long position when orderType is ambiguous', () => {
      const order = { orderType: 'Trigger', triggerPx: '55000' };
      const position = { size: '1.0', entryPrice: '50000' };

      const result = extractTpSlTypeFromOrder(order, position);

      expect(result).toBe('takeProfit');
    });

    it('falls back to price-based detection for short position when orderType is ambiguous', () => {
      const order = { orderType: 'Trigger', triggerPx: '45000' };
      const position = { size: '-1.0', entryPrice: '50000' };

      const result = extractTpSlTypeFromOrder(order, position);

      expect(result).toBe('takeProfit');
    });

    it('returns null when orderType is ambiguous and no position provided', () => {
      const order = { orderType: 'Trigger', triggerPx: '55000' };

      const result = extractTpSlTypeFromOrder(order);

      expect(result).toBeNull();
    });

    it('returns null when orderType is ambiguous and position has no entry price', () => {
      const order = { orderType: 'Trigger', triggerPx: '55000' };
      const position = { size: '1.0' };

      const result = extractTpSlTypeFromOrder(order, position);

      expect(result).toBeNull();
    });
  });
});
