jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en',
    translations: { de: {}, en: {}, es: {}, fr: {}, zh: {} },
  },
}));

jest.mock('expo-localization');

import { renderHook } from '@testing-library/react-hooks';
import { useFormatters } from './useFormatters';
import I18n from '../../../locales/i18n';
import { getLocales } from 'expo-localization';
import { AppState } from 'react-native';

const mockI18n = jest.mocked(I18n);
const mockGetLocales = jest.mocked(getLocales);

const onAppStateChange = jest
  .mocked(AppState.addEventListener)
  .mock.calls.find(([type]) => type === 'change')?.[1];

describe('useFormatters', () => {
  beforeEach(() => {
    expect(onAppStateChange).toBeDefined();
    jest.clearAllMocks();
    onAppStateChange?.('active');
  });

  const makeLocale = (
    tag: string,
    currencyCode: string | null,
    currencySymbol: string | null,
  ) => ({
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
    currencySymbol,
    languageCurrencyCode: currencyCode,
    languageCurrencySymbol: currencySymbol,
    temperatureUnit: 'celsius' as const,
  });

  it('uses narrowSymbol when no region', () => {
    mockI18n.locale = 'fr';
    mockGetLocales.mockReturnValue([makeLocale('fr', null, null)]);

    const { result } = renderHook(() => useFormatters());
    const formatted = result.current.formatCurrency(100, 'USD');

    expect(formatted).toBe('100,00\u00A0$');
  });

  describe('currency formatting', () => {
    it.each([
      {
        description: 'device en-CA (CAD $) formats USD as US$100.00',
        deviceLocale: makeLocale('en-CA', 'CAD', '$'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: 'US$100.00',
      },
      {
        description: 'device en-CA (CAD $) formats CAD as $100.00',
        deviceLocale: makeLocale('en-CA', 'CAD', '$'),
        currency: 'CAD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-GB (GBP £) formats USD as $100.00',
        deviceLocale: makeLocale('en-GB', 'GBP', '£'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-AU (AUD $) formats USD as USD 100.00',
        deviceLocale: makeLocale('en-AU', 'AUD', '$'),
        currency: 'USD',
        fn: 'formatCurrency',
        expected: 'USD\u00A0100.00',
      },
      {
        description: 'device en-CA (CAD $) formatCurrencyCompact no bare $',
        deviceLocale: makeLocale('en-CA', 'CAD', '$'),
        currency: 'USD',
        fn: 'formatCurrencyCompact',
        expected: 'US$100.00',
      },
      {
        description: 'device en-GB (GBP £) formatCurrencyCompact allows $',
        deviceLocale: makeLocale('en-GB', 'GBP', '£'),
        currency: 'USD',
        fn: 'formatCurrencyCompact',
        expected: '$100.00',
      },
    ])('$description', ({ deviceLocale, currency, fn, expected }) => {
      mockI18n.locale = 'en';
      mockGetLocales.mockReturnValue([deviceLocale]);

      const { result } = renderHook(() => useFormatters());
      const formatted = result.current[fn as keyof typeof result.current](
        100,
        currency,
      );

      expect(formatted).toBe(expected);
    });
  });
});
