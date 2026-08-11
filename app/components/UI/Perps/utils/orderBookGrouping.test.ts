import {
  calculateGroupingOptions,
  formatGroupingLabel,
  selectDefaultGrouping,
  aggregateOrderBookLevels,
  calculateAggregationParams,
  groupOrderBook,
  getDepthRatio,
  getDepthWidth,
  formatSpreadPercent,
  formatColumnValue,
  formatOrderBookPrice,
  getOrderBookPriceFormat,
} from './orderBookGrouping';
import type { OrderBookLevel } from '../hooks/stream/usePerpsLiveOrderBook';
import type { OrderBookData } from '@metamask/perps-controller';

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

  describe('calculateAggregationParams', () => {
    describe('guard clause for invalid inputs', () => {
      it('returns nSigFigs: 5 for price <= 0', () => {
        expect(calculateAggregationParams(10, 0)).toEqual({ nSigFigs: 5 });
        expect(calculateAggregationParams(10, -100)).toEqual({ nSigFigs: 5 });
      });

      it('returns nSigFigs: 5 for grouping <= 0', () => {
        expect(calculateAggregationParams(0, 50000)).toEqual({ nSigFigs: 5 });
        expect(calculateAggregationParams(-10, 50000)).toEqual({ nSigFigs: 5 });
      });
    });

    describe('BTC at ~$90,000', () => {
      const btcPrice = 90000;

      it('returns nSigFigs: 5 without mantissa for grouping 1', () => {
        const result = calculateAggregationParams(1, btcPrice);
        expect(result).toEqual({ nSigFigs: 5 });
      });

      it('returns nSigFigs: 5 with mantissa: 2 for grouping 2', () => {
        const result = calculateAggregationParams(2, btcPrice);
        expect(result).toEqual({ nSigFigs: 5, mantissa: 2 });
      });

      it('returns nSigFigs: 5 with mantissa: 5 for grouping 5', () => {
        const result = calculateAggregationParams(5, btcPrice);
        expect(result).toEqual({ nSigFigs: 5, mantissa: 5 });
      });

      it('returns nSigFigs: 4 for grouping 10', () => {
        const result = calculateAggregationParams(10, btcPrice);
        expect(result).toEqual({ nSigFigs: 4 });
      });

      it('returns nSigFigs: 3 for grouping 100', () => {
        const result = calculateAggregationParams(100, btcPrice);
        expect(result).toEqual({ nSigFigs: 3 });
      });

      it('returns nSigFigs: 2 for grouping 1000', () => {
        const result = calculateAggregationParams(1000, btcPrice);
        expect(result).toEqual({ nSigFigs: 2 });
      });
    });

    describe('ETH at ~$3,000', () => {
      const ethPrice = 3000;

      it('returns nSigFigs: 5 without mantissa for grouping 0.1', () => {
        const result = calculateAggregationParams(0.1, ethPrice);
        expect(result).toEqual({ nSigFigs: 5 });
      });

      it('returns nSigFigs: 4 for grouping 1', () => {
        const result = calculateAggregationParams(1, ethPrice);
        expect(result).toEqual({ nSigFigs: 4 });
      });

      it('returns nSigFigs: 3 for grouping 10', () => {
        const result = calculateAggregationParams(10, ethPrice);
        expect(result).toEqual({ nSigFigs: 3 });
      });
    });

    describe('very small prices (PUMP at ~$0.002)', () => {
      const pumpPrice = 0.002;

      it('handles very small price with appropriate nSigFigs', () => {
        const result = calculateAggregationParams(0.000001, pumpPrice);
        // magnitude = floor(log10(0.002)) = -3
        // groupingMagnitude = floor(log10(0.000001)) = -6
        // baseNSigFigs = -3 - (-6) + 1 = 4
        expect(result).toEqual({ nSigFigs: 4 });
      });

      it('returns finest granularity for smallest groupings', () => {
        const result = calculateAggregationParams(0.0000001, pumpPrice);
        expect(result.nSigFigs).toBe(5);
        expect(result.mantissa).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('clamps nSigFigs to minimum of 2', () => {
        // Very large grouping relative to price
        const result = calculateAggregationParams(10000, 90000);
        // baseNSigFigs = 4 - 4 + 1 = 1, clamped to 2
        expect(result.nSigFigs).toBe(2);
      });

      it('handles fractional grouping values correctly', () => {
        const result = calculateAggregationParams(0.5, 3000);
        // Should derive mantissa from first digit (5)
        expect(result.nSigFigs).toBe(5);
        expect(result.mantissa).toBe(5);
      });
    });
  });

  describe('groupOrderBook', () => {
    const book: OrderBookData = {
      bids: [
        {
          price: '100',
          size: '1',
          total: '1',
          notional: '100',
          totalNotional: '100',
        },
        {
          price: '99',
          size: '2',
          total: '3',
          notional: '198',
          totalNotional: '298',
        },
      ],
      asks: [
        {
          price: '101',
          size: '1.5',
          total: '1.5',
          notional: '151.5',
          totalNotional: '151.5',
        },
      ],
      spread: '1',
      spreadPercentage: '1',
      midPrice: '100.5',
      lastUpdated: 0,
      maxTotal: '3',
    };

    it('trims without re-bucketing when grouping is null', () => {
      const result = groupOrderBook(book, null, 1);
      expect(result.bids).toHaveLength(1);
      expect(result.asks).toHaveLength(1);
      expect(result.maxTotal).toBe(1.5);
    });
  });

  describe('getDepthRatio / getDepthWidth / formatters', () => {
    it('computes buy/sell depth percentages', () => {
      const bids: OrderBookLevel[] = [
        {
          price: '1',
          size: '1',
          total: '3',
          notional: '1',
          totalNotional: '3',
        },
      ];
      const asks: OrderBookLevel[] = [
        {
          price: '2',
          size: '1',
          total: '1',
          notional: '2',
          totalNotional: '2',
        },
      ];
      expect(getDepthRatio(bids, asks)).toEqual({
        buyPercent: 75,
        sellPercent: 25,
      });
    });

    it('scales depth bar width against maxTotal', () => {
      expect(
        getDepthWidth(
          {
            price: '1',
            size: '1',
            total: '50',
            notional: '1',
            totalNotional: '1',
          },
          100,
        ),
      ).toBe(50);
    });

    it('formats spread percent and column values', () => {
      expect(formatSpreadPercent(0.0027)).toBe('0.003%');
      expect(
        formatColumnValue(
          {
            price: '100',
            size: '1.5',
            total: '3',
            notional: '150',
            totalNotional: '300',
          },
          'usd',
          'total',
        ),
      ).toContain('300');
    });
  });

  describe('formatColumnValue compact notation', () => {
    const level = (overrides: Partial<OrderBookLevel>): OrderBookLevel => ({
      price: '1',
      size: '1',
      total: '1',
      notional: '1',
      totalNotional: '1',
      ...overrides,
    });

    it.each([
      ['95', '$95'],
      ['999.4', '$999.4'],
      // Reported case: 2097 used to render as "$2,097".
      ['2097', '$2.1K'],
      ['121000', '$121.0K'],
      ['604930', '$604.9K'],
      ['1234567', '$1.2M'],
      ['2500000000', '$2.5B'],
    ])('abbreviates USD size %s as %s', (notional, expected) => {
      expect(formatColumnValue(level({ notional }), 'usd', 'size')).toBe(
        expected,
      );
    });

    it.each([
      // Low-priced assets (PUMP, PEPE) trade in millions of base units.
      ['2097000', '2.1M'],
      ['604930000', '604.9M'],
    ])('abbreviates base size %s as %s', (size, expected) => {
      expect(formatColumnValue(level({ size }), 'base', 'size', 0)).toBe(
        expected,
      );
    });

    it('leaves sub-threshold base sizes at the asset precision', () => {
      expect(formatColumnValue(level({ size: '1.5' }), 'base', 'size', 4)).toBe(
        '1.5',
      );
      expect(formatColumnValue(level({ size: '999' }), 'base', 'size', 4)).toBe(
        '999',
      );
    });

    it('abbreviates the cumulative total the same way as per-level size', () => {
      expect(
        formatColumnValue(level({ totalNotional: '2097' }), 'usd', 'total'),
      ).toBe('$2.1K');
    });
  });

  describe('getOrderBookPriceFormat', () => {
    it.each([
      // [grouping, midPrice, szDecimals, expected decimals]
      [0.01, 33.45, 2, 2],
      [0.002, 0.5, 0, 3],
      [0.000001, 0.002097, 0, 6],
    ])(
      'matches the grouping step below the abbreviation threshold (grouping %p)',
      (grouping, midPrice, szDecimals, expected) => {
        expect(getOrderBookPriceFormat(grouping, midPrice, szDecimals)).toEqual(
          { divisor: 1, suffix: '', decimals: expected },
        );
      },
    );

    it('caps at the asset price precision Hyperliquid allows (6 - szDecimals)', () => {
      expect(getOrderBookPriceFormat(0.0000001, 0.5, 0)?.decimals).toBe(6);
      expect(getOrderBookPriceFormat(0.001, 0.5, 5)?.decimals).toBe(1);
    });

    it('caps at 6 decimals when szDecimals is unknown', () => {
      expect(getOrderBookPriceFormat(0.0000001, 0.5)?.decimals).toBe(6);
    });

    it.each([
      // [grouping, midPrice, expected]
      [1000, 64500, { divisor: 1000, suffix: 'K', decimals: 0 }],
      [100, 64500, { divisor: 1000, suffix: 'K', decimals: 1 }],
      [10, 61470, { divisor: 1000, suffix: 'K', decimals: 2 }],
      [10000, 5000000, { divisor: 1000000, suffix: 'M', decimals: 2 }],
      [100000, 52000000, { divisor: 1000000, suffix: 'M', decimals: 1 }],
    ])(
      'scales up while the grouping step still fits (grouping %p, mid %p)',
      (grouping, midPrice, expected) => {
        expect(getOrderBookPriceFormat(grouping, midPrice, 5)).toEqual(
          expected,
        );
      },
    );

    it.each([
      // [grouping, midPrice] — the default grouping at each of these mids.
      [1000, 5000000],
      [1000, 1250000],
    ])(
      'never drops to a smaller scale than the mid price warrants (grouping %p, mid %p)',
      (grouping, midPrice) => {
        // Falling through from M to K produced "$5,000K": thousand separators
        // inside an abbreviation, and a suffix understating the magnitude.
        const format = getOrderBookPriceFormat(grouping, midPrice, 2);

        expect(format?.suffix).toBe('M');
        expect(formatOrderBookPrice(midPrice, format)).not.toContain(',');
      },
    );

    it('spends a third decimal when it keeps the honest scale and still saves width', () => {
      expect(getOrderBookPriceFormat(1000, 5000000, 2)).toEqual({
        divisor: 1000000,
        suffix: 'M',
        decimals: 3,
      });
    });

    it('stays unabbreviated when the suffix would cost more width than it saves', () => {
      // "$61.470K" is longer than "$61,470" and no clearer.
      expect(getOrderBookPriceFormat(1, 61470, 5)).toEqual({
        divisor: 1,
        suffix: '',
        decimals: 0,
      });
    });

    it('stays unabbreviated when the mantissa would need unreadable precision', () => {
      // "$3.4521K" saves nothing over "$3,452.1" and reads worse.
      expect(getOrderBookPriceFormat(0.1, 3452, 4)).toEqual({
        divisor: 1,
        suffix: '',
        decimals: 1,
      });
    });

    it('never abbreviates assets priced below the smallest scale', () => {
      expect(getOrderBookPriceFormat(0.1, 999, 4)?.suffix).toBe('');
    });

    it('ignores the mid price when it is unusable', () => {
      expect(getOrderBookPriceFormat(1000, null, 5)).toEqual({
        divisor: 1,
        suffix: '',
        decimals: 0,
      });
    });

    it.each([[null], [0], [-1], [Number.NaN]])(
      'returns null for unusable grouping %p',
      (grouping) => {
        expect(getOrderBookPriceFormat(grouping, 64500, 0)).toBeNull();
      },
    );
  });

  describe('formatOrderBookPrice', () => {
    it('abbreviates a BTC ladder grouped in thousands', () => {
      const format = getOrderBookPriceFormat(1000, 64500, 5);

      // Every level ended in ",000", so three characters per row were padding.
      expect(
        [69000, 68000, 67000, 60000].map((price) =>
          formatOrderBookPrice(price, format),
        ),
      ).toEqual(['$69K', '$68K', '$67K', '$60K']);
    });

    it('keeps the grouping step visible inside the abbreviation', () => {
      const format = getOrderBookPriceFormat(10, 61470, 5);

      expect(
        [61470, 61460, 61450].map((price) =>
          formatOrderBookPrice(price, format),
        ),
      ).toEqual(['$61.47K', '$61.46K', '$61.45K']);
    });

    it('abbreviates a million-dollar ladder at its true magnitude', () => {
      const format = getOrderBookPriceFormat(1000, 5000000, 2);

      expect(
        [5000000, 4999000, 4998000].map((price) =>
          formatOrderBookPrice(price, format),
        ),
      ).toEqual(['$5.000M', '$4.999M', '$4.998M']);
    });

    it('renders every level of a PUMP ladder at the same precision', () => {
      const format = getOrderBookPriceFormat(0.000001, 0.0021, 0);

      // Trailing-zero stripping previously produced "$0.0021" between
      // "$0.002099" and "$0.002101", so the column never lined up.
      expect(
        ['0.002099', '0.0021', '0.002101'].map((price) =>
          formatOrderBookPrice(price, format),
        ),
      ).toEqual(['$0.002099', '$0.002100', '$0.002101']);
    });

    it('keeps neighbouring low-priced levels distinguishable', () => {
      const format = getOrderBookPriceFormat(0.000001, 0.0098, 0);
      const prices = ['0.0098', '0.009801', '0.009802'].map((price) =>
        formatOrderBookPrice(price, format),
      );

      // Magnitude-based formatting collapsed all three into one string.
      expect(new Set(prices).size).toBe(3);
    });

    it('drops decimals entirely for coarse groupings', () => {
      const format = getOrderBookPriceFormat(1, 61470, 5);

      expect(formatOrderBookPrice('61470', format)).toBe('$61,470');
    });

    it('falls back to magnitude-based formatting when precision is unknown', () => {
      expect(formatOrderBookPrice('0.002097', null)).toBe('$0.002097');
    });

    it('returns the fallback display for unparseable prices', () => {
      expect(
        formatOrderBookPrice('not-a-number', {
          divisor: 1,
          suffix: '',
          decimals: 2,
        }),
      ).toBe('—');
    });
  });
});
