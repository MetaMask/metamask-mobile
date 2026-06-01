import { BigNumber } from 'bignumber.js';
import { formatWithThreshold } from '../../../../util/assets';
import { getLocaleLanguageCode } from '../../../hooks/useFormatters';
import { moneyFormatFiat } from './moneyFormatFiat';

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
});
