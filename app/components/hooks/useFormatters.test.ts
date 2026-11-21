import { renderHook } from '@testing-library/react-hooks';
import { useFormatters } from './useFormatters';

jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en', translations: { de: {}, en: {}, es: {}, zh: {} } },
}));

jest.mock('expo-localization');

const makeLocale = (tag: string, currencyCode: string | null) => ({
  languageTag: tag,
  languageCode: tag.split('-')[0],
  languageScriptCode: null,
  regionCode: tag.split('-')[1] || null,
  languageRegionCode: tag.split('-')[1] || null,
  textDirection: 'ltr' as const,
  digitGroupingSeparator: ',',
  decimalSeparator: '.',
  measurementSystem: 'metric' as const,
  currencyCode,
  currencySymbol: '$',
  languageCurrencyCode: currencyCode,
  languageCurrencySymbol: '$',
  temperatureUnit: 'celsius' as const,
});

describe('useFormatters', () => {
  describe('currency formatting', () => {
    it.each([
      {
        description: 'device en-CA (CAD) formats USD as US$100.00',
        deviceLocale: makeLocale('en-CA', 'CAD'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: 'US$100.00',
      },
      {
        description: 'device en-CA (CAD) formats CAD as $100.00',
        deviceLocale: makeLocale('en-CA', 'CAD'),
        currency: 'CAD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-GB (GBP) formats USD as $100.00',
        deviceLocale: makeLocale('en-GB', 'GBP'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-DE (EUR) formats USD as $100.00',
        deviceLocale: makeLocale('en-DE', 'EUR'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-AU (AUD) formats USD as USD 100.00',
        deviceLocale: makeLocale('en-AU', 'AUD'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: 'USD\u00A0100.00',
      },
      {
        description:
          'device en-CA (CAD) formatCurrencyCompact follows same rule (no bare $)',
        deviceLocale: makeLocale('en-CA', 'CAD'),
        currency: 'USD',
        fn: 'formatCurrencyCompact',
        expected: 'US$100.00',
      },
      {
        description:
          'device en-GB (GBP) formatCurrencyCompact allows $ for USD',
        deviceLocale: makeLocale('en-GB', 'GBP'),
        currency: 'USD',
        fn: 'formatCurrencyCompact',
        expected: '$100.00',
      },
    ])('$description', ({ deviceLocale, currency, fn, expected }) => {
      jest.resetModules();
      const I18n = require('../../../locales/i18n').default;
      const { getLocales } = require('expo-localization');
      const { useFormatters } = require('./useFormatters');

      I18n.locale = 'en';
      getLocales.mockReturnValue([deviceLocale]);

      const { result } = renderHook(() => useFormatters());
      const formatted = result.current[fn](100, currency);

      expect(formatted).toBe(expected);
    });
  });
});
