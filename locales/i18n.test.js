import { supportedTranslations, getLanguages, isLocaleRTL } from './i18n';

describe('getLanguage', () => {
  it('has the same keys() as supportedTranslations', () => {
    const supportedTranslationsKeys = Object.keys(supportedTranslations);
    const getLanguagesKeys = Object.keys(getLanguages());

    expect(supportedTranslationsKeys.sort()).toEqual(getLanguagesKeys.sort());
  });
});

describe('isLocaleRTL', () => {
  it('returns true for Arabic locale codes', () => {
    const locale = 'ar';

    const result = isLocaleRTL(locale);

    expect(result).toBe(true);
  });

  it('returns false for English locale codes', () => {
    const locale = 'en';

    const result = isLocaleRTL(locale);

    expect(result).toBe(false);
  });
});
