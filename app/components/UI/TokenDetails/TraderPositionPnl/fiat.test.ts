import I18n from '../../../../../locales/i18n';
import { convertUsdToFiat, formatFiat } from './fiat';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
}));

const mockI18n = jest.mocked(I18n);

describe('convertUsdToFiat', () => {
  it('keeps USD when the rate is missing', () => {
    const result = convertUsdToFiat(100, {
      currency: 'EUR',
      rate: undefined,
    });

    expect(result).toEqual({ value: 100, currency: 'USD' });
  });

  it('keeps USD when the rate is zero', () => {
    const result = convertUsdToFiat(100, 0, 'EUR');

    expect(result).toEqual({ value: 100, currency: 'USD' });
  });

  it('returns the unchanged amount for a USD rate of one', () => {
    const result = convertUsdToFiat(100, 1, 'USD');

    expect(result).toEqual({ value: 100, currency: 'USD' });
  });

  it('converts USD using the selected currency rate', () => {
    const result = convertUsdToFiat(100, { currency: 'eur', rate: 0.9 });

    expect(result).toEqual({ value: 90, currency: 'EUR' });
  });
});

describe('formatFiat', () => {
  it('formats JPY without fractional digits', () => {
    const result = formatFiat(1234.56, 'JPY');

    expect(result).toBe('+¥1,235');
  });

  it('formats negative PnL with a minus sign', () => {
    const result = formatFiat(-12.34, 'USD');

    expect(result).toBe('-$12.34');
  });

  it('renders $ for USD on en-GB devices, never US$', () => {
    const actualNumberFormat = Intl.NumberFormat;
    const spy = jest
      .spyOn(Intl, 'NumberFormat')
      .mockImplementation((locale, options) => {
        delete options?.currencyDisplay;
        return actualNumberFormat(locale, options);
      });

    mockI18n.locale = 'en-GB';
    try {
      const result = formatFiat(0.56, 'USD');
      expect(result).toBe('+$0.56');
      expect(result).not.toContain('US$');
    } finally {
      mockI18n.locale = 'en';
      spy.mockRestore();
    }
  });
});
