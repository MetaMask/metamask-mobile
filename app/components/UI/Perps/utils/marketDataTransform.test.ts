/**
 * Unit tests for market data transformation utilities
 */

import {
  transformMarketData,
  calculateOpenInterestUSD,
  formatChange,
  formatPercentage,
  HyperLiquidMarketData,
} from './marketDataTransform';
import {
  formatVolume,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from './formatUtils';
import { HIP3_ASSET_MARKET_TYPES } from '../constants/hyperLiquidConfig';
import type {
  AllMidsResponse,
  PerpsAssetCtx,
  PredictedFunding,
} from '../types/hyperliquid-types';

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
        price: '$52,000', // PRICE_RANGES_UNIVERSAL: 5 sig figs, 0 decimals for $10k-$100k
        change24h: '+$2,000', // No trailing zeros
        change24hPercent: '+4.00%',
        volume: '$1.00B',
        nextFundingTime: undefined,
        fundingIntervalHours: undefined,
        fundingRate: 0.01,
        marketSource: undefined, // Main DEX has no source
        marketType: undefined, // Main DEX has no type
        openInterest: '$52.00B', // 1M contracts * $52K price
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
      expect(result[0].price).toBe('$---');
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
      expect(result[0].change24h).toBe('+$52,000'); // No trailing zeros
      expect(result[0].change24hPercent).toBe('0.00%');
      expect(result[0].volume).toBe('$---');
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
      expect(result[0].volume).toBe('$---');
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
      expect(result[0].change24h).toBe('-$3,000'); // No trailing zeros
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
      expect(result[0].change24h).toBe('+$52,000'); // No trailing zeros
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
      expect(result[0].volume).toBe('$1.00B'); // Has context with 2 decimals
      expect(result[1].volume).toBe('$---'); // No context
    });

    it('handles predicted funding data correctly', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [mockAssetCtx],
        allMids: mockAllMids,
        predictedFundings: [
          [
            'BTC',
            [
              [
                'HyperLiquid',
                {
                  fundingRate: '0.001',
                  nextFundingTime: 1234567890000,
                  fundingIntervalHours: 8,
                },
              ],
            ],
          ],
        ],
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].nextFundingTime).toBe(1234567890000);
      expect(result[0].fundingIntervalHours).toBe(8);
    });

    it('handles malformed funding data without crashing', () => {
      // Arrange - Test various edge cases that could cause destructuring errors
      const testCases = [
        // Case 1: fundingData[1][0] is not an array
        {
          predictedFundings: [['BTC', ['not-an-array']]],
        },
        // Case 2: fundingData[1][0] is an array with less than 2 elements
        {
          predictedFundings: [['BTC', [['HyperLiquid']]]],
        },
        // Case 3: fundingData[1][0] is null
        {
          predictedFundings: [['BTC', [null]]],
        },
        // Case 4: fundingData[1] is empty array
        {
          predictedFundings: [['BTC', []]],
        },
        // Case 5: fundingData[1] is undefined
        {
          predictedFundings: [['BTC', undefined]],
        },
      ];

      testCases.forEach((testCase) => {
        const hyperLiquidData: HyperLiquidMarketData = {
          universe: [mockUniverseAsset],
          assetCtxs: [mockAssetCtx],
          allMids: mockAllMids,
          predictedFundings: testCase.predictedFundings as PredictedFunding[],
        };

        // Act & Assert - should not throw
        expect(() => {
          const result = transformMarketData(hyperLiquidData);
          // Should return result without funding data
          expect(result[0].nextFundingTime).toBeUndefined();
          expect(result[0].fundingIntervalHours).toBeUndefined();
        }).not.toThrow();
      });
    });

    it('handles missing predicted funding gracefully', () => {
      // Arrange
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [mockAssetCtx],
        allMids: mockAllMids,
        // No predictedFundings field
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].nextFundingTime).toBeUndefined();
      expect(result[0].fundingIntervalHours).toBeUndefined();
    });

    it('extracts marketSource and marketType for HIP-3 equity assets', () => {
      const xyzAsset = {
        name: 'xyz:XYZ100',
        maxLeverage: 20,
        szDecimals: 2,
        marginTableId: 0,
      };
      const xyzAssetCtx = createMockAssetCtx({ prevDayPx: '100' });
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [xyzAsset],
        assetCtxs: [xyzAssetCtx],
        allMids: { 'xyz:XYZ100': '105' },
      };

      const result = transformMarketData(
        hyperLiquidData,
        HIP3_ASSET_MARKET_TYPES,
      );

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('xyz:XYZ100');
      expect(result[0].marketSource).toBe('xyz');
      expect(result[0].marketType).toBe('equity');
    });

    it('extracts marketSource and marketType for HIP-3 commodity assets', () => {
      const goldAsset = {
        name: 'xyz:GOLD',
        maxLeverage: 20,
        szDecimals: 2,
        marginTableId: 0,
      };
      const goldAssetCtx = createMockAssetCtx({ prevDayPx: '2000' });
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [goldAsset],
        assetCtxs: [goldAssetCtx],
        allMids: { 'xyz:GOLD': '2050' },
      };

      const result = transformMarketData(
        hyperLiquidData,
        HIP3_ASSET_MARKET_TYPES,
      );

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('xyz:GOLD');
      expect(result[0].marketSource).toBe('xyz');
      expect(result[0].marketType).toBe('commodity');
    });

    it('handles unmapped HIP-3 DEX - defaults to equity marketType', () => {
      const unknownDexAsset = {
        name: 'unknown:ASSET1',
        maxLeverage: 10,
        szDecimals: 2,
        marginTableId: 0,
      };
      const unknownAssetCtx = createMockAssetCtx({ prevDayPx: '50' });
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [unknownDexAsset],
        assetCtxs: [unknownAssetCtx],
        allMids: { 'unknown:ASSET1': '55' },
      };

      const result = transformMarketData(hyperLiquidData);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('unknown:ASSET1');
      expect(result[0].marketSource).toBe('unknown');
      expect(result[0].marketType).toBe('equity');
    });

    it('handles main DEX assets with no marketSource or marketType', () => {
      const hyperLiquidData: HyperLiquidMarketData = {
        universe: [mockUniverseAsset],
        assetCtxs: [mockAssetCtx],
        allMids: mockAllMids,
      };

      const result = transformMarketData(hyperLiquidData);

      expect(result[0].symbol).toBe('BTC');
      expect(result[0].marketSource).toBeUndefined();
      expect(result[0].marketType).toBeUndefined();
    });
  });

  describe('calculateOpenInterestUSD', () => {
    it('calculates open interest correctly with string inputs', () => {
      // Arrange
      const openInterest = '1000000'; // 1M contracts
      const price = '50000'; // $50K per contract

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(50000000000); // $50B
    });

    it('calculates open interest correctly with number inputs', () => {
      // Arrange
      const openInterest = 1000000;
      const price = 50000;

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(50000000000);
    });

    it('calculates open interest correctly with mixed inputs', () => {
      // Arrange
      const openInterest = '500000'; // string
      const price = 100000; // number

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(50000000000);
    });

    it('returns NaN when open interest is undefined', () => {
      // Arrange
      const openInterest = undefined;
      const price = '50000';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeNaN();
    });

    it('returns NaN when price is undefined', () => {
      // Arrange
      const openInterest = '1000000';
      const price = undefined;

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeNaN();
    });

    it('returns NaN when both inputs are undefined', () => {
      // Arrange
      const openInterest = undefined;
      const price = undefined;

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeNaN();
    });

    it('returns NaN when open interest is empty string', () => {
      // Arrange
      const openInterest = '';
      const price = '50000';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeNaN();
    });

    it('returns 0 when price is zero', () => {
      // Arrange
      const openInterest = '1000000';
      const price = '0';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(0); // 1M * 0 = 0
    });

    it('returns 0 when open interest is zero', () => {
      // Arrange
      const openInterest = '0';
      const price = '50000';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(0); // 0 * $50K = 0
    });

    it('returns NaN when open interest contains invalid characters', () => {
      // Arrange
      const openInterest = 'invalid';
      const price = '50000';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeNaN();
    });

    it('returns NaN when price contains invalid characters', () => {
      // Arrange
      const openInterest = '1000000';
      const price = 'invalid';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeNaN();
    });

    it('handles decimal values correctly', () => {
      // Arrange
      const openInterest = '1234.5678';
      const price = '98765.4321';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBeCloseTo(121932622.22, 2);
    });

    it('handles very large numbers without precision loss', () => {
      // Arrange
      const openInterest = '10000000'; // 10M contracts
      const price = '100000'; // $100K per contract

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(1000000000000); // $1T
    });

    it('handles very small decimal numbers', () => {
      // Arrange
      const openInterest = '0.001';
      const price = '50000';

      // Act
      const result = calculateOpenInterestUSD(openInterest, price);

      // Assert
      expect(result).toBe(50);
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
      expect(result).toBe('+$1,000'); // No trailing zeros
    });

    it('formats negative change with minus sign', () => {
      // Arrange
      const change = -1000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('-$1,000'); // No trailing zeros
    });

    it('formats large positive changes with thousands separator', () => {
      // Arrange
      const change = 50000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('+$50,000'); // No trailing zeros
    });

    it('formats large negative changes with thousands separator', () => {
      // Arrange
      const change = -50000;

      // Act
      const result = formatChange(change);

      // Assert
      expect(result).toBe('-$50,000'); // No trailing zeros
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

      // Assert - Now uses 5 sig figs with min 2 decimals: 123.456 → $123.46 (properly rounded)
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

    it('handles values in different PRICE_RANGES_UNIVERSAL ranges', () => {
      // Arrange & Act & Assert
      // This test covers lines 148, 153, 154 in marketDataTransform.ts (formatChange function)
      // Line 148: formatPerpsFiat(Math.abs(change), { ranges: PRICE_RANGES_UNIVERSAL })
      // Line 153: formatted.replace('$', '')
      // Line 154: change > 0 ? `+$${valueWithoutDollar}` : `-$${valueWithoutDollar}`

      // Test > $100k range: 0 decimals, 6 sig figs
      expect(formatChange(123456.78)).toBe('+$123,457');
      expect(formatChange(-123456.78)).toBe('-$123,457');

      // Test $10k-$100k range: 0 decimals, 5 sig figs
      expect(formatChange(12345.67)).toBe('+$12,346');
      expect(formatChange(-12345.67)).toBe('-$12,346');

      // Test $1k-$10k range: 1 decimal, 5 sig figs
      expect(formatChange(1234.56)).toBe('+$1,234.6');
      expect(formatChange(-1234.56)).toBe('-$1,234.6');

      // Test $100-$1k range: 2 decimals, 5 sig figs
      expect(formatChange(234.567)).toBe('+$234.57');
      expect(formatChange(-234.567)).toBe('-$234.57');

      // Test $10-$100 range: 4 decimals, 5 sig figs
      expect(formatChange(23.4567)).toBe('+$23.457');
      expect(formatChange(-23.4567)).toBe('-$23.457');

      // Test $0.01-$10 range: 5 sig figs, min 2 max 6 decimals
      expect(formatChange(2.34567)).toBe('+$2.3457');
      expect(formatChange(-2.34567)).toBe('-$2.3457');

      // Test < $0.01 range: 4 sig figs, min 2 max 6 decimals
      expect(formatChange(0.0012345)).toBe('+$0.001234');
      expect(formatChange(-0.0012345)).toBe('-$0.001234');
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
      expect(result).toBe('$0.00');
    });

    it('formats volume in billions', () => {
      // Arrange
      const volume = 2500000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$2.50B');
    });

    it('formats volume in millions', () => {
      // Arrange
      const volume = 150000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$150.00M');
    });

    it('formats volume in thousands', () => {
      // Arrange
      const volume = 75000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$75K'); // K values have no decimals
    });

    it('formats small volume with two decimal places', () => {
      // Arrange
      const volume = 123.45;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$123.45'); // Now with 2 decimals
    });

    it('formats edge case at exactly 1 billion', () => {
      // Arrange
      const volume = 1000000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1.00B');
    });

    it('formats edge case at exactly 1 million', () => {
      // Arrange
      const volume = 1000000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1.00M');
    });

    it('formats edge case at exactly 1 thousand', () => {
      // Arrange
      const volume = 1000;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1K'); // K values have no decimals
    });

    it('formats decimal billions correctly', () => {
      // Arrange
      const volume = 1234567890;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1.23B'); // Now with 2 decimals
    });

    it('formats decimal millions correctly', () => {
      // Arrange
      const volume = 12345678;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$12.35M'); // Now with 2 decimals
    });

    it('formats decimal thousands correctly', () => {
      // Arrange
      const volume = 12345;

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$12K'); // K values have no decimals
    });

    it('handles very large numbers correctly', () => {
      // Arrange
      const volume = 1000000000000; // 1 trillion

      // Act
      const result = formatVolume(volume);

      // Assert
      expect(result).toBe('$1.00T');
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
      expect(result[0].volume).toBe('$---');
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
        allMids: { BTC: 'invalid-price' } as unknown as AllMidsResponse,
      };

      // Act
      const result = transformMarketData(hyperLiquidData);

      // Assert
      expect(result[0].price).toBe('$---');
      expect(result[0].change24h).toBe('$0.00');
    });

    it('handles negative numbers in formatting functions', () => {
      // Arrange & Act & Assert
      // formatPerpsFiat is not designed for negative values - returns "<$value" with absolute value
      // Use formatChange() for signed values instead
      // PRICE_RANGES_UNIVERSAL: 5 sig figs, max 2 decimals for $10-$100, trailing zeros removed: 100 → $10 (5 sig figs)
      expect(formatPerpsFiat(-100, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '<$10',
      );
      expect(formatVolume(-1000000)).toBe('-$1.00M'); // formatVolume handles negatives
    });

    it('handles very small numbers close to zero', () => {
      // Arrange & Act & Assert
      // formatPerpsFiat with PRICE_RANGES_UNIVERSAL: values below VERY_SMALL threshold (0.000001) show as "<$0"
      // This indicates "less than the smallest displayable value" which is more accurate than $0
      expect(
        formatPerpsFiat(0.0000001, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('<$0');
      expect(formatVolume(0.1)).toBe('$0.10'); // Now shows 2 decimals
      expect(formatPercentage(0.001)).toBe('+0.00%');
    });

    // TODO: We probably want a better fallback here
    it('handles NaN and Infinity values with safe fallbacks', () => {
      // Arrange & Act & Assert
      expect(formatPerpsFiat(NaN, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$---',
      );
      // formatPerpsFiat doesn't handle Infinity - shows "$∞"
      // High-level functions like formatChange() handle Infinity correctly
      expect(
        formatPerpsFiat(Infinity, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$∞');
      expect(formatVolume(NaN)).toBe('$---');
      expect(formatVolume(Infinity)).toBe('$---');
      expect(formatChange(NaN)).toBe('$0.00');
      expect(formatChange(Infinity)).toBe('$0.00');
      expect(formatPercentage(NaN)).toBe('0.00%');
      expect(formatPercentage(Infinity)).toBe('0.00%');
    });
  });
});
