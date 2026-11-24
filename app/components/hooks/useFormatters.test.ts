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

  const makeLocale = (tag: string) => ({
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
    currencySymbol: null,
    languageCurrencyCode: null,
    languageCurrencySymbol: null,
    temperatureUnit: 'celsius' as const,
  });

  it('updates a mounted hook when the device region changes', () => {
    mockI18n.locale = 'en';
    mockGetLocales.mockReturnValue([makeLocale('en-US')]);
    const { result } = renderHook(() => useFormatters());

    mockGetLocales.mockReturnValue([makeLocale('en-DE')]);
    act(() => onAppStateChange?.('active'));

    expect(result.current.formatNumber(1234.5)).toBe('1.234,5');
  });
});
