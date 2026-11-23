jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en',
    translations: { de: {}, en: {}, es: {}, fr: {}, zh: {} },
  },
}));

import { act, renderHook } from '@testing-library/react-hooks';
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

  const makeLocale = (tag: string, currencySymbol: string | null = null) => ({
    languageTag: tag,
    languageCode: tag.split('-')[0],
    languageScriptCode: null,
    regionCode: tag.split('-')[1] || null,
    languageRegionCode: tag.split('-')[1] || null,
    textDirection: 'ltr' as const,
    digitGroupingSeparator: ',',
    decimalSeparator: '.',
    measurementSystem: 'metric' as const,
    currencyCode: null,
    currencySymbol,
    languageCurrencyCode: null,
    languageCurrencySymbol: currencySymbol,
    temperatureUnit: 'celsius' as const,
  });

  it('uses narrowSymbol when no region', () => {
    mockI18n.locale = 'fr';
    mockGetLocales.mockReturnValue([makeLocale('fr')]);

    const { result } = renderHook(() => useFormatters());
    const formatted = result.current.formatCurrency(100, 'USD');

    expect(formatted).toBe('100,00\u00A0$');
  });

  it('marks USD when the device region is an area code (es-419)', () => {
    mockI18n.locale = 'es';
    mockGetLocales.mockReturnValue([makeLocale('es-419')]);

    const { result } = renderHook(() => useFormatters());

    expect(result.current.formatCurrency(35.92, 'USD')).toBe('USD\u00A035.92');
  });

  it('updates a mounted hook when the device region changes', () => {
    mockI18n.locale = 'en';
    mockGetLocales.mockReturnValue([makeLocale('en-US')]);
    const { result } = renderHook(() => useFormatters());

    mockGetLocales.mockReturnValue([makeLocale('en-DE')]);
    act(() => onAppStateChange?.('active'));

    expect(result.current.formatNumber(1234.5)).toBe('1.234,5');
  });

  it('marks USD in a $ region even when the device symbol is CA$', () => {
    mockI18n.locale = 'en';
    mockGetLocales.mockReturnValue([makeLocale('de-CA', 'CA$')]);

    const { result } = renderHook(() => useFormatters());

    expect(result.current.formatCurrency(100, 'USD')).toBe('US$100.00');
  });

  it('does not mark USD in the US region', () => {
    mockI18n.locale = 'fr';
    mockGetLocales.mockReturnValue([makeLocale('fr-US', '$')]);

    const { result } = renderHook(() => useFormatters());

    expect(result.current.formatCurrency(100, 'USD')).toBe('100,00\u00A0$');
  });

  describe('currency formatting', () => {
    it.each([
      {
        description: 'device en-CA formats USD as US$100.00',
        deviceLocale: makeLocale('en-CA'),
        value: 100,
        currency: 'USD',
        fn: 'formatCurrency',
        expected: 'US$100.00',
      },
      {
        description: 'device en-CA formats CAD as $100.00',
        deviceLocale: makeLocale('en-CA'),
        value: 100,
        currency: 'CAD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-GB formats USD as $100.00',
        deviceLocale: makeLocale('en-GB'),
        value: 100,
        currency: 'USD',
        fn: 'formatCurrency',
        expected: '$100.00',
      },
      {
        description: 'device en-AU formats USD as USD 100.00',
        deviceLocale: makeLocale('en-AU'),
        value: 100,
        currency: 'USD',
        fn: 'formatCurrency',
        expected: 'USD\u00A0100.00',
      },
      {
        description: 'device en-CA formatCurrencyCompact no bare $',
        deviceLocale: makeLocale('en-CA'),
        value: 1500000,
        currency: 'USD',
        fn: 'formatCurrencyCompact',
        expected: 'US$1.50M',
      },
      {
        description: 'device en-GB formatCurrencyCompact allows $',
        deviceLocale: makeLocale('en-GB'),
        value: 1500000,
        currency: 'USD',
        fn: 'formatCurrencyCompact',
        expected: '$1.50m',
      },
    ])('$description', ({ deviceLocale, value, currency, fn, expected }) => {
      mockI18n.locale = 'en';
      mockGetLocales.mockReturnValue([deviceLocale]);

      const { result } = renderHook(() => useFormatters());
      const formatted = result.current[fn as keyof typeof result.current](
        value,
        currency,
      );

      expect(formatted).toBe(expected);
    });
  });
});
