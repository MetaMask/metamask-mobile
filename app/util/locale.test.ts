jest.mock('../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en',
    translations: { de: {}, en: {}, es: {}, zh: {} },
  },
}));

jest.mock('expo-localization');

import I18n from '../../locales/i18n';
import { getLocales, type Locale } from 'expo-localization';
import { AppState } from 'react-native';
import { getFormattingLocale } from './locale';

const mockI18n = jest.mocked(I18n);
const mockGetLocales = jest.mocked(getLocales);

const onAppStateChange = jest
  .mocked(AppState.addEventListener)
  .mock.calls.find(([type]) => type === 'change')?.[1];

describe('getFormattingLocale', () => {
  beforeEach(() => {
    expect(onAppStateChange).toBeDefined();
    jest.clearAllMocks();
    onAppStateChange?.('active');
  });

  const makeLocale = (tag: string) => {
    const parts = tag.split('-');
    const lang = parts[0];
    const script = parts.length > 1 && parts[1].length === 4 ? parts[1] : null;
    const region =
      parts.length > 1 && parts[parts.length - 1].length === 2
        ? parts[parts.length - 1]
        : null;

    return {
      languageTag: tag,
      languageCode: lang,
      languageScriptCode: script,
      regionCode: region,
      languageRegionCode: region,
      textDirection: 'ltr' as const,
      digitGroupingSeparator: ',',
      decimalSeparator: '.',
      measurementSystem: 'metric' as const,
      currencyCode: null,
      currencySymbol: null,
      languageCurrencyCode: null,
      languageCurrencySymbol: null,
      temperatureUnit: 'celsius' as const,
    };
  };

  it.each([
    {
      description: 'combines app language with device region',
      appLocale: 'en',
      deviceLocales: [makeLocale('de-DE')],
      expected: 'en-DE',
    },
    {
      description: 'uses device locale when languages match',
      appLocale: 'de',
      deviceLocales: [makeLocale('de-CH')],
      expected: 'de-CH',
    },
    {
      description: 'uses device locale for exact match',
      appLocale: 'en',
      deviceLocales: [makeLocale('en-US')],
      expected: 'en-US',
    },
    {
      description: 'keeps script when device matches app language',
      appLocale: 'zh',
      deviceLocales: [makeLocale('zh-Hant-TW')],
      expected: 'zh-Hant-TW',
    },
    {
      description: 'falls back to en for unsupported app language',
      appLocale: 'is-IS',
      deviceLocales: [makeLocale('is-IS')],
      expected: 'en-IS',
    },
    {
      description: 'returns app language when no region',
      appLocale: 'en',
      deviceLocales: [{ ...makeLocale('en'), regionCode: null }],
      expected: 'en',
    },
    {
      description: 'uses second locale region when first has none',
      appLocale: 'en',
      deviceLocales: [
        { ...makeLocale('en'), regionCode: null },
        makeLocale('de-DE'),
      ],
      expected: 'en-DE',
    },
  ])('$description', ({ appLocale, deviceLocales, expected }) => {
    mockI18n.locale = appLocale;
    mockGetLocales.mockReturnValue(deviceLocales as [Locale, ...Locale[]]);

    expect(getFormattingLocale()).toBe(expected);
  });
});
