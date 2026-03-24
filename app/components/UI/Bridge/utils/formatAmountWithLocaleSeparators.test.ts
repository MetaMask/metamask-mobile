import { formatAmountWithLocaleSeparators } from './formatAmountWithLocaleSeparators';
import { getIntlNumberFormatter } from '../../../../util/intl';

jest.mock('../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(),
}));

const mockGetIntlNumberFormatter =
  getIntlNumberFormatter as jest.MockedFunction<typeof getIntlNumberFormatter>;

const createMockFormatter = () =>
  ({
    format: (value: number | bigint) => {
      const parts = value.toString().split('.');
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts[1] !== undefined
        ? `${integerPart}.${parts[1]}`
        : integerPart;
    },
  }) as unknown as Intl.NumberFormat;

describe('formatAmountWithLocaleSeparators', () => {
  beforeEach(() => {
    mockGetIntlNumberFormatter.mockReturnValue(createMockFormatter());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('returns empty string as-is', () => {
      const result = formatAmountWithLocaleSeparators('');
      expect(result).toBe('');
    });

    it('returns zero as-is', () => {
      const result = formatAmountWithLocaleSeparators('0');
      expect(result).toBe('0');
    });

    it('formats whole numbers with thousands separator', () => {
      const result = formatAmountWithLocaleSeparators('1000');
      expect(result).toBe('1,000');
    });

    it('formats large numbers with multiple thousand separators', () => {
      const result = formatAmountWithLocaleSeparators('1234567');
      expect(result).toBe('1,234,567');
    });

    it('formats decimal numbers', () => {
      const result = formatAmountWithLocaleSeparators('1234.56');
      expect(result).toBe('1,234.56');
    });

    it('preserves single decimal place', () => {
      const result = formatAmountWithLocaleSeparators('100.5');
      expect(result).toBe('100.5');
    });

    it('preserves multiple decimal places', () => {
      const result = formatAmountWithLocaleSeparators('1000.123456');
      expect(result).toBe('1,000.123456');
    });

    it('formats small numbers without thousands separator', () => {
      const result = formatAmountWithLocaleSeparators('123');
      expect(result).toBe('123');
    });
  });

  describe('decimal preservation', () => {
    it('preserves zero decimal places for whole numbers', () => {
      const result = formatAmountWithLocaleSeparators('5000');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en', {
        useGrouping: true,
        maximumFractionDigits: 0,
      });
      expect(result).toBe('5,000');
    });

    it('preserves decimal digits exactly as typed', () => {
      const result = formatAmountWithLocaleSeparators('100.50');
      expect(result).toBe('100.50');
    });

    it('preserves six decimal places', () => {
      const result = formatAmountWithLocaleSeparators('1.123456');
      expect(result).toBe('1.123456');
    });

    it('preserves trailing zeros in decimals', () => {
      const result = formatAmountWithLocaleSeparators('10.00');
      expect(result).toBe('10.00');
    });
  });

  describe('edge cases', () => {
    it('handles invalid numeric strings', () => {
      const result = formatAmountWithLocaleSeparators('abc');
      expect(result).toBe('abc');
    });

    it('handles NaN', () => {
      const result = formatAmountWithLocaleSeparators('NaN');
      expect(result).toBe('NaN');
    });

    it('handles very small decimals', () => {
      const result = formatAmountWithLocaleSeparators('0.00001');
      expect(result).toBe('0.00001');
    });

    it('handles very large numbers', () => {
      const result = formatAmountWithLocaleSeparators('999999999999');
      expect(result).toBe('999,999,999,999');
    });

    it('handles decimal without leading zero', () => {
      const result = formatAmountWithLocaleSeparators('.5');
      expect(result).toBe('0.5');
    });

    it('preserves trailing decimal point', () => {
      const result = formatAmountWithLocaleSeparators('100.');
      expect(result).toBe('100.');
    });

    it('handles negative numbers', () => {
      const result = formatAmountWithLocaleSeparators('-1234.56');
      expect(result).toBe('-1,234.56');
    });

    it('preserves zero with decimal places', () => {
      const result = formatAmountWithLocaleSeparators('0.00');
      expect(result).toBe('0.00');
    });

    it('handles numbers with leading zeros', () => {
      const result = formatAmountWithLocaleSeparators('0001234');
      expect(result).toBe('1,234');
    });
  });

  describe('error handling', () => {
    it('returns original value when formatter throws error', () => {
      mockGetIntlNumberFormatter.mockReturnValue({
        format: () => {
          throw new Error('Formatting error');
        },
      } as unknown as Intl.NumberFormat);

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = formatAmountWithLocaleSeparators('1234.56');

      expect(result).toBe('1234.56');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Number formatting error:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles null getIntlNumberFormatter return', () => {
      mockGetIntlNumberFormatter.mockReturnValue(
        null as unknown as Intl.NumberFormat,
      );

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const result = formatAmountWithLocaleSeparators('1234.56');

      expect(result).toBe('1234.56');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Number formatting error:',
        expect.any(TypeError),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('locale usage', () => {
    it('uses I18n.locale for formatting', () => {
      formatAmountWithLocaleSeparators('1234.56');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        'en',
        expect.any(Object),
      );
    });

    it('calls integer formatter with grouping and zero fraction digits', () => {
      formatAmountWithLocaleSeparators('1000.123');

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en', {
        useGrouping: true,
        maximumFractionDigits: 0,
      });
    });

    it('enables grouping for all formatted values', () => {
      formatAmountWithLocaleSeparators('5000');

      const options = mockGetIntlNumberFormatter.mock.calls[0][1];
      expect(options?.useGrouping).toBe(true);
    });
  });

  describe('special number formats', () => {
    it('handles scientific notation input', () => {
      const result = formatAmountWithLocaleSeparators('1e3');
      expect(result).toBe('1,000');
    });

    it('handles numbers with plus sign', () => {
      const result = formatAmountWithLocaleSeparators('+1234');
      expect(result).toBe('1,234');
    });

    it('handles very precise decimals without rounding', () => {
      const result = formatAmountWithLocaleSeparators('0.123456789012345');
      expect(result).toBe('0.123456789012345');
    });

    it('handles 18-decimal precision without rounding', () => {
      const result = formatAmountWithLocaleSeparators('0.003979676960045669');
      expect(result).toBe('0.003979676960045669');
    });
  });

  describe('boundary conditions', () => {
    it('handles single digit', () => {
      const result = formatAmountWithLocaleSeparators('5');
      expect(result).toBe('5');
    });

    it('handles 999 (no separator needed)', () => {
      const result = formatAmountWithLocaleSeparators('999');
      expect(result).toBe('999');
    });

    it('handles 1000 (first separator)', () => {
      const result = formatAmountWithLocaleSeparators('1000');
      expect(result).toBe('1,000');
    });

    it('handles decimal point only', () => {
      const result = formatAmountWithLocaleSeparators('.');
      expect(result).toBe('.');
    });
  });
});
