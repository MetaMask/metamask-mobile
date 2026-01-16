import {
  formatPercentage,
  formatPrice,
  formatAddress,
  formatCurrencyValue,
  estimateLineCount,
  formatVolume,
  getRecurrence,
  formatCents,
  formatPositionSize,
  calculateNetAmount,
  formatPriceWithSubscriptNotation,
} from './format';
import { Recurrence, PredictSeries } from '../types';

// Mock Dimensions from react-native
const mockDimensionsGet = jest.fn(() => ({
  width: 375,
  height: 667,
  scale: 2,
  fontScale: 1,
}));
jest.mock('react-native', () => ({
  Dimensions: {
    get: mockDimensionsGet,
  },
}));

describe('format utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatPercentage', () => {
    describe('default behavior (truncate=false)', () => {
      it('formats positive decimal percentage with 2 decimals', () => {
        // Arrange & Act
        const result = formatPercentage(5.25);

        // Assert
        expect(result).toBe('5.25%');
      });

      it('formats large percentage without truncation', () => {
        // Arrange & Act
        const result = formatPercentage(100);

        // Assert
        expect(result).toBe('100%');
      });

      it('formats negative decimal percentage with 2 decimals', () => {
        // Arrange & Act
        const result = formatPercentage(-2.75);

        // Assert
        expect(result).toBe('-2.75%');
      });

      it('formats negative whole number percentage without decimals', () => {
        // Arrange & Act
        const result = formatPercentage(-50);

        // Assert
        expect(result).toBe('-50%');
      });

      it('formats zero as 0%', () => {
        // Arrange & Act
        const result = formatPercentage(0);

        // Assert
        expect(result).toBe('0%');
      });

      it('handles string input with decimal value', () => {
        // Arrange & Act
        const result = formatPercentage('3.14159');

        // Assert
        expect(result).toBe('3.14%');
      });

      it('handles string input with whole number', () => {
        // Arrange & Act
        const result = formatPercentage('42');

        // Assert
        expect(result).toBe('42%');
      });

      it('handles string input with negative value', () => {
        // Arrange & Act
        const result = formatPercentage('-7.89');

        // Assert
        expect(result).toBe('-7.89%');
      });

      it('returns default value for NaN input', () => {
        // Arrange & Act
        const result = formatPercentage('not-a-number');

        // Assert
        expect(result).toBe('0%');
      });

      it('returns default value for invalid string', () => {
        // Arrange & Act
        const result = formatPercentage('abc');

        // Assert
        expect(result).toBe('0%');
      });

      it('returns default value for empty string', () => {
        // Arrange & Act
        const result = formatPercentage('');

        // Assert
        expect(result).toBe('0%');
      });

      it.each([
        [0.01, '0.01%'],
        [0.001, '0%'],
        [0.5, '0.5%'],
        [0.9, '0.9%'],
        [1.999, '2%'],
        [99, '99%'],
        [99.999, '100%'],
        [100, '100%'],
        [-0.01, '-0.01%'],
        [-0.001, '0%'],
        [-1.999, '-2%'],
      ])('formats %f correctly as %s', (input, expected) => {
        expect(formatPercentage(input)).toBe(expected);
      });
    });

    describe('with truncate=true', () => {
      it('formats positive decimal percentage with no decimals', () => {
        // Arrange & Act
        const result = formatPercentage(5.25, { truncate: true });

        // Assert
        expect(result).toBe('5%');
      });

      it('formats large percentage as >99%', () => {
        // Arrange & Act
        const result = formatPercentage(100, { truncate: true });

        // Assert
        expect(result).toBe('>99%');
      });

      it('formats negative decimal percentage with no decimals', () => {
        // Arrange & Act
        const result = formatPercentage(-2.75, { truncate: true });

        // Assert
        expect(result).toBe('-3%');
      });

      it('formats negative whole number percentage without decimals', () => {
        // Arrange & Act
        const result = formatPercentage(-50, { truncate: true });

        // Assert
        expect(result).toBe('-50%');
      });

      it('formats zero as 0%', () => {
        // Arrange & Act
        const result = formatPercentage(0, { truncate: true });

        // Assert
        expect(result).toBe('0%');
      });

      it('handles string input with decimal value', () => {
        // Arrange & Act
        const result = formatPercentage('3.14159', { truncate: true });

        // Assert
        expect(result).toBe('3%');
      });

      it('handles string input with whole number', () => {
        // Arrange & Act
        const result = formatPercentage('42', { truncate: true });

        // Assert
        expect(result).toBe('42%');
      });

      it('handles string input with negative value', () => {
        // Arrange & Act
        const result = formatPercentage('-7.89', { truncate: true });

        // Assert
        expect(result).toBe('-8%');
      });

      it('returns default value for NaN input', () => {
        // Arrange & Act
        const result = formatPercentage('not-a-number', { truncate: true });

        // Assert
        expect(result).toBe('0%');
      });

      it.each([
        [0.01, '<1%'],
        [0.001, '<1%'],
        [0.5, '<1%'],
        [0.9, '<1%'],
        [1.999, '2%'],
        [99, '>99%'],
        [99.999, '>99%'],
        [100, '>99%'],
        [-0.01, '0%'],
        [-0.001, '0%'],
        [-1.999, '-2%'],
      ])('formats %f correctly as %s', (input, expected) => {
        expect(formatPercentage(input, { truncate: true })).toBe(expected);
      });
    });

    describe('with truncate=false', () => {
      it('displays integer percentage without decimals', () => {
        // Arrange & Act
        const result = formatPercentage(5, { truncate: false });

        // Assert
        expect(result).toBe('5%');
      });

      it('displays percentage with 2 decimals when not integer', () => {
        // Arrange & Act
        const result = formatPercentage(5.25, { truncate: false });

        // Assert
        expect(result).toBe('5.25%');
      });

      it('displays percentage with 1 decimal when second decimal is zero', () => {
        // Arrange & Act
        const result = formatPercentage(5.5, { truncate: false });

        // Assert
        expect(result).toBe('5.5%');
      });

      it('displays values above 99 with actual percentage', () => {
        // Arrange & Act
        const result = formatPercentage(99.5, { truncate: false });

        // Assert
        expect(result).toBe('99.5%');
      });

      it('displays values above 100 with actual percentage', () => {
        // Arrange & Act
        const result = formatPercentage(150, { truncate: false });

        // Assert
        expect(result).toBe('150%');
      });

      it('displays values below 1 with actual percentage', () => {
        // Arrange & Act
        const result = formatPercentage(0.5, { truncate: false });

        // Assert
        expect(result).toBe('0.5%');
      });

      it('displays small decimal values with 2 decimals', () => {
        // Arrange & Act
        const result = formatPercentage(0.01, { truncate: false });

        // Assert
        expect(result).toBe('0.01%');
      });

      it('displays negative percentage with decimals', () => {
        // Arrange & Act
        const result = formatPercentage(-2.75, { truncate: false });

        // Assert
        expect(result).toBe('-2.75%');
      });

      it('displays negative integer percentage without decimals', () => {
        // Arrange & Act
        const result = formatPercentage(-50, { truncate: false });

        // Assert
        expect(result).toBe('-50%');
      });

      it('displays zero without decimals', () => {
        // Arrange & Act
        const result = formatPercentage(0, { truncate: false });

        // Assert
        expect(result).toBe('0%');
      });

      it('rounds to 2 decimals when more decimals provided', () => {
        // Arrange & Act
        const result = formatPercentage(5.256, { truncate: false });

        // Assert
        expect(result).toBe('5.26%');
      });

      it('handles string input with decimals', () => {
        // Arrange & Act
        const result = formatPercentage('3.14159', { truncate: false });

        // Assert
        expect(result).toBe('3.14%');
      });

      it('handles string input with integer', () => {
        // Arrange & Act
        const result = formatPercentage('42', { truncate: false });

        // Assert
        expect(result).toBe('42%');
      });

      it('returns default value for NaN input', () => {
        // Arrange & Act
        const result = formatPercentage('not-a-number', { truncate: false });

        // Assert
        expect(result).toBe('0%');
      });

      it.each([
        [0.01, '0.01%'],
        [0.001, '0%'],
        [0.5, '0.5%'],
        [0.9, '0.9%'],
        [1.999, '2%'],
        [99, '99%'],
        [99.999, '100%'],
        [99.5, '99.5%'],
        [100, '100%'],
        [150.75, '150.75%'],
        [-0.01, '-0.01%'],
        [-0.001, '0%'],
        [-1.999, '-2%'],
        [-50, '-50%'],
        [-2.75, '-2.75%'],
      ])('formats %f correctly as %s', (input, expected) => {
        expect(formatPercentage(input, { truncate: false })).toBe(expected);
      });
    });
  });

  describe('formatPrice', () => {
    it('formats prices with exactly 2 decimal places (rounded up)', () => {
      // Arrange & Act
      const result = formatPrice(1234.5678);

      // Assert
      expect(result).toBe('$1,234.57');
    });

    it('formats prices ignoring custom minimum decimals option', () => {
      // Arrange & Act
      const result = formatPrice(50000, { minimumDecimals: 0 });

      // Assert
      expect(result).toBe('$50,000');
    });

    it('formats prices respecting custom minimum decimals option', () => {
      // Arrange & Act
      const result = formatPrice(1234.5678, {
        minimumDecimals: 4,
        maximumDecimals: 4,
      });

      // Assert
      expect(result).toBe('$1,234.5678');
    });

    it('respects minimumDecimals for integer values', () => {
      // Arrange & Act
      const result = formatPrice(100, { minimumDecimals: 2 });

      // Assert
      expect(result).toBe('$100.00');
    });

    it('formats small prices with 2 decimal places (rounded)', () => {
      // Arrange & Act
      const result = formatPrice(0.1234);

      // Assert
      expect(result).toBe('$0.12');
    });

    it('formats very small prices rounded', () => {
      // Arrange & Act
      const result = formatPrice(0.0001234);

      // Assert
      expect(result).toBe('$0');
    });

    it('handles string input with decimal value', () => {
      // Arrange & Act
      const result = formatPrice('1234.5678');

      // Assert
      expect(result).toBe('$1,234.57');
    });

    it('handles string input with small value', () => {
      // Arrange & Act
      const result = formatPrice('0.1234');

      // Assert
      expect(result).toBe('$0.12');
    });

    it('returns default value for NaN with default decimals', () => {
      // Arrange & Act
      const result = formatPrice('not-a-number');

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns default value for NaN ignoring options', () => {
      // Arrange & Act
      const result = formatPrice(NaN, { minimumDecimals: 0 });

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns default value for invalid string', () => {
      // Arrange & Act
      const result = formatPrice('abc');

      // Assert
      expect(result).toBe('$0.00');
    });

    it('returns default value for empty string', () => {
      // Arrange & Act
      const result = formatPrice('');

      // Assert
      expect(result).toBe('$0.00');
    });

    it('formats exactly 1000 correctly', () => {
      // Arrange & Act
      const result = formatPrice(1000);

      // Assert
      expect(result).toBe('$1,000');
    });

    it('formats negative prices correctly', () => {
      // Arrange & Act
      const result = formatPrice(-1234.56);

      // Assert
      expect(result).toBe('-$1,234.56');
    });

    it('formats zero correctly', () => {
      // Arrange & Act
      const result = formatPrice(0);

      // Assert
      expect(result).toBe('$0');
    });

    it('formats very large numbers correctly', () => {
      // Arrange & Act
      const result = formatPrice(1000000);

      // Assert
      expect(result).toBe('$1,000,000');
    });

    it('rounds up to next cent - 1234.999 becomes $1,235', () => {
      // Arrange & Act
      const result = formatPrice(1234.999);

      // Assert
      expect(result).toBe('$1,235');
    });

    it.each([
      [999.999, '$1,000'],
      [1000, '$1,000'],
      [1000.001, '$1,000'],
      [0.9999, '$1'],
      [0.00009999, '$0'],
    ])('formats boundary value %f as %s', (input, expected) => {
      const result = formatPrice(input);
      expect(result).toBe(expected);
    });
  });

  describe('formatCurrencyValue', () => {
    it.each([
      [undefined, undefined],
      [null, undefined],
    ])('returns %s as %s', (input, expected) => {
      const result = formatCurrencyValue(input as unknown as number);

      expect(result).toBe(expected);
    });

    it.each([
      [1234.56, '$1,234.56'],
      [-789.1, '$789.10'],
      [0, '$0.00'],
    ])('formats %s without sign by default as %s', (input, expected) => {
      const result = formatCurrencyValue(input);

      expect(result).toBe(expected);
    });

    it.each([
      [123.45, '+$123.45'],
      [-123.45, '-$123.45'],
      [0, '$0.00'],
    ])('formats %s with sign when showSign=true as %s', (input, expected) => {
      const result = formatCurrencyValue(input, { showSign: true });

      expect(result).toBe(expected);
    });

    it('uses absolute value and 2 decimals (rounded) for values >= 1000', () => {
      const result = formatCurrencyValue(-1234.567);

      expect(result).toBe('$1,234.57');
    });

    it('uses absolute value and 2 decimals (rounded) for values < 1000', () => {
      const result = formatCurrencyValue(-0.1234);

      expect(result).toBe('$0.12');
    });
  });

  describe('formatAddress', () => {
    it('formats standard Ethereum address correctly', () => {
      // Arrange
      const address = '0x2F5e3684cb1F318ec51b00Edba38d79Ac2c0aA9d';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0x2F5...A9d');
    });

    it('formats address with different length correctly', () => {
      // Arrange
      const address = '0x1234567890abcdef1234567890abcdef12345678';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0x123...678');
    });

    it('returns N/A for undefined input', () => {
      // Arrange & Act
      const result = formatAddress(undefined);

      // Assert
      expect(result).toBe('N/A');
    });

    it('returns N/A for null input', () => {
      // Arrange & Act
      const result = formatAddress(null as unknown as string);

      // Assert
      expect(result).toBe('N/A');
    });

    it('returns N/A for empty string', () => {
      // Arrange & Act
      const result = formatAddress('');

      // Assert
      expect(result).toBe('N/A');
    });

    it('returns N/A for string shorter than 6 characters', () => {
      // Arrange & Act
      const result = formatAddress('0x123');

      // Assert
      expect(result).toBe('N/A');
    });

    it('returns N/A for string exactly 5 characters', () => {
      // Arrange & Act
      const result = formatAddress('0x123');

      // Assert
      expect(result).toBe('N/A');
    });

    it('formats minimum valid address (6 characters)', () => {
      // Arrange
      const address = '0x1234';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0x123...234');
    });

    it('formats 7-character address correctly', () => {
      // Arrange
      const address = '0x12345';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0x123...345');
    });

    it('formats very long address correctly', () => {
      // Arrange
      const address =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0x123...def');
    });

    it('handles address with special characters', () => {
      // Arrange
      const address = '0xABCDEF1234567890abcdef1234567890abcdef12';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0xABC...f12');
    });

    it('handles address with mixed case', () => {
      // Arrange
      const address = '0xAbCdEf1234567890aBcDeF1234567890aBcDeF12';

      // Act
      const result = formatAddress(address);

      // Assert
      expect(result).toBe('0xAbC...F12');
    });

    it.each([
      ['0x1234', '0x123...234'],
      ['0x12345', '0x123...345'],
      ['0x123456', '0x123...456'],
      ['0x1234567', '0x123...567'],
      ['0x12345678', '0x123...678'],
      ['0x123456789', '0x123...789'],
      ['0x1234567890', '0x123...890'],
    ])('formats address %s as %s', (input, expected) => {
      // Act
      const result = formatAddress(input);

      // Assert
      expect(result).toBe(expected);
    });

    it.each([
      [undefined, 'N/A'],
      [null, 'N/A'],
      ['', 'N/A'],
      ['0x', 'N/A'],
      ['0x1', 'N/A'],
      ['0x12', 'N/A'],
      ['0x123', 'N/A'],
    ])('returns N/A for invalid input %s', (input, expected) => {
      // Act
      const result = formatAddress(input as unknown as string);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('estimateLineCount', () => {
    beforeEach(() => {
      mockDimensionsGet.mockReturnValue({
        width: 375,
        height: 667,
        scale: 2,
        fontScale: 1,
      });
    });

    it('returns 1 for undefined text', () => {
      const result = estimateLineCount(undefined);

      expect(result).toBe(1);
    });

    it('returns 1 for empty string', () => {
      const result = estimateLineCount('');

      expect(result).toBe(1);
    });

    it('returns 1 for short single-line text', () => {
      const text = 'Short title';

      const result = estimateLineCount(text);

      expect(result).toBe(1);
    });

    it('returns 1 for text that fits on single line', () => {
      // Available width: 375 - 144 = 231px
      // Chars per line: floor(231 / 8.5) = 27 chars
      const text = 'Will Bitcoin reach $100k?';

      const result = estimateLineCount(text);

      expect(result).toBe(1);
    });

    it('returns 2 for text that requires two lines', () => {
      // Text that needs wrapping - needs to exceed ~27 characters per line with word boundaries
      const text =
        'Will the cryptocurrency market continue to grow significantly next year?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('returns 3 for text that requires three lines', () => {
      const text =
        'Will the cryptocurrency decentralized blockchain market continue to grow significantly next year and reach unprecedented extraordinary heights with Bitcoin Ethereum?';

      const result = estimateLineCount(text);

      expect(result).toBe(3);
    });

    it('calculates line count based on screen width for iPhone 14 Pro Max', () => {
      mockDimensionsGet.mockReturnValue({
        width: 430,
        height: 932,
        scale: 3,
        fontScale: 1,
      });
      // Available width: 430 - 144 = 286px
      // Chars per line: floor(286 / 8.5) = 33 chars
      const text =
        'Will cryptocurrency blockchain decentralized markets continue to grow and expand globally with widespread mainstream adoption?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('calculates line count based on screen width for iPhone SE', () => {
      mockDimensionsGet.mockReturnValue({
        width: 375,
        height: 667,
        scale: 2,
        fontScale: 1,
      });
      // Available width: 375 - 144 = 231px
      // Chars per line: floor(231 / 8.5) = 27 chars
      const text =
        'Will cryptocurrency decentralized blockchain markets continue growing next year?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('handles text with single very long word', () => {
      const text =
        'Supercalifragilisticexpialidocious extraordinarily phenomenal unprecedented';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('handles text with multiple spaces between words', () => {
      const text =
        'Will  cryptocurrency  blockchain  decentralized  markets  continue  growing  next  year  indefinitely?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('handles text starting with space', () => {
      const text =
        ' Will cryptocurrency blockchain decentralized markets continue to grow significantly next year?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('handles text ending with space', () => {
      const text =
        'Will cryptocurrency blockchain decentralized markets continue to grow significantly next year? ';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('handles single character text', () => {
      const text = 'A';

      const result = estimateLineCount(text);

      expect(result).toBe(1);
    });

    it('handles text with special characters', () => {
      const text =
        'Will BTC/ETH reach $100k/€90k during the upcoming fiscal year consistently?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('handles text with numbers', () => {
      const text =
        '123456789 will this wrap to the next line with additional content about markets?';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it.each([
      ['', 1],
      ['A', 1],
      ['Short', 1],
      ['Will Bitcoin reach $100k?', 1],
      [
        'Will cryptocurrency blockchain decentralized markets continue to grow significantly next year?',
        2,
      ],
      [
        'Will the cryptocurrency decentralized blockchain market continue to grow significantly next year and reach unprecedented extraordinary heights?',
        3,
      ],
    ])('estimates line count for text "%s" as %d lines', (text, expected) => {
      const result = estimateLineCount(text);

      expect(result).toBe(expected);
    });

    it('handles text with exactly characters per line', () => {
      // Long text that wraps
      const text =
        'This text has exactly the right length to wrap to two complete lines with content';

      const result = estimateLineCount(text);

      expect(result).toBe(2);
    });

    it('correctly wraps words at boundary', () => {
      // Test word wrapping at exact boundary
      mockDimensionsGet.mockReturnValue({
        width: 375,
        height: 667,
        scale: 2,
        fontScale: 1,
      });
      const text =
        'This is a test to check word boundary wrapping behavior correctly and accurately';

      const result = estimateLineCount(text);

      expect(result).toBeGreaterThan(1);
    });
  });

  describe('formatVolume', () => {
    it('formats volume >= 1,000,000 with M suffix', () => {
      const result = formatVolume(1500000);

      expect(result).toBe('1.5M');
    });

    it('formats volume >= 1,000 with k suffix', () => {
      const result = formatVolume(2500);

      expect(result).toBe('2.5k');
    });

    it('formats volume < 1,000 as whole number', () => {
      const result = formatVolume(500);

      expect(result).toBe('500');
    });

    it('removes trailing zeros from millions', () => {
      const result = formatVolume(2000000);

      expect(result).toBe('2M');
    });

    it('removes trailing zeros from thousands', () => {
      const result = formatVolume(3000);

      expect(result).toBe('3k');
    });

    it('handles string input for millions', () => {
      const result = formatVolume('1500000');

      expect(result).toBe('1.5M');
    });

    it('handles string input for thousands', () => {
      const result = formatVolume('2500');

      expect(result).toBe('2.5k');
    });

    it('handles string input for small values', () => {
      const result = formatVolume('500');

      expect(result).toBe('500');
    });

    it('returns 0 for NaN input', () => {
      const result = formatVolume('not-a-number');

      expect(result).toBe('0');
    });

    it('returns 0 for invalid string', () => {
      const result = formatVolume('abc');

      expect(result).toBe('0');
    });

    it('returns 0 for empty string', () => {
      const result = formatVolume('');

      expect(result).toBe('0');
    });

    it('formats decimal millions correctly', () => {
      const result = formatVolume(1234567);

      expect(result).toBe('1.23M');
    });

    it('formats decimal thousands correctly', () => {
      const result = formatVolume(1234);

      expect(result).toBe('1.23k');
    });

    it('floors small values', () => {
      const result = formatVolume(999.99);

      expect(result).toBe('999');
    });

    it.each([
      [0, '0'],
      [1, '1'],
      [999, '999'],
      [1000, '1k'],
      [1500, '1.5k'],
      [999999, '1000k'],
      [1000000, '1M'],
      [5000000, '5M'],
      [5500000, '5.5M'],
    ])('formats volume %d as %s', (input, expected) => {
      expect(formatVolume(input)).toBe(expected);
    });
  });

  describe('getRecurrence', () => {
    it('returns NONE for undefined series', () => {
      const result = getRecurrence(undefined);

      expect(result).toBe(Recurrence.NONE);
    });

    it('returns NONE for empty series array', () => {
      const result = getRecurrence([]);

      expect(result).toBe(Recurrence.NONE);
    });

    it('returns NONE when first series has no recurrence', () => {
      const series: PredictSeries[] = [
        { recurrence: undefined as unknown as string },
      ];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.NONE);
    });

    it('returns DAILY for daily recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'daily' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.DAILY);
    });

    it('returns WEEKLY for weekly recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'weekly' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.WEEKLY);
    });

    it('returns MONTHLY for monthly recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'monthly' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.MONTHLY);
    });

    it('returns YEARLY for yearly recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'yearly' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.YEARLY);
    });

    it('returns YEARLY for annually recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'annually' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.YEARLY);
    });

    it('returns QUARTERLY for quarterly recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'quarterly' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.QUARTERLY);
    });

    it('returns NONE for unknown recurrence', () => {
      const series: PredictSeries[] = [{ recurrence: 'unknown' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.NONE);
    });

    it('handles uppercase recurrence values', () => {
      const series: PredictSeries[] = [{ recurrence: 'DAILY' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.DAILY);
    });

    it('handles mixed case recurrence values', () => {
      const series: PredictSeries[] = [{ recurrence: 'WeEkLy' }];

      const result = getRecurrence(series);

      expect(result).toBe(Recurrence.WEEKLY);
    });

    it.each([
      ['daily', Recurrence.DAILY],
      ['weekly', Recurrence.WEEKLY],
      ['monthly', Recurrence.MONTHLY],
      ['yearly', Recurrence.YEARLY],
      ['annually', Recurrence.YEARLY],
      ['quarterly', Recurrence.QUARTERLY],
      ['', Recurrence.NONE],
      ['invalid', Recurrence.NONE],
    ])('maps recurrence %s to %s', (recurrence, expected) => {
      const series: PredictSeries[] = [{ recurrence }];

      expect(getRecurrence(series)).toBe(expected);
    });
  });

  describe('formatCents', () => {
    it('formats dollars to whole cents without decimals', () => {
      const result = formatCents(0.5);

      expect(result).toBe('50¢');
    });

    it('formats dollars to cents with 1 decimal when needed', () => {
      const result = formatCents(0.456);

      expect(result).toBe('45.6¢');
    });

    it('formats dollars with 1 decimal precision', () => {
      const result = formatCents(0.12345);

      expect(result).toBe('12.3¢');
    });

    it('formats whole cents without decimals', () => {
      const result = formatCents(0.34);

      expect(result).toBe('34¢');
    });

    it('handles string input', () => {
      const result = formatCents('0.5');

      expect(result).toBe('50¢');
    });

    it('returns 0¢ for NaN input', () => {
      const result = formatCents('not-a-number');

      expect(result).toBe('0¢');
    });

    it('returns 0¢ for invalid string', () => {
      const result = formatCents('abc');

      expect(result).toBe('0¢');
    });

    it('returns 0¢ for empty string', () => {
      const result = formatCents('');

      expect(result).toBe('0¢');
    });

    it('formats zero as 0¢', () => {
      const result = formatCents(0);

      expect(result).toBe('0¢');
    });

    it('formats very small values with 1 decimal', () => {
      const result = formatCents(0.001);

      expect(result).toBe('0.1¢');
    });

    it('formats negative values correctly', () => {
      const result = formatCents(-0.5);

      expect(result).toBe('-50¢');
    });

    it('formats large dollar values correctly', () => {
      const result = formatCents(10.5);

      expect(result).toBe('1050¢');
    });

    it('formats 0.40123 as 40.1¢', () => {
      const result = formatCents(0.40123);

      expect(result).toBe('40.1¢');
    });

    it.each([
      [0.5, '50¢'],
      [0.25, '25¢'],
      [0.75, '75¢'],
      [0.456, '45.6¢'],
      [0.12345, '12.3¢'],
      [1, '100¢'],
      [0, '0¢'],
      [0.625, '62.5¢'],
      [0.7, '70¢'],
    ])('formats %d dollars as %s', (input, expected) => {
      expect(formatCents(input)).toBe(expected);
    });
  });

  describe('formatPositionSize', () => {
    it('formats small size with maximum decimals', () => {
      const result = formatPositionSize(0.5678);

      expect(result).toBe('0.5678');
    });

    it('formats large size with minimum decimals', () => {
      const result = formatPositionSize(123.456);

      expect(result).toBe('123.46');
    });

    it('formats whole numbers without decimals', () => {
      const result = formatPositionSize(10);

      expect(result).toBe('10');
    });

    it('handles string input with small value', () => {
      const result = formatPositionSize('0.5678');

      expect(result).toBe('0.5678');
    });

    it('handles string input with large value', () => {
      const result = formatPositionSize('123.456');

      expect(result).toBe('123.46');
    });

    it('returns 0 for NaN input', () => {
      const result = formatPositionSize('not-a-number');

      expect(result).toBe('0');
    });

    it('returns 0 for invalid string', () => {
      const result = formatPositionSize('abc');

      expect(result).toBe('0');
    });

    it('returns 0 for empty string', () => {
      const result = formatPositionSize('');

      expect(result).toBe('0');
    });

    it('formats with custom minimumDecimals', () => {
      const result = formatPositionSize(10.5555, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });

      expect(result).toBe('10.56');
    });

    it('formats with custom maximumDecimals', () => {
      const result = formatPositionSize(0.123456, {
        minimumDecimals: 2,
        maximumDecimals: 6,
      });

      expect(result).toBe('0.123456');
    });

    it('uses maximumDecimals for values < 1', () => {
      const result = formatPositionSize(0.1234, {
        minimumDecimals: 2,
        maximumDecimals: 3,
      });

      expect(result).toBe('0.123');
    });

    it('uses minimumDecimals for values >= 1', () => {
      const result = formatPositionSize(5.1234, {
        minimumDecimals: 2,
        maximumDecimals: 4,
      });

      expect(result).toBe('5.12');
    });

    it('handles negative values correctly', () => {
      const result = formatPositionSize(-10.5);

      expect(result).toBe('-10.50');
    });

    it('formats zero correctly', () => {
      const result = formatPositionSize(0);

      expect(result).toBe('0');
    });

    it('formats very small values with high precision', () => {
      const result = formatPositionSize(0.000123);

      expect(result).toBe('0.0001');
    });

    it.each([
      [0, '0'],
      [1, '1'],
      [10, '10'],
      [0.5, '0.5000'],
      [0.1234, '0.1234'],
      [123.45, '123.45'],
      [1000, '1000'],
    ])('formats size %d as %s', (input, expected) => {
      expect(formatPositionSize(input)).toBe(expected);
    });

    it('formats 7.5 shares with 2 decimals correctly', () => {
      const result = formatPositionSize(7.5, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });

      expect(result).toBe('7.50');
    });

    it('formats 10.5555 with 2 maximum decimals as 10.56', () => {
      const result = formatPositionSize(10.5555, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });

      expect(result).toBe('10.56');
    });

    it('returns whole number when rounded value equals floor', () => {
      const result = formatPositionSize(5.0, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      });

      expect(result).toBe('5');
    });
  });

  describe('calculateNetAmount', () => {
    it('calculates net amount by subtracting fees from total', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: '0.50',
        networkFeeFiat: '0.25',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('9.25');
    });

    it('calculates net amount with high precision decimal values', () => {
      const params = {
        totalFiat: '1.04361142938843253220839271649743403',
        bridgeFeeFiat: '0.036399',
        networkFeeFiat: '0.008024478270232503211154803918368',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0.9991879511181999');
    });

    it('returns "0" when total equals sum of fees', () => {
      const params = {
        totalFiat: '1.00',
        bridgeFeeFiat: '0.50',
        networkFeeFiat: '0.50',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('returns "0" when fees exceed total', () => {
      const params = {
        totalFiat: '1.00',
        bridgeFeeFiat: '0.75',
        networkFeeFiat: '0.50',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('returns "0" when totalFiat is undefined', () => {
      const params = {
        bridgeFeeFiat: '0.50',
        networkFeeFiat: '0.25',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('treats missing bridgeFeeFiat as zero', () => {
      const params = {
        totalFiat: '10.00',
        networkFeeFiat: '0.25',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('9.75');
    });

    it('treats missing networkFeeFiat as zero', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: '0.50',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('9.5');
    });

    it('returns full total when both fees are missing', () => {
      const params = {
        totalFiat: '10.00',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('10');
    });

    it('returns "0" when all parameters are undefined', () => {
      const params = {};

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('returns "0" when totalFiat is invalid string', () => {
      const params = {
        totalFiat: 'invalid',
        bridgeFeeFiat: '0.50',
        networkFeeFiat: '0.25',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('returns "0" when bridgeFeeFiat is invalid string', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: 'invalid',
        networkFeeFiat: '0.25',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('returns "0" when networkFeeFiat is invalid string', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: '0.50',
        networkFeeFiat: 'invalid',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0');
    });

    it('calculates correctly when fees are zero', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: '0',
        networkFeeFiat: '0',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('10');
    });

    it('calculates correctly when only bridge fee exists', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: '2.50',
        networkFeeFiat: '0',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('7.5');
    });

    it('calculates correctly when only network fee exists', () => {
      const params = {
        totalFiat: '10.00',
        bridgeFeeFiat: '0',
        networkFeeFiat: '3.25',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('6.75');
    });

    it('handles very small decimal amounts', () => {
      const params = {
        totalFiat: '0.001',
        bridgeFeeFiat: '0.0001',
        networkFeeFiat: '0.0002',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('0.0007');
    });

    it('handles large amounts correctly', () => {
      const params = {
        totalFiat: '1000000.00',
        bridgeFeeFiat: '50.00',
        networkFeeFiat: '25.00',
      };

      const result = calculateNetAmount(params);

      expect(result).toBe('999925');
    });
  });

  describe('formatPriceWithSubscriptNotation', () => {
    describe('Regular price formatting', () => {
      it('formats regular price with 2 decimals', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(1.99);

        // Assert
        expect(result).toBe('$1.99');
      });

      it('formats price with 4 decimals when needed', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.144566);

        // Assert
        expect(result).toBe('$0.1446');
      });

      it('formats large price correctly', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(1234.56);

        // Assert
        expect(result).toBe('$1,234.56');
      });

      it('formats whole number with 2 decimals', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(100);

        // Assert
        expect(result).toBe('$100.00');
      });

      it('formats price with minimum 2 decimals', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(5.5);

        // Assert
        expect(result).toBe('$5.50');
      });

      it('formats very large price correctly', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(1000000.99);

        // Assert
        expect(result).toBe('$1,000,000.99');
      });

      it('formats price between 0.0001 and 1', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.5678);

        // Assert
        expect(result).toBe('$0.5678');
      });
    });

    describe('Zero value', () => {
      it('returns dash for zero number', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0);

        // Assert
        expect(result).toBe('—');
      });

      it('returns dash for zero string', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('0');

        // Assert
        expect(result).toBe('—');
      });

      it('returns dash for 0.00', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('0.00');

        // Assert
        expect(result).toBe('—');
      });

      it('returns dash for 0.0000', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0);

        // Assert
        expect(result).toBe('—');
      });
    });

    describe('Very small values with subscript notation', () => {
      it('formats 0.00000614 with subscript notation (5 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00000614);

        // Assert
        expect(result).toBe('$0.0₅614');
      });

      it('formats 0.00001 with subscript notation (4 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00001);

        // Assert
        expect(result).toBe('$0.0₄1');
      });

      it('formats 0.000001 with subscript notation (5 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.000001);

        // Assert
        expect(result).toBe('$0.0₅1');
      });

      it('formats 0.0000001234 with subscript notation (6 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0000001234);

        // Assert
        expect(result).toBe('$0.0₆1234');
      });

      it('formats 0.00000999 with subscript notation (5 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00000999);

        // Assert
        expect(result).toBe('$0.0₅999');
      });

      it('formats 0.000000001 with subscript notation (8 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.000000001);

        // Assert
        expect(result).toBe('$0.0₈1');
      });

      it('formats 0.0000000123 with subscript notation (7 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0000000123);

        // Assert
        expect(result).toBe('$0.0₇123');
      });

      it('formats 0.00000005 with subscript notation (7 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00000005);

        // Assert
        expect(result).toBe('$0.0₇5');
      });

      it('formats 0.000000123456 with subscript notation showing 4 significant digits', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.000000123456);

        // Assert
        expect(result).toBe('$0.0₆1234');
      });
    });

    describe('Boundary values', () => {
      it('formats 0.0001 without subscript (at boundary)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0001);

        // Assert
        expect(result).toBe('$0.0001');
      });

      it('formats 0.00009 with subscript (4 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00009);

        // Assert
        expect(result).toBe('$0.0₄9');
      });

      it('formats 0.0000999 with subscript (4 leading zeros)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0000999);

        // Assert
        expect(result).toBe('$0.0₄999');
      });

      it('formats 0.00001 with subscript (4 leading zeros - at threshold)', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00001);

        // Assert
        expect(result).toBe('$0.0₄1');
      });

      it('formats 0.001 without subscript', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.001);

        // Assert
        expect(result).toBe('$0.001');
      });

      it('formats 0.01 without subscript', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.01);

        // Assert
        expect(result).toBe('$0.01');
      });

      it('formats 0.1 without subscript', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.1);

        // Assert
        expect(result).toBe('$0.10');
      });

      it('formats 1 with 2 decimals', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(1);

        // Assert
        expect(result).toBe('$1.00');
      });
    });

    describe('String input', () => {
      it('handles string input for regular price', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('1.99');

        // Assert
        expect(result).toBe('$1.99');
      });

      it('handles string input for very small value', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('0.00000614');

        // Assert
        expect(result).toBe('$0.0₅614');
      });

      it('handles string input with many decimals', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('0.144566');

        // Assert
        expect(result).toBe('$0.1446');
      });

      it('handles string input for large value', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('1234.56');

        // Assert
        expect(result).toBe('$1,234.56');
      });

      it('handles string input for whole number', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('100');

        // Assert
        expect(result).toBe('$100.00');
      });
    });

    describe('Invalid input', () => {
      it('returns $0.00 for NaN string', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('not-a-number');

        // Assert
        expect(result).toBe('$0.00');
      });

      it('returns $0.00 for invalid string', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('abc');

        // Assert
        expect(result).toBe('$0.00');
      });

      it('returns $0.00 for empty string', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation('');

        // Assert
        expect(result).toBe('$0.00');
      });

      it('returns $0.00 for NaN', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(NaN);

        // Assert
        expect(result).toBe('$0.00');
      });

      it('returns $0.00 for undefined converted to NaN', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(
          undefined as unknown as number,
        );

        // Assert
        expect(result).toBe('$0.00');
      });
    });

    describe('Edge cases with trailing zeros', () => {
      it('trims trailing zeros from significant digits', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00001);

        // Assert
        expect(result).toBe('$0.0₄1');
      });

      it('handles value with all trailing zeros after first digit', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00005);

        // Assert
        expect(result).toBe('$0.0₄5');
      });

      it('keeps at least 2 significant digits when all 4 are zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00001);

        // Assert
        expect(result).toBe('$0.0₄1');
      });

      it('handles value with 2 significant digits', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.000012);

        // Assert
        expect(result).toBe('$0.0₄12');
      });

      it('handles value with 3 significant digits', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0000123);

        // Assert
        expect(result).toBe('$0.0₄123');
      });

      it('handles value with 4 significant digits and no trailing zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00001234);

        // Assert
        expect(result).toBe('$0.0₄1234');
      });
    });

    describe('Subscript with different leading zero counts', () => {
      it('uses subscript 4 for 4 leading zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00001);

        // Assert
        expect(result).toBe('$0.0₄1');
      });

      it('uses subscript 5 for 5 leading zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.000001);

        // Assert
        expect(result).toBe('$0.0₅1');
      });

      it('uses subscript 6 for 6 leading zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.0000001);

        // Assert
        expect(result).toBe('$0.0₆1');
      });

      it('uses subscript 7 for 7 leading zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00000001);

        // Assert
        expect(result).toBe('$0.0₇1');
      });

      it('uses subscript 8 for 8 leading zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.000000001);

        // Assert
        expect(result).toBe('$0.0₈1');
      });

      it('uses subscript 10 for 10 leading zeros', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(0.00000000001);

        // Assert
        expect(result).toBe('$0.0₁₀1');
      });
    });

    describe('Negative values', () => {
      it('formats negative regular price', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(-1.99);

        // Assert
        expect(result).toBe('-$1.99');
      });

      it('formats negative large price', () => {
        // Arrange & Act
        const result = formatPriceWithSubscriptNotation(-1234.56);

        // Assert
        expect(result).toBe('-$1,234.56');
      });
    });

    it.each([
      [0, '—'],
      [0.01, '$0.01'],
      [0.1, '$0.10'],
      [1, '$1.00'],
      [1.99, '$1.99'],
      [5.5, '$5.50'],
      [10, '$10.00'],
      [100, '$100.00'],
      [1234.56, '$1,234.56'],
      [0.144566, '$0.1446'],
      [0.5678, '$0.5678'],
      [0.001, '$0.001'],
      [0.0001, '$0.0001'],
      [0.00001, '$0.0₄1'],
      [0.000001, '$0.0₅1'],
      [0.00000614, '$0.0₅614'],
      [0.0000001234, '$0.0₆1234'],
      [0.000000001, '$0.0₈1'],
      [-1.99, '-$1.99'],
      [-1234.56, '-$1,234.56'],
    ])('formats %f as %s', (input, expected) => {
      expect(formatPriceWithSubscriptNotation(input)).toBe(expected);
    });
  });
});
