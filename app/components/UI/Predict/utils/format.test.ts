import { formatPercentage, formatPrice } from './format';

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
    it('should format positive decimal percentage with 2 decimal places', () => {
      // Arrange & Act
      const result = formatPercentage(5.25);

      // Assert
      expect(result).toBe('+5.25%');
    });

    it('should format positive whole number percentage without decimals', () => {
      // Arrange & Act
      const result = formatPercentage(100);

      // Assert
      expect(result).toBe('+100%');
    });

    it('should format negative decimal percentage with 2 decimal places', () => {
      // Arrange & Act
      const result = formatPercentage(-2.75);

      // Assert
      expect(result).toBe('-2.75%');
    });

    it('should format negative whole number percentage without decimals', () => {
      // Arrange & Act
      const result = formatPercentage(-50);

      // Assert
      expect(result).toBe('-50%');
    });

    it('should format zero as 0%', () => {
      // Arrange & Act
      const result = formatPercentage(0);

      // Assert
      expect(result).toBe('0%');
    });

    it('should handle string input with decimal value', () => {
      // Arrange & Act
      const result = formatPercentage('3.14159');

      // Assert
      expect(result).toBe('+3.14%');
    });

    it('should handle string input with whole number', () => {
      // Arrange & Act
      const result = formatPercentage('42');

      // Assert
      expect(result).toBe('+42%');
    });

    it('should handle string input with negative value', () => {
      // Arrange & Act
      const result = formatPercentage('-7.89');

      // Assert
      expect(result).toBe('-7.89%');
    });

    it('should return default value for NaN input', () => {
      // Arrange & Act
      const result = formatPercentage('not-a-number');

      // Assert
      expect(result).toBe('0.00%');
    });

    it('should return default value for invalid string', () => {
      // Arrange & Act
      const result = formatPercentage('abc');

      // Assert
      expect(result).toBe('0.00%');
    });

    it('should return default value for empty string', () => {
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
    ])('should format %f correctly as %s', (input, expected) => {
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
      it('should format prices >= 1000 with default 2 minimum decimals', () => {
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

      it('should format prices >= 1000 with custom minimum decimals', () => {
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

      it('should format prices >= 1000 with 4 maximum decimals when minimum is higher', () => {
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
      it('should format prices < 1000 with up to 4 decimal places', () => {
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

      it('should format prices < 1000 with custom minimum decimals', () => {
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

      it('should format small prices with 4-decimal rounding', () => {
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
      it('should handle string input with decimal value', () => {
        // Arrange & Act
        const result = formatPrice('1234.5678');

        // Assert
        expect(result).toBe('$1,234.57');
      });

      it('should handle string input with small value', () => {
        // Arrange & Act
        const result = formatPrice('0.1234');

        // Assert
        expect(result).toBe('$0.1234');
      });
    });

    describe('NaN and invalid inputs', () => {
      it('should return default value for NaN with default decimals', () => {
        // Arrange & Act
        const result = formatPrice('not-a-number');

        // Assert
        expect(result).toBe('$0.00');
      });

      it('should return default value for NaN with minimumDecimals 0', () => {
        // Arrange & Act
        const result = formatPrice(NaN, { minimumDecimals: 0 });

        // Assert
        expect(result).toBe('$0');
      });

      it('should return default value for invalid string', () => {
        // Arrange & Act
        const result = formatPrice('abc');

        // Assert
        expect(result).toBe('$0.00');
      });

      it('should return default value for empty string', () => {
        // Arrange & Act
        const result = formatPrice('');

        // Assert
        expect(result).toBe('$0.00');
      });
    });

    describe('edge cases', () => {
      it('should format exactly 1000 correctly', () => {
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

      it('should format negative prices correctly', () => {
        // Arrange & Act
        const result = formatPrice(-1234.56);

        // Assert
        expect(result).toBe('-$1,234.56');
      });

      it('should format zero correctly', () => {
        // Arrange & Act
        const result = formatPrice(0);

        // Assert
        expect(result).toBe('$0.00');
      });

      it('should format very large numbers correctly', () => {
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
      ])('should format boundary value %f as %s', (input, expected) => {
        const result = formatPrice(input);
        expect(result).toBe(expected);
      });
    });
  });
});
