import { formatOrderLabel, getOrderLabelDirection } from './orderUtils';
import type { Order } from '../controllers/types';

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

      expect(formatOrderLabel(order)).toBe('Market Long');
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

      expect(formatOrderLabel(order)).toBe('Market Short');
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

      expect(formatOrderLabel(order)).toBe('Market Close Long');
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

      expect(formatOrderLabel(order)).toBe('Market Close Short');
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

      expect(formatOrderLabel(order)).toBe('Limit Long');
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

      expect(formatOrderLabel(order)).toBe('Limit Close Short');
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

      expect(formatOrderLabel(order)).toBe('Stop Market Close Long');
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

      expect(formatOrderLabel(order)).toBe('Take Profit Limit Close Long');
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

      expect(formatOrderLabel(order)).toBe('Market Close Short');
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
});
