jest.mock('../../locales/i18n', () => ({
  __esModule: true,
  default: {
    locale: 'en',
    translations: { de: {}, en: {}, es: {}, zh: {} },
  },
}));

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
  it('registers AppState change listener', () => {
    expect(onAppStateChange).toBeDefined();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    onAppStateChange?.('active');
  });

  function makeLocale(tag: string) {
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
  }

  it.each([
    {
      description: 'combines app language with device region',
      appLocale: 'en',
      deviceLocales: [makeLocale('de-DE')],
      expected: 'en-DE',
    },
    {
      description: 'combines matching app language with device region',
      appLocale: 'de',
      deviceLocales: [makeLocale('de-CH')],
      expected: 'de-CH',
    },
    {
      description: 'keeps en-US when app is en and region is US',
      appLocale: 'en',
      deviceLocales: [makeLocale('en-US')],
      expected: 'en-US',
    },
    {
      description: 'uses device region even when languageTag differs',
      appLocale: 'en',
      deviceLocales: [
        { ...makeLocale('en-US'), regionCode: 'DE', languageTag: 'en-US' },
      ],
      expected: 'en-DE',
    },
    {
      description:
        'adds Hans script for zh app with TW region (app Simplified, region Traditional)',
      appLocale: 'zh',
      deviceLocales: [makeLocale('zh-Hant-TW')],
      expected: 'zh-Hans-TW',
    },
    {
      description: 'uses zh-CN without script (app and region both Simplified)',
      appLocale: 'zh',
      deviceLocales: [makeLocale('zh-CN')],
      expected: 'zh-CN',
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
