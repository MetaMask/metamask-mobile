import { renderHook } from '@testing-library/react-hooks';
import { useFormatters } from './useFormatters';
import I18n from '../../../locales/i18n';

jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
}));

const mockI18n = jest.mocked(I18n);

describe('useFormatters', () => {
  beforeEach(() => {
    mockI18n.locale = 'en';
  });

  describe('formatCurrency', () => {
    const enLocales = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ'];
    const tests = [
      { value: 100, currency: 'USD', expected: '$100.00' },
      { value: 0.5, currency: 'USD', expected: '$0.50' },
      { value: 1234.56, currency: 'USD', expected: '$1,234.56' },
    ];
    const localeTestCases = enLocales.flatMap((locale) =>
      tests.map((testCase) => ({ ...testCase, locale })),
    );

    it.each(localeTestCases)(
      'returns $ prefix for $value $currency, never US$ (using locale $locale)',
      ({ value, currency, expected, locale }) => {
        mockI18n.locale = locale;
        const { result } = renderHook(() => useFormatters());

        const formatted = result.current.formatCurrency(value, currency);

        expect(formatted).toBe(expected);
        expect(formatted).not.toContain('US$');
      },
    );
  });
});
