import {
  calculateGroupingOptions,
  formatGroupingLabel,
  selectDefaultGrouping,
  aggregateOrderBookLevels,
} from './orderBookGrouping';
import type { OrderBookLevel } from '../hooks/stream/usePerpsLiveOrderBook';

describe('orderBookGrouping', () => {
  describe('calculateGroupingOptions', () => {
    it('returns correct options for BTC (~$87,000)', () => {
      const options = calculateGroupingOptions(87000);
      expect(options).toEqual([1, 2, 5, 10, 100, 1000]);
    });

    it('returns correct options for ETH (~$3,000)', () => {
      const options = calculateGroupingOptions(3000);
      expect(options).toEqual([0.1, 0.2, 0.5, 1, 10, 100]);
    });

    it('returns correct options for HYPE (~$33)', () => {
      const options = calculateGroupingOptions(33);
      expect(options).toEqual([0.001, 0.002, 0.005, 0.01, 0.1, 1]);
    });

    it('returns correct options for SUI (~$1)', () => {
      const options = calculateGroupingOptions(1);
      expect(options.length).toBe(6);
      expect(options[0]).toBeCloseTo(0.0001, 5);
      expect(options[1]).toBeCloseTo(0.0002, 5);
      expect(options[2]).toBeCloseTo(0.0005, 5);
      expect(options[3]).toBeCloseTo(0.001, 4);
      expect(options[4]).toBeCloseTo(0.01, 3);
      expect(options[5]).toBeCloseTo(0.1, 2);
    });

    it('returns correct options for SPX (~$0.6)', () => {
      const options = calculateGroupingOptions(0.6);
      // Check relative positions and that options scale correctly
      expect(options.length).toBe(6);
      expect(options[0]).toBeCloseTo(0.00001, 6);
      expect(options[5]).toBeCloseTo(0.01, 4);
    });

    it('returns correct options for PUMP (~$0.002)', () => {
      const options = calculateGroupingOptions(0.002);
      // Very small price, should have very fine granularity
      expect(options.length).toBe(6);
      // For $0.002: k = floor(log10(0.002)) = -3, base = 10^(-3-4) = 10^-7
      // Options: 1e-7, 2e-7, 5e-7, 1e-6, 1e-5, 1e-4
      expect(options[3]).toBeCloseTo(0.000001, 7);
    });

    it('handles zero price with fallback', () => {
      const options = calculateGroupingOptions(0);
      expect(options).toEqual([0.01, 0.1, 1]);
    });

    it('handles negative price with fallback', () => {
      const options = calculateGroupingOptions(-100);
      expect(options).toEqual([0.01, 0.1, 1]);
    });
  });

  describe('formatGroupingLabel', () => {
    it('formats integer values without decimals', () => {
      expect(formatGroupingLabel(1)).toBe('1');
      expect(formatGroupingLabel(10)).toBe('10');
      expect(formatGroupingLabel(100)).toBe('100');
      expect(formatGroupingLabel(1000)).toBe('1000');
    });

    it('formats decimal values with appropriate precision', () => {
      expect(formatGroupingLabel(0.1)).toBe('0.1');
      expect(formatGroupingLabel(0.01)).toBe('0.01');
      expect(formatGroupingLabel(0.001)).toBe('0.001');
      expect(formatGroupingLabel(0.0001)).toBe('0.0001');
      expect(formatGroupingLabel(0.00001)).toBe('0.00001');
      expect(formatGroupingLabel(0.000001)).toBe('0.000001');
    });

    it('formats 0.5-type values correctly', () => {
      expect(formatGroupingLabel(0.5)).toBe('0.5');
      expect(formatGroupingLabel(0.05)).toBe('0.05');
      expect(formatGroupingLabel(0.005)).toBe('0.005');
    });
  });

  describe('selectDefaultGrouping', () => {
    it('selects the 4th option (index 3) as default', () => {
      const options = [1, 2, 5, 10, 100, 1000];
      expect(selectDefaultGrouping(options)).toBe(10);
    });

    it('handles shorter arrays', () => {
      const options = [0.01, 0.1, 1];
      expect(selectDefaultGrouping(options)).toBe(0.1); // Middle option
    });

    it('returns first option for single-item array', () => {
      const options = [1];
      expect(selectDefaultGrouping(options)).toBe(1);
    });
  });

  describe('aggregateOrderBookLevels', () => {
    const mockBidLevels: OrderBookLevel[] = [
      {
        price: '50005',
        size: '1',
        total: '1',
        notional: '50005',
        totalNotional: '50005',
      },
      {
        price: '50004',
        size: '2',
        total: '3',
        notional: '100008',
        totalNotional: '150013',
      },
      {
        price: '49998',
        size: '1.5',
        total: '4.5',
        notional: '74997',
        totalNotional: '225010',
      },
      {
        price: '49995',
        size: '0.5',
        total: '5',
        notional: '24997.5',
        totalNotional: '250007.5',
      },
    ];

    const mockAskLevels: OrderBookLevel[] = [
      {
        price: '50010',
        size: '1',
        total: '1',
        notional: '50010',
        totalNotional: '50010',
      },
      {
        price: '50015',
        size: '2',
        total: '3',
        notional: '100030',
        totalNotional: '150040',
      },
      {
        price: '50025',
        size: '1.5',
        total: '4.5',
        notional: '75037.5',
        totalNotional: '225077.5',
      },
    ];

    it('aggregates bids by grouping size (10)', () => {
      const result = aggregateOrderBookLevels(mockBidLevels, 10, 'bid');

      // 50005, 50004 -> bucket 50000
      // 49998, 49995 -> bucket 49990
      expect(result.length).toBe(2);
      expect(parseFloat(result[0].price)).toBe(50000);
      expect(parseFloat(result[1].price)).toBe(49990);
    });

    it('aggregates asks by grouping size (10)', () => {
      const result = aggregateOrderBookLevels(mockAskLevels, 10, 'ask');

      // 50010 -> bucket 50010
      // 50015 -> bucket 50020
      // 50025 -> bucket 50030
      expect(result.length).toBe(3);
    });

    it('sums sizes within buckets', () => {
      const result = aggregateOrderBookLevels(mockBidLevels, 10, 'bid');

      // First bucket (50000): 1 + 2 = 3
      expect(parseFloat(result[0].size)).toBe(3);
    });

    it('calculates cumulative totals correctly', () => {
      const result = aggregateOrderBookLevels(mockBidLevels, 10, 'bid');

      // First bucket total: 3
      expect(parseFloat(result[0].total)).toBe(3);
      // Second bucket cumulative total: 3 + 2 = 5
      expect(parseFloat(result[1].total)).toBe(5);
    });

    it('returns original levels for grouping size 0', () => {
      const result = aggregateOrderBookLevels(mockBidLevels, 0, 'bid');
      expect(result).toBe(mockBidLevels);
    });

    it('handles empty levels array', () => {
      const result = aggregateOrderBookLevels([], 10, 'bid');
      expect(result).toEqual([]);
    });
  });
});
