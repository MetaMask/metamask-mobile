import {
  applyPercentToPrice,
  convertPriceRangeToUsd,
  formatExchangeRate,
  formatPriceRangeLabel,
  formatTokenPrice,
  isInvertedPriceRange,
  isValidPriceRange,
  matchingPricePercent,
  parsePriceInput,
  PRICE_RANGE_MISSING_VALUE,
  sanitizePriceInput,
  tokenPairRateFromFiatRates,
  USD_PRICE_RANGE_CURRENCY,
} from './priceRange';
import { formatCurrency } from './currencyUtils';

jest.mock('./currencyUtils', () => ({
  formatCurrency: jest.fn(
    (amount: number | string, currency: string) =>
      `${currency === 'USD' ? '$' : currency}${amount}`,
  ),
}));

const mockedFormatCurrency = formatCurrency as jest.MockedFunction<
  typeof formatCurrency
>;

describe('applyPercentToPrice', () => {
  it('writes 1800.00 for -10 percent of 2000', () => {
    const result = applyPercentToPrice(2000, -10);

    expect(result).toBe('1800.00');
  });

  it('writes 2200.00 for +10 percent of 2000', () => {
    const result = applyPercentToPrice(2000, 10);

    expect(result).toBe('2200.00');
  });

  it('does not compound off a previous field value', () => {
    const first = applyPercentToPrice(2000, -10);
    const second = applyPercentToPrice(2000, -5);

    expect(first).toBe('1800.00');
    expect(second).toBe('1900.00');
  });

  it('returns an empty string for a non-positive result', () => {
    const result = applyPercentToPrice(10, -100);

    expect(result).toBe('');
  });

  it('rounds chip prices to two decimal places', () => {
    const result = applyPercentToPrice(1.234, -1);

    expect(result).toBe('1.22');
  });
});

describe('convertPriceRangeToUsd', () => {
  it('converts both populated EUR bounds to USD without losing precision', () => {
    const result = convertPriceRangeToUsd(
      {
        tokenSide: 'dest',
        currency: 'EUR',
        min: '0.10',
        max: '1234.56',
      },
      1.087654321,
    );

    expect(result).toEqual({
      tokenSide: 'dest',
      currency: USD_PRICE_RANGE_CURRENCY,
      min: '0.1087654321',
      max: '1342.77451853376',
    });
  });

  it('keeps an empty one-sided bound absent', () => {
    const result = convertPriceRangeToUsd(
      {
        tokenSide: 'source',
        currency: 'EUR',
        min: '100',
        max: '',
      },
      1.08,
    );

    expect(result).toEqual({
      tokenSide: 'source',
      currency: USD_PRICE_RANGE_CURRENCY,
      min: '108',
      max: undefined,
    });
  });

  it('returns the same bounds for a USD range without a conversion rate', () => {
    const result = convertPriceRangeToUsd(
      {
        tokenSide: 'dest',
        currency: 'USD',
        min: '1800.25',
        max: '2200.75',
      },
      undefined,
    );

    expect(result).toEqual({
      tokenSide: 'dest',
      currency: USD_PRICE_RANGE_CURRENCY,
      min: '1800.25',
      max: '2200.75',
    });
  });

  it('returns undefined when a non-USD conversion rate is unavailable', () => {
    const result = convertPriceRangeToUsd(
      {
        tokenSide: 'dest',
        currency: 'EUR',
        min: '1800',
        max: '2200',
      },
      undefined,
    );

    expect(result).toBeUndefined();
  });
});

describe('parsePriceInput', () => {
  it('returns the number for a positive decimal string', () => {
    const result = parsePriceInput('1800.5');

    expect(result).toBe(1800.5);
  });

  it.each(['', '0', '-1', 'abc', '1.2.3'])(
    'returns undefined for %s',
    (value) => {
      const result = parsePriceInput(value);

      expect(result).toBeUndefined();
    },
  );
});

describe('sanitizePriceInput', () => {
  it('keeps digits and a single decimal separator', () => {
    const result = sanitizePriceInput('12.3.4a');

    expect(result).toBe('12.34');
  });

  it('strips letters and extra symbols', () => {
    const result = sanitizePriceInput('$1,200');

    expect(result).toBe('1200');
  });

  it('keeps at most two decimal digits', () => {
    const result = sanitizePriceInput('12.3456');

    expect(result).toBe('12.34');
  });

  it('keeps a trailing decimal while typing', () => {
    const result = sanitizePriceInput('12.');

    expect(result).toBe('12.');
  });
});

describe('isValidPriceRange', () => {
  it('returns true when min is less than max', () => {
    const result = isValidPriceRange('1800', '2200');

    expect(result).toBe(true);
  });

  it('returns false when min equals max', () => {
    const result = isValidPriceRange('2000', '2000');

    expect(result).toBe(false);
  });

  it('returns true when only min is set', () => {
    const result = isValidPriceRange('1800', '');

    expect(result).toBe(true);
  });

  it('returns true when only max is set', () => {
    const result = isValidPriceRange('', '2200');

    expect(result).toBe(true);
  });

  it('returns false when both bounds are empty', () => {
    const result = isValidPriceRange('', '');

    expect(result).toBe(false);
  });

  it('returns false when the populated bound is invalid', () => {
    const result = isValidPriceRange('.', '');

    expect(result).toBe(false);
  });
});

describe('isInvertedPriceRange', () => {
  it.each([
    ['2000', '1000'],
    ['2000', '2000'],
  ])('returns true when min %s is not less than max %s', (min, max) => {
    const result = isInvertedPriceRange(min, max);

    expect(result).toBe(true);
  });

  it.each([
    ['1800', '2200'],
    ['1800', ''],
    ['', '2200'],
    ['', ''],
    ['.', '1000'],
  ])('returns false for min %s and max %s', (min, max) => {
    const result = isInvertedPriceRange(min, max);

    expect(result).toBe(false);
  });
});

describe('matchingPricePercent', () => {
  it('returns the percent whose computed price matches the field', () => {
    const result = matchingPricePercent('1800.00', 2000, [-1, -10, -25]);

    expect(result).toBe(-10);
  });

  it('returns undefined when the field does not match a chip', () => {
    const result = matchingPricePercent('1850', 2000, [-1, -10, -25]);

    expect(result).toBeUndefined();
  });
});

describe('formatPriceRangeLabel', () => {
  it('joins formatted min and max with a dash', () => {
    mockedFormatCurrency.mockImplementation(
      (amount) => `$${String(amount)}.00`,
    );

    const result = formatPriceRangeLabel('1800', '2200', 'USD');

    expect(result).toBe('$1800.00 - $2200.00');
  });

  it('uses inequality symbols for a one-sided range', () => {
    mockedFormatCurrency.mockImplementation(
      (amount) => `$${String(amount)}.00`,
    );

    expect(formatPriceRangeLabel('1800', '', 'USD')).toBe('≥ $1800.00');
    expect(formatPriceRangeLabel('', '2200', 'USD')).toBe('≤ $2200.00');
  });
});

describe('formatTokenPrice', () => {
  it('returns 1 symbol equals formatted price', () => {
    mockedFormatCurrency.mockReturnValue('$2,000.00');

    const result = formatTokenPrice('ETH', 2000, 'USD');

    expect(result).toBe('1 ETH = $2,000.00');
  });

  it('returns a missing placeholder when price is undefined', () => {
    const result = formatTokenPrice('ETH', undefined, 'USD');

    expect(result).toBe(PRICE_RANGE_MISSING_VALUE);
  });
});

describe('tokenPairRateFromFiatRates', () => {
  it('returns dest per source from the two fiat rates', () => {
    const result = tokenPairRateFromFiatRates(2000, 1);

    expect(result).toBe(2000);
  });

  it('returns undefined when a rate is missing or not positive', () => {
    expect(tokenPairRateFromFiatRates(2000, undefined)).toBeUndefined();
    expect(tokenPairRateFromFiatRates(2000, 0)).toBeUndefined();
  });
});

describe('formatExchangeRate', () => {
  it('formats 1 source equals dest when source is selected', () => {
    const result = formatExchangeRate({
      selected: 'source',
      sourceSymbol: 'USDC',
      destSymbol: 'ETH',
      quoteRate: 0.0005,
    });

    expect(result).toBe('1 USDC = 0.00050 ETH');
  });

  it('inverts the quote rate when dest is selected', () => {
    const result = formatExchangeRate({
      selected: 'dest',
      sourceSymbol: 'USDC',
      destSymbol: 'ETH',
      quoteRate: 0.0005,
    });

    expect(result).toBe('1 ETH = 2,000.0 USDC');
  });

  it('returns a missing placeholder when quote rate is absent', () => {
    const result = formatExchangeRate({
      selected: 'dest',
      sourceSymbol: 'USDC',
      destSymbol: 'ETH',
    });

    expect(result).toBe(PRICE_RANGE_MISSING_VALUE);
  });
});
