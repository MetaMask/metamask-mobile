/**
 * Unit tests for P&L calculation utilities
 */

import {
  calculatePnL,
  calculatePnLPercentage,
  calculatePnLWithPercentage,
  calculatePnLPercentageFromUnrealized,
  calculateTotalPnL,
  calculateTotalPnLPercentage,
  type PnLCalculationParams,
  type PnLFromUnrealizedParams,
  type TotalPnLParams,
} from './pnlCalculations';
import type { Position } from '../controllers/types';

describe('pnlCalculations', () => {
  describe('calculatePnL', () => {
    it('should calculate positive P&L for long position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: 2,
      };

      const result = calculatePnL(params);
      expect(result).toBe(20); // (110 - 100) * 2 = 20
    });

    it('should calculate negative P&L for long position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 90,
        size: 2,
      };

      const result = calculatePnL(params);
      expect(result).toBe(-20); // (90 - 100) * 2 = -20
    });

    it('should calculate positive P&L for short position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 90,
        size: -2,
      };

      const result = calculatePnL(params);
      expect(result).toBe(20); // (90 - 100) * -2 = 20
    });

    it('should calculate negative P&L for short position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: -2,
      };

      const result = calculatePnL(params);
      expect(result).toBe(-20); // (110 - 100) * -2 = -20
    });

    it('should handle zero size', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: 0,
      };

      const result = calculatePnL(params);
      expect(result).toBe(0);
    });

    it('should handle same entry and current price', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 100,
        size: 2,
      };

      const result = calculatePnL(params);
      expect(result).toBe(0);
    });
  });

  describe('calculatePnLPercentage', () => {
    it('should calculate positive percentage for long position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: 2,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBe(10); // ((110 - 100) / 100) * 100 * sign(2) = 10%
    });

    it('should calculate negative percentage for long position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 90,
        size: 2,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBe(-10); // ((90 - 100) / 100) * 100 * sign(2) = -10%
    });

    it('should calculate positive percentage for short position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 90,
        size: -2,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBe(10); // ((90 - 100) / 100) * 100 * sign(-2) = -10 * -1 = 10%
    });

    it('should calculate negative percentage for short position', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: -2,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBe(-10); // ((110 - 100) / 100) * 100 * sign(-2) = 10 * -1 = -10%
    });

    it('should handle zero size', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: 0,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBe(0);
    });

    it('should handle same entry and current price', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 100,
        size: 2,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBe(0);
    });

    it('should handle fractional prices correctly', () => {
      const params: PnLCalculationParams = {
        entryPrice: 33.33,
        currentPrice: 36.66,
        size: 1,
      };

      const result = calculatePnLPercentage(params);
      expect(result).toBeCloseTo(9.99, 2); // ((36.66 - 33.33) / 33.33) * 100 ≈ 9.99%
    });
  });

  describe('calculatePnLWithPercentage', () => {
    it('should return both P&L and percentage', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 110,
        size: 2,
      };

      const result = calculatePnLWithPercentage(params);
      expect(result.pnl).toBe(20);
      expect(result.pnlPercentage).toBe(10);
    });

    it('should handle negative values correctly', () => {
      const params: PnLCalculationParams = {
        entryPrice: 100,
        currentPrice: 90,
        size: -1,
      };

      const result = calculatePnLWithPercentage(params);
      expect(result.pnl).toBe(10); // (90 - 100) * -1 = 10
      expect(result.pnlPercentage).toBe(10); // ((90 - 100) / 100) * 100 * sign(-1) = 10
    });
  });

  describe('calculatePnLPercentageFromUnrealized', () => {
    it('should calculate percentage from unrealized P&L', () => {
      const params: PnLFromUnrealizedParams = {
        unrealizedPnl: 50,
        entryPrice: 100,
        size: 2,
      };

      const result = calculatePnLPercentageFromUnrealized(params);
      expect(result).toBe(25); // 50 / (100 * 2) * 100 = 25%
    });

    it('should handle negative unrealized P&L', () => {
      const params: PnLFromUnrealizedParams = {
        unrealizedPnl: -30,
        entryPrice: 100,
        size: 2,
      };

      const result = calculatePnLPercentageFromUnrealized(params);
      expect(result).toBe(-15); // -30 / (100 * 2) * 100 = -15%
    });

    it('should handle short positions (negative size)', () => {
      const params: PnLFromUnrealizedParams = {
        unrealizedPnl: 40,
        entryPrice: 100,
        size: -2,
      };

      const result = calculatePnLPercentageFromUnrealized(params);
      expect(result).toBe(20); // 40 / (100 * abs(-2)) * 100 = 20%
    });

    it('should handle zero entry value', () => {
      const params: PnLFromUnrealizedParams = {
        unrealizedPnl: 50,
        entryPrice: 0,
        size: 2,
      };

      const result = calculatePnLPercentageFromUnrealized(params);
      expect(result).toBe(0);
    });

    it('should handle zero size', () => {
      const params: PnLFromUnrealizedParams = {
        unrealizedPnl: 50,
        entryPrice: 100,
        size: 0,
      };

      const result = calculatePnLPercentageFromUnrealized(params);
      expect(result).toBe(0);
    });
  });

  describe('calculateTotalPnL', () => {
    it('should calculate total P&L for multiple positions', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '1',
          entryPrice: '50000',
          positionValue: '51000',
          unrealizedPnl: '1000',
          marginUsed: '25000',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '2.0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
        {
          symbol: 'ETH',
          size: '2',
          entryPrice: '3000',
          positionValue: '6200',
          unrealizedPnl: '200',
          marginUsed: '3000',
          leverage: { type: 'isolated', value: 2 },
          liquidationPrice: '2500',
          maxLeverage: 50,
          returnOnEquity: '3.33',
          cumulativeFunding: { allTime: '5', sinceOpen: '2', sinceChange: '1' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnL(params);
      expect(result).toBe(1200); // 1000 + 200 = 1200
    });

    it('should handle positions with negative unrealized P&L', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '1',
          entryPrice: '50000',
          positionValue: '49000',
          unrealizedPnl: '-1000',
          marginUsed: '25000',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '-2.0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
        {
          symbol: 'ETH',
          size: '2',
          entryPrice: '3000',
          positionValue: '5800',
          unrealizedPnl: '-200',
          marginUsed: '3000',
          leverage: { type: 'isolated', value: 2 },
          liquidationPrice: '2500',
          maxLeverage: 50,
          returnOnEquity: '-3.33',
          cumulativeFunding: { allTime: '5', sinceOpen: '2', sinceChange: '1' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnL(params);
      expect(result).toBe(-1200); // -1000 + (-200) = -1200
    });

    it('should handle empty positions array', () => {
      const params: TotalPnLParams = { positions: [] };
      const result = calculateTotalPnL(params);
      expect(result).toBe(0);
    });

    it('should handle positions with missing unrealized P&L', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '1',
          entryPrice: '50000',
          positionValue: '51000',
          unrealizedPnl: undefined as unknown as string,
          marginUsed: '25000',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '2.0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnL(params);
      expect(result).toBe(0); // Should default to 0 for missing values
    });
  });

  describe('calculateTotalPnLPercentage', () => {
    it('should calculate total P&L percentage for multiple positions', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '2',
          entryPrice: '50000',
          positionValue: '102000',
          unrealizedPnl: '2000',
          marginUsed: '50000',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '2.0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
        {
          symbol: 'ETH',
          size: '4',
          entryPrice: '3000',
          positionValue: '12400',
          unrealizedPnl: '400',
          marginUsed: '6000',
          leverage: { type: 'isolated', value: 2 },
          liquidationPrice: '2500',
          maxLeverage: 50,
          returnOnEquity: '3.33',
          cumulativeFunding: { allTime: '5', sinceOpen: '2', sinceChange: '1' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnLPercentage(params);

      // Total P&L: 2000 + 400 = 2400
      // Total Entry Value: (50000 * 2) + (3000 * 4) = 100000 + 12000 = 112000
      // Percentage: (2400 / 112000) * 100 ≈ 2.14%
      expect(result).toBeCloseTo(2.14, 2);
    });

    it('should handle negative total P&L percentage', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '1',
          entryPrice: '50000',
          positionValue: '49000',
          unrealizedPnl: '-1000',
          marginUsed: '25000',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: '40000',
          maxLeverage: 100,
          returnOnEquity: '-2.0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnLPercentage(params);

      // Total P&L: -1000
      // Total Entry Value: 50000 * 1 = 50000
      // Percentage: (-1000 / 50000) * 100 = -2%
      expect(result).toBe(-2);
    });

    it('should handle empty positions array', () => {
      const params: TotalPnLParams = { positions: [] };
      const result = calculateTotalPnLPercentage(params);
      expect(result).toBe(0);
    });

    it('should handle zero total entry value', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '0',
          entryPrice: '50000',
          positionValue: '0',
          unrealizedPnl: '1000',
          marginUsed: '0',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: null,
          maxLeverage: 100,
          returnOnEquity: '0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnLPercentage(params);
      expect(result).toBe(0);
    });

    it('should handle positions with missing values', () => {
      const positions: Position[] = [
        {
          symbol: 'BTC',
          size: '',
          entryPrice: '',
          positionValue: '0',
          unrealizedPnl: '',
          marginUsed: '0',
          leverage: { type: 'cross', value: 2 },
          liquidationPrice: null,
          maxLeverage: 100,
          returnOnEquity: '0',
          cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
          takeProfitCount: 0,
          stopLossCount: 0,
        },
      ];

      const params: TotalPnLParams = { positions };
      const result = calculateTotalPnLPercentage(params);
      expect(result).toBe(0); // Should handle empty strings gracefully
    });
  });
});
