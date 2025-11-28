import {
  calculateFundingCountdown,
  calculate24hHighLow,
  getAssetIconUrl,
  escapeRegex,
  compileMarketPattern,
  matchesMarketPattern,
  shouldIncludeMarket,
  validateMarketPattern,
  getPerpsDisplaySymbol,
  filterMarketsByQuery,
} from './marketUtils';
import type { CandleData } from '../types/perps-types';
import type { PerpsMarketData } from '../controllers/types';
import { CandlePeriod } from '../constants/chartConfig';

jest.mock('../constants/hyperLiquidConfig', () => ({
  HYPERLIQUID_ASSET_ICONS_BASE_URL: 'https://app.hyperliquid.xyz/coins/',
  HIP3_ASSET_ICONS_BASE_URL:
    'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/',
}));

describe('marketUtils', () => {
  describe('calculateFundingCountdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct countdown when current time is mid-hour', () => {
      // Set time to 2024-01-01 07:30:45 UTC
      const mockDate = new Date('2024-01-01T07:30:45.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:29:15'); // 29 minutes 15 seconds until next hour (08:00)
    });

    it('should calculate correct countdown in any hour', () => {
      // Set time to 2024-01-01 15:45:30 UTC
      const mockDate = new Date('2024-01-01T15:45:30.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:14:30'); // 14 minutes 30 seconds until next hour (16:00)
    });

    it('should calculate correct countdown at any time of day', () => {
      // Set time to 2024-01-01 23:30:00 UTC
      const mockDate = new Date('2024-01-01T23:30:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:30:00'); // 30 minutes until next hour (00:00)
    });

    it('should handle exact hour correctly', () => {
      // Set time to exactly 8:00:00 UTC (exact funding time)
      const mockDate = new Date('2024-01-01T08:00:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('01:00:00'); // 1 hour until next funding (9:00)
    });

    it('should handle midnight correctly', () => {
      // Set time to exactly 00:00:00 UTC
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('01:00:00'); // 1 hour until next funding (01:00)
    });

    it('should format single digit values with leading zeros', () => {
      // Set time to 2024-01-01 07:58:55 UTC
      const mockDate = new Date('2024-01-01T07:58:55.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:01:05'); // 1 minute 5 seconds until next hour (8:00)
    });

    it('should use specific next funding time when provided and within reasonable range', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Next funding time is in 30 minutes (reasonable for hourly funding)
      const nextFundingTime = mockDate.getTime() + 30 * 60 * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('00:30:00');
    });

    it('should use specific next funding time with seconds when within reasonable range', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Next funding time is in 45 minutes 30 seconds (reasonable for hourly funding)
      const nextFundingTime = mockDate.getTime() + (45 * 60 + 30) * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('00:45:30');
    });

    it('should handle expired specific funding time', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Next funding time is in the past
      const nextFundingTime = mockDate.getTime() - 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      // Falls back to default calculation when specific time is expired
      expect(result).toBe('01:00:00'); // 1 hour until next hour (13:00)
    });

    it('should handle edge case at 59 seconds', () => {
      // Set time to 07:59:01 UTC (59 seconds before funding)
      const mockDate = new Date('2024-01-01T07:59:01.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:00:59');
    });

    it('should handle edge case with 60 seconds exactly', () => {
      // Set time to 07:59:00 UTC (60 seconds before funding)
      const mockDate = new Date('2024-01-01T07:59:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:01:00');
    });

    it('should handle different UTC hours correctly', () => {
      // Test different hours - all should show 1 hour until next funding
      const testCases = [
        { hour: 0, expected: '01:00:00' }, // 00:00 -> 01:00
        { hour: 4, expected: '01:00:00' }, // 04:00 -> 05:00
        { hour: 8, expected: '01:00:00' }, // 08:00 -> 09:00
        { hour: 12, expected: '01:00:00' }, // 12:00 -> 13:00
        { hour: 16, expected: '01:00:00' }, // 16:00 -> 17:00
        { hour: 20, expected: '01:00:00' }, // 20:00 -> 21:00
      ];

      testCases.forEach(({ hour, expected }) => {
        const mockDate = new Date(
          `2024-01-01T${hour.toString().padStart(2, '0')}:00:00.000Z`,
        );
        jest.setSystemTime(mockDate);

        const result = calculateFundingCountdown();
        expect(result).toBe(expected);
      });
    });

    it('should handle time with custom funding interval', () => {
      const mockDate = new Date('2024-01-01T10:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Custom 4 hour funding interval (not used in default calculation)
      const result = calculateFundingCountdown({ fundingIntervalHours: 4 });
      // Still uses default calculation when no nextFundingTime provided
      expect(result).toBe('01:00:00'); // 1 hour until next hour (11:00)
    });

    it('should never exceed 59:59 for HyperLiquid 1-hour intervals', () => {
      // Test multiple random times throughout the day to ensure countdown never exceeds 59:59
      const testTimes = [
        '2024-01-01T00:30:15.000Z', // Mid first hour
        '2024-01-01T05:45:30.000Z', // Mid morning
        '2024-01-01T12:15:45.000Z', // Mid day
        '2024-01-01T18:59:59.000Z', // Last second before hour
        '2024-01-01T23:00:01.000Z', // Just after hour
      ];

      testTimes.forEach((timeString) => {
        const mockDate = new Date(timeString);
        jest.setSystemTime(mockDate);

        const result = calculateFundingCountdown();

        // Parse result and ensure it never exceeds 59:59
        const [hours, minutes, seconds] = result.split(':').map(Number);
        expect(hours).toBeLessThanOrEqual(1); // Should never be more than 1 hour
        expect(minutes).toBeLessThanOrEqual(59);
        expect(seconds).toBeLessThanOrEqual(59);

        // For fallback logic, hours should be 0 or 1 at most
        expect(hours).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle market-specific funding time that exceeds 1 hour by using fallback', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Market-specific funding time is 2.5 hours away (too long for HyperLiquid hourly funding)
      const nextFundingTime = mockDate.getTime() + 2.5 * 60 * 60 * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('01:00:00'); // Should use fallback logic for hourly funding
    });

    it('should use market-specific time when within reasonable range for hourly funding', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Market-specific funding time is 45 minutes away (reasonable for hourly funding)
      const nextFundingTime = mockDate.getTime() + 45 * 60 * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('00:45:00'); // Should use market-specific time
    });
  });

  describe('calculate24hHighLow', () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

    const mockCandleData: CandleData = {
      coin: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      candles: [
        {
          time: fortyEightHoursAgo,
          open: '100',
          high: '150',
          low: '90',
          close: '120',
          volume: '1000',
        },
        {
          time: twentyFourHoursAgo + 1000, // Just within 24h
          open: '120',
          high: '140',
          low: '110',
          close: '130',
          volume: '1500',
        },
        {
          time: twelveHoursAgo,
          open: '130',
          high: '160',
          low: '125',
          close: '155',
          volume: '2000',
        },
        {
          time: oneHourAgo,
          open: '155',
          high: '170',
          low: '150',
          close: '165',
          volume: '2500',
        },
      ],
    };

    it('should return correct high and low for 24h period', () => {
      const result = calculate24hHighLow(mockCandleData);
      expect(result).toEqual({
        high: 170, // Highest from last 3 candles (within 24h)
        low: 110, // Lowest from last 3 candles (within 24h)
      });
    });

    it('should handle null candleData', () => {
      const result = calculate24hHighLow(null);
      expect(result).toEqual({ high: 0, low: 0 });
    });

    it('should handle empty candles array', () => {
      const emptyData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [],
      };
      const result = calculate24hHighLow(emptyData);
      expect(result).toEqual({ high: 0, low: 0 });
    });

    it('should use all candles if none are within 24h', () => {
      const oldCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: fortyEightHoursAgo,
            open: '100',
            high: '200',
            low: '50',
            close: '120',
            volume: '1000',
          },
        ],
      };
      const result = calculate24hHighLow(oldCandleData);
      expect(result).toEqual({ high: 200, low: 50 });
    });

    it('should handle candles with string values', () => {
      const stringCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: oneHourAgo,
            open: '100.50',
            high: '150.75',
            low: '90.25',
            close: '120.60',
            volume: '1000',
          },
        ],
      };
      const result = calculate24hHighLow(stringCandleData);
      expect(result).toEqual({ high: 150.75, low: 90.25 });
    });

    it('should handle single candle within 24h', () => {
      const singleCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: oneHourAgo,
            open: '100',
            high: '120',
            low: '80',
            close: '110',
            volume: '500',
          },
        ],
      };
      const result = calculate24hHighLow(singleCandleData);
      expect(result).toEqual({ high: 120, low: 80 });
    });
  });

  describe('getAssetIconUrl', () => {
    it('returns Hyperliquid URL for regular asset', () => {
      const symbol = 'BTC';

      const result = getAssetIconUrl(symbol);

      expect(result).toBe('https://app.hyperliquid.xyz/coins/BTC.svg');
    });

    it('returns GitHub URL for HIP-3 asset with colon replaced by underscore', () => {
      const symbol = 'xyz:TSLA';

      const result = getAssetIconUrl(symbol);

      expect(result).toBe(
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/hip3%3Axyz_TSLA.svg',
      );
    });

    it('returns GitHub URL for HIP-3 asset with different DEX prefix', () => {
      const symbol = 'abc:XYZ100';

      const result = getAssetIconUrl(symbol);

      expect(result).toBe(
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/hip3%3Aabc_XYZ100.svg',
      );
    });

    it('removes k prefix for specified assets', () => {
      const symbol = 'kBONK';
      const kPrefixAssets = new Set(['KBONK']);

      const result = getAssetIconUrl(symbol, kPrefixAssets);

      expect(result).toBe('https://app.hyperliquid.xyz/coins/BONK.svg');
    });

    it('does not remove k prefix for assets not in the set', () => {
      const symbol = 'kBONK';
      const kPrefixAssets = new Set(['KPEPE']);

      const result = getAssetIconUrl(symbol, kPrefixAssets);

      expect(result).toBe('https://app.hyperliquid.xyz/coins/KBONK.svg');
    });

    it('returns empty string for empty symbol', () => {
      const symbol = '';

      const result = getAssetIconUrl(symbol);

      expect(result).toBe('');
    });

    it('uppercases lowercase symbols for regular assets', () => {
      const symbol = 'btc';

      const result = getAssetIconUrl(symbol);

      expect(result).toBe('https://app.hyperliquid.xyz/coins/BTC.svg');
    });

    it('uppercases lowercase symbols for HIP-3 assets', () => {
      const symbol = 'xyz:tsla';

      const result = getAssetIconUrl(symbol);

      expect(result).toBe(
        'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/icons/eip155:999/hip3%3Axyz_TSLA.svg',
      );
    });
  });

  describe('Pattern Matching Utilities', () => {
    describe('escapeRegex', () => {
      it('escapes regex special characters', () => {
        expect(escapeRegex('xyz.*')).toBe('xyz\\.\\*');
        expect(escapeRegex('test+value')).toBe('test\\+value');
        expect(escapeRegex('value?')).toBe('value\\?');
        expect(escapeRegex('[test]')).toBe('\\[test\\]');
        expect(escapeRegex('(group)')).toBe('\\(group\\)');
        expect(escapeRegex('test|or')).toBe('test\\|or');
      });

      it('returns unchanged string if no special characters', () => {
        expect(escapeRegex('xyz')).toBe('xyz');
        expect(escapeRegex('BTC')).toBe('BTC');
      });
    });

    describe('compileMarketPattern', () => {
      it('compiles wildcard pattern to RegExp', () => {
        const matcher = compileMarketPattern('xyz:*');
        expect(matcher).toBeInstanceOf(RegExp);
        expect((matcher as RegExp).test('xyz:TSLA')).toBe(true);
        expect((matcher as RegExp).test('xyz:AAPL')).toBe(true);
        expect((matcher as RegExp).test('abc:TSLA')).toBe(false);
        expect((matcher as RegExp).test('BTC')).toBe(false);
      });

      it('compiles DEX shorthand to RegExp', () => {
        const matcher = compileMarketPattern('xyz');
        expect(matcher).toBeInstanceOf(RegExp);
        expect((matcher as RegExp).test('xyz:TSLA')).toBe(true);
        expect((matcher as RegExp).test('xyz:AAPL')).toBe(true);
        expect((matcher as RegExp).test('abc:TSLA')).toBe(false);
        expect((matcher as RegExp).test('xyz')).toBe(false); // Must have colon
      });

      it('compiles DEX-only pattern to RegExp (treats as shorthand)', () => {
        // NOTE: "BTC" without colon is treated as DEX shorthand "BTC:*"
        const matcher = compileMarketPattern('BTC');
        expect(matcher).toBeInstanceOf(RegExp);
        expect((matcher as RegExp).test('BTC:ASSET')).toBe(true);
        expect((matcher as RegExp).test('BTC')).toBe(false); // Must have colon
      });

      it('compiles exact HIP-3 symbol to string', () => {
        const matcher = compileMarketPattern('xyz:TSLA');
        expect(typeof matcher).toBe('string');
        expect(matcher).toBe('xyz:TSLA');
      });
    });

    describe('matchesMarketPattern', () => {
      it('matches exact string patterns', () => {
        expect(matchesMarketPattern('BTC', 'BTC')).toBe(true);
        expect(matchesMarketPattern('ETH', 'BTC')).toBe(false);
        expect(matchesMarketPattern('xyz:TSLA', 'xyz:TSLA')).toBe(true);
        expect(matchesMarketPattern('xyz:AAPL', 'xyz:TSLA')).toBe(false);
      });

      it('matches RegExp patterns', () => {
        const pattern = /^xyz:/;
        expect(matchesMarketPattern('xyz:TSLA', pattern)).toBe(true);
        expect(matchesMarketPattern('xyz:AAPL', pattern)).toBe(true);
        expect(matchesMarketPattern('abc:TSLA', pattern)).toBe(false);
        expect(matchesMarketPattern('BTC', pattern)).toBe(false);
      });
    });

    describe('shouldIncludeMarket', () => {
      it('always includes main DEX markets (dex=null)', () => {
        const enabled = [{ pattern: 'xyz:*', matcher: /^xyz:/ }];
        const blocked = [{ pattern: 'BTC', matcher: 'BTC' }];

        expect(shouldIncludeMarket('BTC', null, true, enabled, blocked)).toBe(
          true,
        );
        expect(shouldIncludeMarket('ETH', null, true, enabled, blocked)).toBe(
          true,
        );
        expect(shouldIncludeMarket('SOL', null, true, [], blocked)).toBe(true);
      });

      it('blocks all HIP-3 markets when hip3Enabled is false', () => {
        const enabled = [{ pattern: 'xyz:*', matcher: /^xyz:/ }];
        expect(shouldIncludeMarket('xyz:TSLA', 'xyz', false, enabled, [])).toBe(
          false,
        );
        expect(shouldIncludeMarket('abc:AAPL', 'abc', false, [], [])).toBe(
          false,
        );
      });

      it('includes all HIP-3 markets when whitelist is empty', () => {
        expect(shouldIncludeMarket('xyz:TSLA', 'xyz', true, [], [])).toBe(true);
        expect(shouldIncludeMarket('abc:AAPL', 'abc', true, [], [])).toBe(true);
      });

      it('applies whitelist when non-empty', () => {
        const enabled = [
          { pattern: 'xyz:*', matcher: /^xyz:/ },
          { pattern: 'BTC', matcher: 'BTC' },
        ];

        expect(shouldIncludeMarket('xyz:TSLA', 'xyz', true, enabled, [])).toBe(
          true,
        );
        expect(shouldIncludeMarket('xyz:AAPL', 'xyz', true, enabled, [])).toBe(
          true,
        );
        expect(shouldIncludeMarket('abc:TSLA', 'abc', true, enabled, [])).toBe(
          false,
        );
      });

      it('applies blacklist after whitelist', () => {
        const enabled = [{ pattern: 'xyz:*', matcher: /^xyz:/ }];
        const blocked = [{ pattern: 'xyz:SCAM', matcher: 'xyz:SCAM' }];

        expect(
          shouldIncludeMarket('xyz:TSLA', 'xyz', true, enabled, blocked),
        ).toBe(true);
        expect(
          shouldIncludeMarket('xyz:SCAM', 'xyz', true, enabled, blocked),
        ).toBe(false);
      });

      it('applies blacklist when whitelist is empty', () => {
        const blocked = [
          { pattern: 'xyz:SCAM', matcher: 'xyz:SCAM' },
          { pattern: 'abc:*', matcher: /^abc:/ },
        ];

        expect(shouldIncludeMarket('xyz:TSLA', 'xyz', true, [], blocked)).toBe(
          true,
        );
        expect(shouldIncludeMarket('xyz:SCAM', 'xyz', true, [], blocked)).toBe(
          false,
        );
        expect(
          shouldIncludeMarket('abc:ANYTHING', 'abc', true, [], blocked),
        ).toBe(false);
        expect(shouldIncludeMarket('def:ASSET', 'def', true, [], blocked)).toBe(
          true,
        );
      });

      it('handles complex whitelist + blacklist combinations', () => {
        const enabled = [
          { pattern: 'xyz:*', matcher: /^xyz:/ },
          { pattern: 'abc:GOOD', matcher: 'abc:GOOD' },
        ];
        const blocked = [
          { pattern: 'xyz:SCAM', matcher: 'xyz:SCAM' },
          { pattern: 'xyz:RISKY', matcher: 'xyz:RISKY' },
        ];

        // xyz markets whitelisted but specific ones blocked
        expect(
          shouldIncludeMarket('xyz:TSLA', 'xyz', true, enabled, blocked),
        ).toBe(true);
        expect(
          shouldIncludeMarket('xyz:SCAM', 'xyz', true, enabled, blocked),
        ).toBe(false);
        expect(
          shouldIncludeMarket('xyz:RISKY', 'xyz', true, enabled, blocked),
        ).toBe(false);

        // abc market specifically whitelisted
        expect(
          shouldIncludeMarket('abc:GOOD', 'abc', true, enabled, blocked),
        ).toBe(true);
        expect(
          shouldIncludeMarket('abc:BAD', 'abc', true, enabled, blocked),
        ).toBe(false); // Not whitelisted

        // def not whitelisted at all
        expect(
          shouldIncludeMarket('def:ASSET', 'def', true, enabled, blocked),
        ).toBe(false);
      });

      it('returns true immediately when blacklist is empty', () => {
        const enabled = [{ pattern: 'xyz:*', matcher: /^xyz:/ }];

        expect(shouldIncludeMarket('xyz:TSLA', 'xyz', true, enabled, [])).toBe(
          true,
        );
      });
    });
  });

  describe('validateMarketPattern', () => {
    describe('valid patterns', () => {
      it('accepts simple alphanumeric patterns', () => {
        expect(() => validateMarketPattern('BTC')).not.toThrow();
        expect(() => validateMarketPattern('ETH')).not.toThrow();
        expect(() => validateMarketPattern('SOL')).not.toThrow();
      });

      it('accepts HIP-3 market patterns', () => {
        expect(() => validateMarketPattern('xyz:TSLA')).not.toThrow();
        expect(() => validateMarketPattern('abc:AAPL')).not.toThrow();
        expect(() => validateMarketPattern('dex1:MARKET1')).not.toThrow();
      });

      it('accepts wildcard patterns', () => {
        expect(() => validateMarketPattern('xyz:*')).not.toThrow();
        expect(() => validateMarketPattern('abc:*')).not.toThrow();
      });

      it('accepts patterns with hyphens and underscores', () => {
        expect(() => validateMarketPattern('dex-name:MARKET')).not.toThrow();
        expect(() => validateMarketPattern('dex_name:MARKET')).not.toThrow();
        expect(() => validateMarketPattern('xyz:MARKET-1')).not.toThrow();
        expect(() => validateMarketPattern('xyz:MARKET_1')).not.toThrow();
      });

      it('returns true for valid patterns', () => {
        expect(validateMarketPattern('BTC')).toBe(true);
        expect(validateMarketPattern('xyz:TSLA')).toBe(true);
      });
    });

    describe('invalid patterns - empty/whitespace', () => {
      it('rejects empty string', () => {
        expect(() => validateMarketPattern('')).toThrow(
          'Market pattern cannot be empty',
        );
      });

      it('rejects whitespace-only string', () => {
        expect(() => validateMarketPattern('   ')).toThrow(
          'Market pattern cannot be empty',
        );
      });
    });

    describe('invalid patterns - length', () => {
      it('rejects patterns that are too long', () => {
        const longPattern = 'a'.repeat(101);
        expect(() => validateMarketPattern(longPattern)).toThrow(
          'Market pattern exceeds maximum length (100 chars)',
        );
      });

      it('accepts patterns at maximum length', () => {
        const maxPattern = 'a'.repeat(100);
        expect(() => validateMarketPattern(maxPattern)).not.toThrow();
      });
    });

    describe('invalid patterns - regex control characters', () => {
      it('rejects patterns with backslash', () => {
        expect(() => validateMarketPattern('BTC\\d+')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with parentheses', () => {
        expect(() => validateMarketPattern('BTC(SCAM)')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with brackets', () => {
        expect(() => validateMarketPattern('BTC[a-z]')).toThrow(
          'Market pattern contains invalid regex characters',
        );
        expect(() => validateMarketPattern('xyz:{TSLA}')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with caret', () => {
        expect(() => validateMarketPattern('^BTC')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with dollar sign', () => {
        expect(() => validateMarketPattern('BTC$')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with plus', () => {
        expect(() => validateMarketPattern('BTC+')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with question mark', () => {
        expect(() => validateMarketPattern('BTC?')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with dot (except escaped)', () => {
        expect(() => validateMarketPattern('BTC.SCAM')).toThrow(
          'Market pattern contains invalid regex characters',
        );
        expect(() => validateMarketPattern('xyz:.*')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });

      it('rejects patterns with pipe', () => {
        expect(() => validateMarketPattern('BTC|ETH')).toThrow(
          'Market pattern contains invalid regex characters',
        );
      });
    });

    describe('invalid patterns - special characters', () => {
      it('rejects patterns with hash', () => {
        expect(() => validateMarketPattern('BTC#SCAM')).toThrow(
          'Market pattern contains invalid characters',
        );
      });

      it('rejects patterns with at symbol', () => {
        expect(() => validateMarketPattern('xyz:@SCAM')).toThrow(
          'Market pattern contains invalid characters',
        );
      });

      it('rejects patterns with exclamation mark', () => {
        expect(() => validateMarketPattern('xyz:SCAM!')).toThrow(
          'Market pattern contains invalid characters',
        );
      });

      it('rejects patterns with spaces', () => {
        expect(() => validateMarketPattern('BTC ETH')).toThrow(
          'Market pattern contains invalid characters',
        );
      });

      it('rejects patterns with percent', () => {
        expect(() => validateMarketPattern('BTC%')).toThrow(
          'Market pattern contains invalid characters',
        );
      });
    });
  });

  describe('getPerpsDisplaySymbol', () => {
    describe('hip3 assets with DEX prefix', () => {
      it('strips hip3 prefix from symbol', () => {
        const result = getPerpsDisplaySymbol('hip3:BTC');

        expect(result).toBe('BTC');
      });

      it('strips xyz DEX prefix from symbol', () => {
        const result = getPerpsDisplaySymbol('xyz:TSLA');

        expect(result).toBe('TSLA');
      });

      it('strips abc DEX prefix from symbol', () => {
        const result = getPerpsDisplaySymbol('abc:AAPL');

        expect(result).toBe('AAPL');
      });

      it('strips prefix with numbers', () => {
        const result = getPerpsDisplaySymbol('dex1:MARKET1');

        expect(result).toBe('MARKET1');
      });

      it('strips prefix with hyphens', () => {
        const result = getPerpsDisplaySymbol('dex-name:MARKET');

        expect(result).toBe('MARKET');
      });

      it('strips prefix with underscores', () => {
        const result = getPerpsDisplaySymbol('dex_name:MARKET');

        expect(result).toBe('MARKET');
      });

      it('handles multiple colons by taking first occurrence', () => {
        const result = getPerpsDisplaySymbol('hip3:BTC:USD');

        expect(result).toBe('BTC:USD');
      });
    });

    describe('regular assets without DEX prefix', () => {
      it('returns BTC unchanged', () => {
        const result = getPerpsDisplaySymbol('BTC');

        expect(result).toBe('BTC');
      });

      it('returns ETH unchanged', () => {
        const result = getPerpsDisplaySymbol('ETH');

        expect(result).toBe('ETH');
      });

      it('returns SOL unchanged', () => {
        const result = getPerpsDisplaySymbol('SOL');

        expect(result).toBe('SOL');
      });

      it('returns multi-character symbol unchanged', () => {
        const result = getPerpsDisplaySymbol('BONK');

        expect(result).toBe('BONK');
      });
    });

    describe('edge cases', () => {
      it('returns empty string for empty input', () => {
        const result = getPerpsDisplaySymbol('');

        expect(result).toBe('');
      });

      it('returns null for null input', () => {
        const result = getPerpsDisplaySymbol(null as unknown as string);

        expect(result).toBe(null);
      });

      it('returns undefined for undefined input', () => {
        const result = getPerpsDisplaySymbol(undefined as unknown as string);

        expect(result).toBe(undefined);
      });

      it('returns symbol unchanged when colon is at start', () => {
        const result = getPerpsDisplaySymbol(':BTC');

        expect(result).toBe(':BTC');
      });

      it('returns symbol unchanged when colon is at end', () => {
        const result = getPerpsDisplaySymbol('BTC:');

        expect(result).toBe('BTC:');
      });

      it('returns symbol unchanged when only colon', () => {
        const result = getPerpsDisplaySymbol(':');

        expect(result).toBe(':');
      });

      it('handles symbols with special characters after colon', () => {
        const result = getPerpsDisplaySymbol('hip3:BTC-PERP');

        expect(result).toBe('BTC-PERP');
      });

      it('handles symbols with numbers after colon', () => {
        const result = getPerpsDisplaySymbol('hip3:1INCH');

        expect(result).toBe('1INCH');
      });

      it('handles lowercase symbols', () => {
        const result = getPerpsDisplaySymbol('hip3:btc');

        expect(result).toBe('btc');
      });

      it('handles mixed case symbols', () => {
        const result = getPerpsDisplaySymbol('Hip3:BtC');

        expect(result).toBe('BtC');
      });
    });

    describe('preserves display format', () => {
      it('preserves lowercase after stripping prefix', () => {
        const result = getPerpsDisplaySymbol('xyz:tsla');

        expect(result).toBe('tsla');
      });

      it('preserves uppercase after stripping prefix', () => {
        const result = getPerpsDisplaySymbol('xyz:TSLA');

        expect(result).toBe('TSLA');
      });

      it('preserves mixed case after stripping prefix', () => {
        const result = getPerpsDisplaySymbol('xyz:TsLa');

        expect(result).toBe('TsLa');
      });
    });
  });

  describe('filterMarketsByQuery', () => {
    const mockMarkets: Partial<PerpsMarketData>[] = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'xyz:TSLA', name: 'Tesla Stock' },
    ];

    it('returns all markets when query is empty or whitespace', () => {
      const result1 = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        '',
      );
      const result2 = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        '   ',
      );

      expect(result1).toEqual(mockMarkets);
      expect(result2).toEqual(mockMarkets);
    });

    it('filters markets by symbol case-insensitively', () => {
      const result = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        'btc',
      );

      expect(result).toEqual([mockMarkets[0]]);
    });

    it('filters markets by name case-insensitively', () => {
      const result = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        'ethereum',
      );

      expect(result).toEqual([mockMarkets[1]]);
    });

    it('filters markets by partial matches in symbol or name', () => {
      const result = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        'Stock',
      );

      expect(result).toEqual([mockMarkets[2]]);
    });

    it('returns empty array when no markets match query', () => {
      const result = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        'NonExistent',
      );

      expect(result).toEqual([]);
    });

    it('trims whitespace from query before matching', () => {
      const result = filterMarketsByQuery(
        mockMarkets as PerpsMarketData[],
        '  BTC  ',
      );

      expect(result).toEqual([mockMarkets[0]]);
    });
  });
});
