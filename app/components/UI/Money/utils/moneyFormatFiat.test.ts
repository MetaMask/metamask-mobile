import { BigNumber } from 'bignumber.js';
import { formatWithThreshold } from '../../../../util/assets';
import { getLocaleLanguageCode } from '../../../hooks/useFormatters';
import { AssetType } from '../../../Views/confirmations/types/token';
import { MONEY_DEFAULT_FIAT_CURRENCY } from '../constants/fiat';
import {
  moneyFormatFiat,
  moneyFormatUsd,
  moneySafeTokenFiatCurrency,
} from './moneyFormatFiat';

jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: jest.fn(),
}));

jest.mock('../../../hooks/useFormatters', () => ({
  getLocaleLanguageCode: jest.fn(),
}));

describe('moneyFormatFiat', () => {
  const mockFormatWithThreshold = jest.mocked(formatWithThreshold);
  const mockGetLocaleLanguageCode = jest.mocked(getLocaleLanguageCode);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocaleLanguageCode.mockReturnValue('en');
    mockFormatWithThreshold.mockReturnValue('formatted');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates to formatWithThreshold with locale from getLocaleLanguageCode', () => {
    mockGetLocaleLanguageCode.mockReturnValue('fr');

    moneyFormatFiat(new BigNumber(42), 'usd');

    expect(mockFormatWithThreshold).toHaveBeenCalledWith(42, 0.01, 'fr', {
      style: 'currency',
      currency: 'usd',
    });
  });

  it('passes the numeric value from BigNumber.toNumber()', () => {
    moneyFormatFiat(new BigNumber('99.99'), 'eur');

    expect(mockFormatWithThreshold).toHaveBeenCalledWith(99.99, 0.01, 'en', {
      style: 'currency',
      currency: 'eur',
    });
  });

  it('uses the provided ISO currency code in format options', () => {
    moneyFormatFiat(new BigNumber(5), 'gbp');

    expect(mockFormatWithThreshold).toHaveBeenCalledWith(5, 0.01, 'en', {
      style: 'currency',
      currency: 'gbp',
    });
  });

  it('returns the string produced by formatWithThreshold', () => {
    mockFormatWithThreshold.mockReturnValue('£10.00');

    const result = moneyFormatFiat(new BigNumber(10), 'gbp');

    expect(result).toBe('£10.00');
  });

  describe('dust collapse — sub-cent values pass 0 to formatWithThreshold', () => {
    it('collapses 0.000001 to 0', () => {
      moneyFormatFiat(new BigNumber(0.000001), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });

    it('collapses 0.004 to 0', () => {
      moneyFormatFiat(new BigNumber(0.004), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });

    it('collapses 0.005 to 0', () => {
      moneyFormatFiat(new BigNumber(0.005), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });

    it('collapses 0.0099 to 0', () => {
      moneyFormatFiat(new BigNumber(0.0099), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });

    it('collapses negative sub-cent -0.001 to 0', () => {
      moneyFormatFiat(new BigNumber(-0.001), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });

    it('does not collapse exactly 0.01', () => {
      moneyFormatFiat(new BigNumber(0.01), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0.01, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });

    it('does not collapse values above one cent', () => {
      moneyFormatFiat(new BigNumber(0.05), 'usd');

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0.05, 0.01, 'en', {
        style: 'currency',
        currency: 'usd',
      });
    });
  });

  describe('moneyFormatUsd', () => {
    it('always formats as USD with en-US locale, ignoring the user locale', () => {
      mockGetLocaleLanguageCode.mockReturnValue('de');

      moneyFormatUsd(new BigNumber(1234.56));

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(
        1234.56,
        0.01,
        'en-US',
        {
          style: 'currency',
          currency: 'USD',
        },
      );
    });

    it('collapses sub-cent dust to 0', () => {
      moneyFormatUsd(new BigNumber(-0.004));

      expect(mockFormatWithThreshold).toHaveBeenCalledWith(0, 0.01, 'en-US', {
        style: 'currency',
        currency: 'USD',
      });
    });

    it('returns the string produced by formatWithThreshold', () => {
      mockFormatWithThreshold.mockReturnValue('$1,234.56');

      expect(moneyFormatUsd(new BigNumber(1234.56))).toBe('$1,234.56');
    });
  });

  describe('moneySafeTokenFiatCurrency', () => {
    const makeToken = (
      fiat?: Partial<NonNullable<AssetType['fiat']>>,
    ): Pick<AssetType, 'fiat'> => ({ fiat: fiat as AssetType['fiat'] });

    it('returns the token fiat currency when present', () => {
      const token = makeToken({ balance: 100, currency: 'eur' });

      const result = moneySafeTokenFiatCurrency(token);

      expect(result).toBe('eur');
    });

    it('falls back to the Money default when token.fiat is undefined', () => {
      const token = makeToken(undefined);

      const result = moneySafeTokenFiatCurrency(token);

      expect(result).toBe(MONEY_DEFAULT_FIAT_CURRENCY);
    });

    it('falls back to the Money default when token.fiat.currency is undefined', () => {
      const token = makeToken({ balance: 100 });

      const result = moneySafeTokenFiatCurrency(token);

      expect(result).toBe(MONEY_DEFAULT_FIAT_CURRENCY);
    });

    it('falls back to the Money default when token is undefined', () => {
      const result = moneySafeTokenFiatCurrency(undefined);

      expect(result).toBe(MONEY_DEFAULT_FIAT_CURRENCY);
    });

    it('falls back to the Money default when token is null', () => {
      const result = moneySafeTokenFiatCurrency(null);

      expect(result).toBe(MONEY_DEFAULT_FIAT_CURRENCY);
    });
  });
});
