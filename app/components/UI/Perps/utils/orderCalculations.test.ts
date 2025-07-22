import {
  calculatePositionSize,
  calculateMarginRequired,
  calculateLiquidationPrice,
  calculateEstimatedFees,
} from './orderCalculations';
import { FEE_RATES } from '../constants/hyperLiquidConfig';

describe('orderCalculations', () => {
  describe('calculatePositionSize', () => {
    it('should calculate position size correctly', () => {
      const result = calculatePositionSize({
        amount: '10000',
        price: 50000,
      });

      expect(result).toBe('0.200000');
    });

    it('should return 0 when amount is 0', () => {
      const result = calculatePositionSize({
        amount: '0',
        price: 50000,
      });

      expect(result).toBe('0.000000');
    });

    it('should return 0 when price is 0', () => {
      const result = calculatePositionSize({
        amount: '10000',
        price: 0,
      });

      expect(result).toBe('0.000000');
    });

    it('should handle empty amount string', () => {
      const result = calculatePositionSize({
        amount: '',
        price: 50000,
      });

      expect(result).toBe('0.000000');
    });

    it('should handle very small positions', () => {
      const result = calculatePositionSize({
        amount: '1',
        price: 50000,
      });

      expect(result).toBe('0.000020');
    });

    it('should handle very large positions', () => {
      const result = calculatePositionSize({
        amount: '1000000',
        price: 50000,
      });

      expect(result).toBe('20.000000');
    });
  });

  describe('calculateMarginRequired', () => {
    it('should calculate margin correctly', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 10,
      });

      expect(result).toBe('1000.00');
    });

    it('should return 0 when amount is 0', () => {
      const result = calculateMarginRequired({
        amount: '0',
        leverage: 10,
      });

      expect(result).toBe('0.00');
    });

    it('should return 0 when leverage is 0', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 0,
      });

      expect(result).toBe('0.00');
    });

    it('should handle 1x leverage (no leverage)', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 1,
      });

      expect(result).toBe('10000.00');
    });

    it('should handle high leverage', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 100,
      });

      expect(result).toBe('100.00');
    });

    it('should handle decimal amounts', () => {
      const result = calculateMarginRequired({
        amount: '123.45',
        leverage: 5,
      });

      expect(result).toBe('24.69');
    });
  });

  describe('calculateLiquidationPrice', () => {
    // Maintenance margin is 5% as per RISK_MANAGEMENT config

    describe('long positions', () => {
      it('should calculate liquidation price for long position', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 10,
          direction: 'long',
        });

        // With 10x leverage, margin is 10%, maintenance is 5%
        // Liquidation = 50000 * (1 - (0.1 - 0.05)) = 50000 * 0.95
        expect(result).toBe('47500.00');
      });

      it('should handle 1x leverage for long', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 1,
          direction: 'long',
        });

        // With 1x leverage, margin is 100%, maintenance is 5%
        // Liquidation = 50000 * (1 - (1 - 0.05)) = 50000 * 0.05
        expect(result).toBe('2500.00');
      });

      it('should handle high leverage for long', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 50,
          direction: 'long',
        });

        // With 50x leverage, margin is 2%, maintenance is 5%
        // Since margin (2%) is less than maintenance (5%), position would be instantly liquidated
        // Liquidation = 50000 * (1 - (0.02 - 0.05)) = 50000 * 1.03
        expect(result).toBe('51500.00');
      });
    });

    describe('short positions', () => {
      it('should calculate liquidation price for short position', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 10,
          direction: 'short',
        });

        // With 10x leverage, margin is 10%, maintenance is 5%
        // Liquidation = 50000 * (1 + (0.1 - 0.05)) = 50000 * 1.05
        expect(result).toBe('52500.00');
      });

      it('should handle 1x leverage for short', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 1,
          direction: 'short',
        });

        // With 1x leverage, margin is 100%, maintenance is 5%
        // Liquidation = 50000 * (1 + (1 - 0.05)) = 50000 * 1.95
        expect(result).toBe('97500.00');
      });

      it('should handle high leverage for short', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 50,
          direction: 'short',
        });

        // With 50x leverage, margin is 2%, maintenance is 5%
        // Since margin (2%) is less than maintenance (5%), position would be instantly liquidated
        // Liquidation = 50000 * (1 + (0.02 - 0.05)) = 50000 * 0.97
        expect(result).toBe('48500.00');
      });
    });

    describe('edge cases', () => {
      it('should return 0 when entry price is 0', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 0,
          leverage: 10,
          direction: 'long',
        });

        expect(result).toBe('0.00');
      });

      it('should return 0 when leverage is 0', () => {
        const result = calculateLiquidationPrice({
          entryPrice: 50000,
          leverage: 0,
          direction: 'long',
        });

        expect(result).toBe('0.00');
      });
    });
  });

  describe('calculateEstimatedFees', () => {
    it('should calculate market order fees correctly', () => {
      const result = calculateEstimatedFees({
        amount: '10000',
        orderType: 'market',
      });

      expect(result).toBe(10000 * FEE_RATES.market);
    });

    it('should calculate limit order fees correctly', () => {
      const result = calculateEstimatedFees({
        amount: '10000',
        orderType: 'limit',
      });

      expect(result).toBe(10000 * FEE_RATES.limit);
    });

    it('should return 0 for 0 amount', () => {
      const result = calculateEstimatedFees({
        amount: '0',
        orderType: 'market',
      });

      expect(result).toBe(0);
    });

    it('should handle empty amount string', () => {
      const result = calculateEstimatedFees({
        amount: '',
        orderType: 'market',
      });

      expect(result).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const result = calculateEstimatedFees({
        amount: '123.45',
        orderType: 'market',
      });

      expect(result).toBeCloseTo(123.45 * FEE_RATES.market, 6);
    });

    it('should handle very large amounts', () => {
      const result = calculateEstimatedFees({
        amount: '1000000',
        orderType: 'limit',
      });

      expect(result).toBe(1000000 * FEE_RATES.limit);
    });
  });
});
