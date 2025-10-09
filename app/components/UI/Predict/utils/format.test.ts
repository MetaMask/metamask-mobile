import { formatPercentage, formatPrice, formatAddress } from './format';

// Mock the formatWithThreshold utility
jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(),
}));

import { formatWithThreshold } from '../../../../util/assets';

const mockFormatWithThreshold = formatWithThreshold as jest.MockedFunction<
  typeof formatWithThreshold
>;

describe('format utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatPercentage', () => {
    it('formats positive decimal percentage with 2 decimal places', () => {
      // Arrange & Act
      const result = formatPercentage(5.25);

      // Assert
      expect(result).toBe('+5.25%');
    });

    it('formats positive whole number percentage without decimals', () => {
      // Arrange & Act
      const result = formatPercentage(100);

      // Assert
      expect(result).toBe('+100%');
    });

    it('formats negative decimal percentage with 2 decimal places', () => {
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
      expect(result).toBe('+3.14%');
    });

    it('handles string input with whole number', () => {
      // Arrange & Act
      const result = formatPercentage('42');

      // Assert
      expect(result).toBe('+42%');
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
      expect(result).toBe('0.00%');
    });

    it('returns default value for invalid string', () => {
      // Arrange & Act
      const result = formatPercentage('abc');

      // Assert
      expect(result).toBe('0.00%');
    });

    it('returns default value for empty string', () => {
      // Arrange & Act
      const result = formatPercentage('');

      // Assert
      expect(result).toBe('0.00%');
    });

    it.each([
      [0.01, '+0.01%'],
      [0.001, '+0.00%'],
      [1.999, '+2.00%'],
      [99.999, '+100.00%'],
      [-0.01, '-0.01%'],
      [-0.001, '-0.00%'],
      [-1.999, '-2.00%'],
    ])('formats %f correctly as %s', (input, expected) => {
      expect(formatPercentage(input)).toBe(expected);
    });
  });

  describe('formatPrice', () => {
    beforeEach(() => {
      mockFormatWithThreshold.mockImplementation(
        (value, _threshold, locale, options) =>
          new Intl.NumberFormat(locale, options).format(Number(value)),
      );
    });

    describe('prices >= 1000', () => {
      it('formats prices >= 1000 with default 2 minimum decimals', () => {
        // Arrange & Act
        const result = formatPrice(1234.5678);

        // Assert
        expect(result).toBe('$1,234.57');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          1234.5678,
          1000,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );
      });

      it('formats prices >= 1000 with custom minimum decimals', () => {
        // Arrange & Act
        const result = formatPrice(50000, { minimumDecimals: 0 });

        // Assert
        expect(result).toBe('$50,000');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          50000,
          1000,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          },
        );
      });

      it('formats prices >= 1000 with 4 maximum decimals when minimum is higher', () => {
        // Arrange & Act
        const result = formatPrice(1234.5678, { minimumDecimals: 4 });

        // Assert
        expect(result).toBe('$1,234.5678');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          1234.5678,
          1000,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          },
        );
      });
    });

    describe('prices < 1000', () => {
      it('formats prices < 1000 with up to 4 decimal places', () => {
        // Arrange & Act
        const result = formatPrice(0.1234);

        // Assert
        expect(result).toBe('$0.1234');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          0.1234,
          0.0001,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          },
        );
      });

      it('formats prices < 1000 with custom minimum decimals', () => {
        // Arrange & Act
        const result = formatPrice(123.4567, { minimumDecimals: 0 });

        // Assert
        expect(result).toBe('$123.4567');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          123.4567,
          0.0001,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          },
        );
      });

      it('formats small prices with 4-decimal rounding', () => {
        // Arrange & Act
        const result = formatPrice(0.0001234);

        // Assert
        expect(result).toBe('$0.0001');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          0.0001234,
          0.0001,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          },
        );
      });
    });

    describe('string inputs', () => {
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
        expect(result).toBe('$0.1234');
      });
    });

    describe('NaN and invalid inputs', () => {
      it('returns default value for NaN with default decimals', () => {
        // Arrange & Act
        const result = formatPrice('not-a-number');

        // Assert
        expect(result).toBe('$0.00');
      });

      it('returns default value for NaN with minimumDecimals 0', () => {
        // Arrange & Act
        const result = formatPrice(NaN, { minimumDecimals: 0 });

        // Assert
        expect(result).toBe('$0');
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
    });

    describe('edge cases', () => {
      it('formats exactly 1000 correctly', () => {
        // Arrange & Act
        const result = formatPrice(1000);

        // Assert
        expect(result).toBe('$1,000.00');
        expect(mockFormatWithThreshold).toHaveBeenCalledWith(
          1000,
          1000,
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        );
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
        expect(result).toBe('$0.00');
      });

      it('formats very large numbers correctly', () => {
        // Arrange & Act
        const result = formatPrice(1000000);

        // Assert
        expect(result).toBe('$1,000,000.00');
      });
    });

    describe('boundary values', () => {
      it.each([
        [999.999, '$999.999'],
        [1000, '$1,000.00'],
        [1000.001, '$1,000.00'],
        [0.9999, '$0.9999'],
        [0.00009999, '$0.0001'],
      ])('formats boundary value %f as %s', (input, expected) => {
        const result = formatPrice(input);
        expect(result).toBe(expected);
      });
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
});
