import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { formatCurrency, formatMinimumReceived } from './currencyUtils';

jest.mock('../../../../../locales/i18n', () => ({
  locale: 'en-US',
}));

jest.mock('../../../../util/intl');

describe('formatCurrency', () => {
  const mockFormat = jest.fn();
  const mockGetIntlNumberFormatter =
    getIntlNumberFormatter as jest.MockedFunction<
      typeof getIntlNumberFormatter
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIntlNumberFormatter.mockReturnValue({
      format: mockFormat,
    } as unknown as Intl.NumberFormat);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('basic formatting', () => {
    it('formats numeric amount with USD currency', () => {
      mockFormat.mockReturnValue('$100.00');
      const amount = 100;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
      });
      expect(mockFormat).toHaveBeenCalledWith(100);
      expect(result).toBe('$100.00');
    });

    it('formats string amount with EUR currency', () => {
      mockFormat.mockReturnValue('€50.00');
      const amount = '50';
      const currency = 'EUR';

      const result = formatCurrency(amount, currency);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'EUR',
        currencyDisplay: 'symbol',
      });
      expect(mockFormat).toHaveBeenCalledWith(50);
      expect(result).toBe('€50.00');
    });

    it('formats decimal string amount', () => {
      mockFormat.mockReturnValue('$123.45');
      const amount = '123.45';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(123.45);
      expect(result).toBe('$123.45');
    });

    it('formats zero amount', () => {
      mockFormat.mockReturnValue('$0.00');
      const amount = 0;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(0);
      expect(result).toBe('$0.00');
    });

    it('formats negative amount', () => {
      mockFormat.mockReturnValue('-$25.00');
      const amount = -25;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(-25);
      expect(result).toBe('-$25.00');
    });

    it('formats very large amount', () => {
      mockFormat.mockReturnValue('$1,000,000.00');
      const amount = 1000000;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(1000000);
      expect(result).toBe('$1,000,000.00');
    });

    it('formats very small decimal amount', () => {
      mockFormat.mockReturnValue('$0.0001');
      const amount = 0.0001;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(0.0001);
      expect(result).toBe('$0.0001');
    });
  });

  describe('currency codes', () => {
    it('formats with GBP currency', () => {
      mockFormat.mockReturnValue('£75.00');
      const amount = 75;
      const currency = 'GBP';

      const result = formatCurrency(amount, currency);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'GBP',
        currencyDisplay: 'symbol',
      });
      expect(result).toBe('£75.00');
    });

    it('formats with JPY currency', () => {
      mockFormat.mockReturnValue('¥1000');
      const amount = 1000;
      const currency = 'JPY';

      const result = formatCurrency(amount, currency);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'JPY',
        currencyDisplay: 'symbol',
      });
      expect(result).toBe('¥1000');
    });

    it('uses USD as default when currency is empty string', () => {
      mockFormat.mockReturnValue('$100.00');
      const amount = 100;
      const currency = '';

      const result = formatCurrency(amount, currency);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
      });
      expect(result).toBe('$100.00');
    });
  });

  describe('custom options', () => {
    it('applies custom minimumFractionDigits option', () => {
      mockFormat.mockReturnValue('$100.0000');
      const amount = 100;
      const currency = 'USD';
      const options = { minimumFractionDigits: 4 };

      const result = formatCurrency(amount, currency, options);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 4,
      });
      expect(result).toBe('$100.0000');
    });

    it('applies custom maximumFractionDigits option', () => {
      mockFormat.mockReturnValue('$100.12');
      const amount = 100.123456;
      const currency = 'USD';
      const options = { maximumFractionDigits: 2 };

      const result = formatCurrency(amount, currency, options);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
        maximumFractionDigits: 2,
      });
      expect(result).toBe('$100.12');
    });

    it('applies custom currencyDisplay option', () => {
      mockFormat.mockReturnValue('100.00 US dollars');
      const amount = 100;
      const currency = 'USD';
      const options = { currencyDisplay: 'name' as const };

      const result = formatCurrency(amount, currency, options);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'name',
      });
      expect(result).toBe('100.00 US dollars');
    });

    it('merges multiple custom options with defaults', () => {
      mockFormat.mockReturnValue('$1,234.5678');
      const amount = 1234.56789;
      const currency = 'USD';
      const options = {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      };

      const result = formatCurrency(amount, currency, options);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
      expect(result).toBe('$1,234.5678');
    });
  });

  describe('edge cases', () => {
    it('formats string with leading zeros', () => {
      mockFormat.mockReturnValue('$100.00');
      const amount = '0100';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(100);
      expect(result).toBe('$100.00');
    });

    it('formats string with trailing zeros', () => {
      mockFormat.mockReturnValue('$100.50');
      const amount = '100.500';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(100.5);
      expect(result).toBe('$100.50');
    });

    it('formats string "0" as zero', () => {
      mockFormat.mockReturnValue('$0.00');
      const amount = '0';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(0);
      expect(result).toBe('$0.00');
    });

    it('formats empty string "0.0" as zero', () => {
      mockFormat.mockReturnValue('$0.00');
      const amount = '0.0';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(mockFormat).toHaveBeenCalledWith(0);
      expect(result).toBe('$0.00');
    });
  });

  describe('error handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('returns amount as string when formatter throws error', () => {
      mockFormat.mockImplementation(() => {
        throw new Error('Invalid currency code');
      });
      const amount = 100;
      const currency = 'INVALID';

      const result = formatCurrency(amount, currency);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error formatting currency:',
        expect.any(Error),
      );
      expect(result).toBe('100');
    });

    it('returns stringified number when parseFloat fails', () => {
      mockGetIntlNumberFormatter.mockImplementation(() => {
        throw new Error('Formatting error');
      });
      const amount = 'not-a-number';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBe('not-a-number');
    });

    it('handles invalid string amount gracefully', () => {
      mockFormat.mockImplementation((value) => {
        if (isNaN(value)) {
          throw new Error('Invalid number');
        }
        return '$0.00';
      });
      const amount = 'abc123';
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBe('abc123');
    });

    it('handles null amount by converting to string', () => {
      mockGetIntlNumberFormatter.mockImplementation(() => {
        throw new Error('Invalid input');
      });
      const amount = null as unknown as number;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBe('null');
    });

    it('handles undefined amount by converting to string', () => {
      mockGetIntlNumberFormatter.mockImplementation(() => {
        throw new Error('Invalid input');
      });
      const amount = undefined as unknown as number;
      const currency = 'USD';

      const result = formatCurrency(amount, currency);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBe('undefined');
    });

    it('logs error to console when formatting fails', () => {
      const mockError = new Error('Formatting failed');
      mockFormat.mockImplementation(() => {
        throw mockError;
      });
      const amount = 100;
      const currency = 'USD';

      formatCurrency(amount, currency);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error formatting currency:',
        mockError,
      );
    });
  });

  describe('locale handling', () => {
    it('uses I18n.locale for formatting', () => {
      mockFormat.mockReturnValue('$100.00');
      (I18n as { locale: string }).locale = 'fr-FR';
      const amount = 100;
      const currency = 'USD';

      formatCurrency(amount, currency);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('fr-FR', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
      });

      // Reset locale
      (I18n as { locale: string }).locale = 'en-US';
    });
  });
});

describe('formatMinimumReceived', () => {
  const mockFormat = jest.fn();
  const mockGetIntlNumberFormatter =
    getIntlNumberFormatter as jest.MockedFunction<
      typeof getIntlNumberFormatter
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIntlNumberFormatter.mockReturnValue({
      format: mockFormat,
    } as unknown as Intl.NumberFormat);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('floors values down instead of rounding up', () => {
    mockFormat.mockImplementation((val) => String(val));

    formatMinimumReceived(0.012579999);

    expect(mockFormat).toHaveBeenCalledWith(0.01257999);
  });

  it('parses string amounts', () => {
    mockFormat.mockImplementation((val) => String(val));

    formatMinimumReceived('1.2345');

    expect(mockFormat).toHaveBeenCalledWith(1.2345);
  });

  it('returns "0" for invalid input', () => {
    const result = formatMinimumReceived('not-a-number');

    expect(result).toBe('0');
  });

  it('uses locale from I18n', () => {
    mockFormat.mockImplementation((val) => String(val));
    (I18n as { locale: string }).locale = 'de-DE';

    formatMinimumReceived(1.234);

    expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith('de-DE', {
      maximumSignificantDigits: 8,
    });

    (I18n as { locale: string }).locale = 'en-US';
  });
});
