import { getSwapsLimitOrderSecondaryValue } from './getSwapsLimitOrderSecondaryValue';
import { getIntlNumberFormatter } from '../../../../../util/intl';

jest.mock('../../../../../util/intl', () => ({
  getIntlNumberFormatter: jest.fn(),
}));

const mockGetIntlNumberFormatter =
  getIntlNumberFormatter as jest.MockedFunction<typeof getIntlNumberFormatter>;

const createGroupingFormatter = () =>
  ({
    format: (value: number | bigint) => {
      const str = value.toString();
      const parts = str.split('.');
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts[1] !== undefined
        ? `${integerPart}.${parts[1]}`
        : integerPart;
    },
  }) as unknown as Intl.NumberFormat;

const createCurrencyFormatter = () =>
  ({
    format: (value: number) => `$${value}`,
  }) as unknown as Intl.NumberFormat;

const fiatModeDefaults = {
  counterFiatRate: 2000,
  counterTokenSymbol: 'ETH',
  currentCurrency: 'USD',
  isLimitFiatMode: true,
  limitPrice: '50',
  marketFiat: 50,
};

const tokenModeDefaults = {
  counterFiatRate: 2000,
  counterTokenSymbol: 'ETH',
  currentCurrency: 'USD',
  isLimitFiatMode: false,
  limitPrice: '0.025',
  marketFiat: 50,
};

// A quoted token worth a fraction of a cent, like PEPE.
const CHEAP_MARKET_FIAT = 0.0000039998;

describe('getSwapsLimitOrderSecondaryValue', () => {
  beforeEach(() => {
    mockGetIntlNumberFormatter.mockImplementation((_locale, options) => {
      if (options?.style === 'currency') {
        return createCurrencyFormatter();
      }

      return createGroupingFormatter();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when counter token symbol is missing', () => {
    const result = getSwapsLimitOrderSecondaryValue({
      ...fiatModeDefaults,
      counterTokenSymbol: undefined,
    });

    expect(result).toBeUndefined();
  });

  describe('fiat limit price mode', () => {
    it('returns formatted token amount with symbol when fiat converts to a positive token amount', () => {
      const result = getSwapsLimitOrderSecondaryValue(fiatModeDefaults);

      expect(result).toBe('0.025 ETH');
    });

    it('applies locale grouping to large converted token amounts', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...fiatModeDefaults,
        limitPrice: '50000000',
      });

      expect(result).toBe('25,000 ETH');
    });

    it('returns zero token amount when fiat converts to zero', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...fiatModeDefaults,
        limitPrice: '0',
      });

      expect(result).toBe('0 ETH');
    });

    it('returns zero token amount when conversion inputs are unavailable', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...fiatModeDefaults,
        counterFiatRate: undefined,
      });

      expect(result).toBe('0 ETH');
    });

    it('keeps five decimal places for a regular token amount', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...fiatModeDefaults,
        limitPrice: '112.2468',
      });

      expect(result).toBe('0.05612 ETH');
    });

    it('keeps a cheap token amount instead of rounding it to zero', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...fiatModeDefaults,
        counterFiatRate: 4000,
        limitPrice: '0.0000038',
        marketFiat: CHEAP_MARKET_FIAT,
      });

      expect(result).toBe('0.00000000095 ETH');
    });
  });

  describe('token limit price mode', () => {
    it('returns formatted fiat when token amount converts to positive fiat', () => {
      const result = getSwapsLimitOrderSecondaryValue(tokenModeDefaults);

      expect(result).toBe('$50');
    });

    it('formats fiat with exactly two decimal places', () => {
      getSwapsLimitOrderSecondaryValue(tokenModeDefaults);

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style: 'currency',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    });

    it('returns zero fiat without decimals when token converts to zero fiat', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...tokenModeDefaults,
        limitPrice: '0',
      });

      expect(result).toBe('$0');
      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      );
    });

    it('defaults missing current currency to usd when formatting fiat', () => {
      getSwapsLimitOrderSecondaryValue({
        ...tokenModeDefaults,
        currentCurrency: undefined,
        limitPrice: '0',
      });

      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style: 'currency',
          currency: 'usd',
        }),
      );
    });

    it('returns zero fiat when token fiat rate is unavailable', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...tokenModeDefaults,
        counterFiatRate: undefined,
      });

      expect(result).toBe('$0');
    });

    it('keeps a sub-cent fiat price of a cheap token instead of rounding it to zero', () => {
      const result = getSwapsLimitOrderSecondaryValue({
        ...tokenModeDefaults,
        counterFiatRate: 0.9998,
        counterTokenSymbol: 'mUSD',
        limitPrice: '0.0000038',
        marketFiat: CHEAP_MARKET_FIAT,
      });

      expect(result).toBe('$0.000003799');
      expect(mockGetIntlNumberFormatter).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style: 'currency',
          minimumFractionDigits: 2,
          maximumFractionDigits: 9,
        }),
      );
    });
  });
});
