import { supportedTranslations, getLanguages } from './i18n';

describe('getLanguage', () => {
  it('should have the same keys() as supportedTranslations', () => {
    const supportedTranslationsKeys = Object.keys(supportedTranslations);
    const getLanguagesKeys = Object.keys(getLanguages());
    expect(supportedTranslationsKeys.sort()).toEqual(getLanguagesKeys.sort());
  });
});
