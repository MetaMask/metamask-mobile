/**
 * Unit tests for market data transformation utilities
 */

import {
  transformMarketData,
  formatPrice,
  formatChange,
  formatPercentage,
  formatVolume,
  HyperLiquidMarketData,
} from './marketDataTransform';
import { AllMids, PerpsAssetCtx } from '@deeeed/hyperliquid-node20';

// Helper function to create mock asset context with all required properties
const createMockAssetCtx = (overrides: Record<string, unknown> = {}) => ({
  prevDayPx: '50000',
  dayNtlVlm: '1000000000',
  funding: '0.01',
  openInterest: '1000000',
  premium: '0.001',
  oraclePx: '51000',
  totalVlm: '5000000000',
  impactPxs: ['50000', '52000'],
  markPx: '51500',
  impactPx: '51000',
  dayBaseVlm: '500000',
  midPx: '51000',
  ...overrides,
});

describe('marketDataTransform', () => {
  describe('transformMarketData', () => {
    const mockUniverseAsset = {
      name: 'BTC',
      maxLeverage: 50,
      szDecimals: 4,
      marginTableId: 0,
    };

    const mockAssetCtx = createMockAssetCtx();

    const mockAllMids = {
      BTC: '52000',
    };

    it('transforms complete market data correctly', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [mockAssetCtx],
        allMids: mockAllMids,
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        symbol: 'BTC',
        name: 'BTC',
        maxLeverage: '50x',
        price: '$52,000.00',
        change24h: '+$2,000.00',
        change24hPercent: '+4.00%',
        volume: '$1B',
      });
    });

    it('handles multiple assets correctly', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [
          { ...mockUniverseAsset, name: 'BTC', maxLeverage: 50 },
          { ...mockUniverseAsset, name: 'ETH', maxLeverage: 25 },
        ],
        assetCtxs: [
          createMockAssetCtx({ prevDayPx: '50000', dayNtlVlm: '1000000000' }),
          createMockAssetCtx({ prevDayPx: '3000', dayNtlVlm: '500000000' }),
        ],
        allMids: {
          BTC: '52000',
          ETH: '3100',
        },
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].maxLeverage).toBe('50x');
      expect(result[1].symbol).toBe('ETH');
      expect(result[1].maxLeverage).toBe('25x');
    });

    it('handles missing price data gracefully', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [mockAssetCtx],
        allMids: {}, // No price data
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].price).toBe('$0.00');
      expect(result[0].change24h).toBe('$0.00');
      expect(result[0].change24hPercent).toBe('-100.00%');
    });

    it('handles missing asset context gracefully', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [], // No asset context
        allMids: mockAllMids,
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].change24h).toBe('+$52,000.00');
      expect(result[0].change24hPercent).toBe('0.00%');
      expect(result[0].volume).toBe('$0');
    });

    it('handles null/undefined asset context values', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [
          createMockAssetCtx({
            prevDayPx: null,
            dayNtlVlm: undefined,
          }) as unknown as PerpsAssetCtx,
        ],
        allMids: mockAllMids,
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].change24h).toBe('$0.00');
      expect(result[0].change24hPercent).toBe('0.00%');
      expect(result[0].volume).toBe('$0');
    });

    it('calculates negative price changes correctly', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [createMockAssetCtx({ prevDayPx: '55000' })],
        allMids: { BTC: '52000' },
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].change24h).toBe('-$3,000.00');
      expect(result[0].change24hPercent).toBe('-5.45%');
    });

    it('handles zero previous day price', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [createMockAssetCtx({ prevDayPx: '0' })],
        allMids: mockAllMids,
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].change24h).toBe('+$52,000.00');
      expect(result[0].change24hPercent).toBe('0.00%');
    });

    it('handles array index mismatch gracefully', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset, { ...mockUniverseAsset, name: 'ETH' }],
        assetCtxs: [mockAssetCtx], // Only one context for two assets
        allMids: { BTC: '52000', ETH: '3100' },
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].volume).toBe('$1B'); // Has context
      expect(result[1].volume).toBe('$0'); // No context
    });
  });

  describe('formatPrice', () => {
    it('formats zero price correctly', () => {
      // Arrange
      const price = 0;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('formats large prices with thousands separator', () => {
      // Arrange
      const price = 50000;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$50,000.00');
    });

    it('formats prices greater than 1000 with two decimal places', () => {
      // Arrange
      const price = 1234.5678;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$1,234.57');
    });

    it('formats prices between 1 and 1000 with two decimal places', () => {
      // Arrange
      const price = 123.456;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$123.46');
    });

    it('formats prices between 0.01 and 1 with four decimal places', () => {
      // Arrange
      const price = 0.1234;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.1234');
    });

    it('formats very small prices with six decimal places', () => {
      // Arrange
      const price = 0.001234;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.001234');
    });

    it('formats edge case at exactly 1.0', () => {
      // Arrange
      const price = 1.0;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$1.00');
    });

    it('formats edge case at exactly 0.01', () => {
      // Arrange
      const price = 0.01;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$0.0100');
    });

    it('formats edge case at exactly 1000', () => {
      // Arrange
      const price = 1000;

      // Act
      const result = formatPrice(price);

      // Assert
      expect(result).toBe('$1,000.00');
    });
  });

  describe('formatChange', () => {
    it('formats zero change correctly', () => {
      // Arrange
      const change = 0;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('formats positive change with plus sign', () => {
      // Arrange
      const change = 1000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('+$1,000.00');
    });

    it('formats negative change with minus sign', () => {
      // Arrange
      const change = -1000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('-$1,000.00');
    });

    it('formats large positive changes with thousands separator', () => {
      // Arrange
      const change = 50000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('+$50,000.00');
    });

    it('formats large negative changes with thousands separator', () => {
      // Arrange
      const change = -50000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('-$50,000.00');
    });

    it('formats small positive changes with appropriate decimals', () => {
      // Arrange
      const change = 0.1234;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('+$0.1234');
    });

    it('formats small negative changes with appropriate decimals', () => {
      // Arrange
      const change = -0.001234;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('-$0.001234');
    });

    it('formats changes between 1 and 1000 with two decimal places', () => {
      // Arrange
      const change = 123.456;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('+$123.46');
    });

    it('formats changes between 0.01 and 1 with four decimal places', () => {
      // Arrange
      const change = -0.5678;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('-$0.5678');
    });
  });

  describe('formatPercentage', () => {
    it('formats zero percentage correctly', () => {
      // Arrange
      const percent = 0;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('0.00%');
    });

    it('formats positive percentage with plus sign', () => {
      // Arrange
      const percent = 5.5;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('+5.50%');
    });

    it('formats negative percentage with minus sign', () => {
      // Arrange
      const percent = -3.25;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('-3.25%');
    });

    it('formats large positive percentage correctly', () => {
      // Arrange
      const percent = 150.75;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('+150.75%');
    });

    it('formats large negative percentage correctly', () => {
      // Arrange
      const percent = -99.99;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('-99.99%');
    });

    it('formats small positive percentage with two decimal places', () => {
      // Arrange
      const percent = 0.01;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('+0.01%');
    });

    it('formats small negative percentage with two decimal places', () => {
      // Arrange
      const percent = -0.001;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('-0.00%');
    });

    it('rounds percentage to two decimal places', () => {
      // Arrange
      const percent = 3.14159;

      // Act
      const result = formatPercentage(percent);

      // Assert
      expect(result).toBe('+3.14%');
    });
  });

  describe('formatVolume', () => {
    it('formats zero volume correctly', () => {
      // Arrange
      const volume = 0;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$0');
    });

    it('formats volume in billions', () => {
      // Arrange
      const volume = 2500000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$2.5B');
    });

    it('formats volume in millions', () => {
      // Arrange
      const volume = 150000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$150M');
    });

    it('formats volume in thousands', () => {
      // Arrange
      const volume = 75000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$75K');
    });

    it('formats small volume with two decimal places', () => {
      // Arrange
      const volume = 123.45;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$123.45');
    });

    it('formats edge case at exactly 1 billion', () => {
      // Arrange
      const volume = 1000000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1B');
    });

    it('formats edge case at exactly 1 million', () => {
      // Arrange
      const volume = 1000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1M');
    });

    it('formats edge case at exactly 1 thousand', () => {
      // Arrange
      const volume = 1000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1K');
    });

    it('formats decimal billions correctly', () => {
      // Arrange
      const volume = 1234567890;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1.23B');
    });

    it('formats decimal millions correctly', () => {
      // Arrange
      const volume = 12345678;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$12.35M');
    });

    it('formats decimal thousands correctly', () => {
      // Arrange
      const volume = 12345;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$12.35K');
    });

    it('handles very large numbers correctly', () => {
      // Arrange
      const volume = 999999999999;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1T');
    });
  });

  describe('error handling and edge cases', () => {
    it('handles empty universe array', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [],
        assetCtxs: [],
        allMids: {},
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result).toEqual([]);
    });

    it('handles invalid string values in asset context with safe fallbacks', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [
          { name: 'BTC', maxLeverage: 50, szDecimals: 4, marginTableId: 0 },
        ],
        assetCtxs: [
          createMockAssetCtx({
            prevDayPx: 'invalid',
            dayNtlVlm: 'also-invalid',
          }),
        ],
        allMids: { BTC: '52000' },
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].change24h).toBe('$0.00');
      expect(result[0].change24hPercent).toBe('0.00%');
      expect(result[0].volume).toBe('$0');
    });

    it('handles invalid price string in allMids with safe fallbacks', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [
          { name: 'BTC', maxLeverage: 50, szDecimals: 4, marginTableId: 0 },
        ],
        assetCtxs: [
          createMockAssetCtx({ prevDayPx: '50000', dayNtlVlm: '1000000' }),
        ],
        allMids: { BTC: 'invalid-price' } as unknown as AllMids,
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].price).toBe('$0.00');
      expect(result[0].change24h).toBe('$0.00');
    });

    it('handles negative numbers in formatting functions', () => {
      // Arrange & Act & Assert
      expect(formatPrice(-100)).toBe('-$100.00');
      expect(formatVolume(-1000000)).toBe('-$1M');
    });

    it('handles very small numbers close to zero', () => {
      // Arrange & Act & Assert
      expect(formatPrice(0.0000001)).toBe('$0.000000');
      expect(formatVolume(0.1)).toBe('$0.1');
      expect(formatPercentage(0.001)).toBe('+0.00%');
    });

    // TODO: We probably want a better fallback here
    it('handles NaN and Infinity values with safe fallbacks', () => {
      // Arrange & Act & Assert
      expect(formatPrice(NaN)).toBe('$0.00');
      expect(formatPrice(Infinity)).toBe('$0.00');
      expect(formatVolume(NaN)).toBe('$0');
      expect(formatVolume(Infinity)).toBe('$0');
      expect(formatChange(NaN)).toBe('$0.00');
      expect(formatChange(Infinity)).toBe('$0.00');
      expect(formatPercentage(NaN)).toBe('0.00%');
      expect(formatPercentage(Infinity)).toBe('0.00%');
    });
  });
});
