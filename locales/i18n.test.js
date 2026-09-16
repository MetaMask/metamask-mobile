import { supportedTranslations, getLanguages } from './i18n';

describe('getLanguage', () => {
  it('returns the same locale keys as supportedTranslations', () => {
    const supportedTranslationsKeys = Object.keys(supportedTranslations);

    const getLanguagesKeys = Object.keys(getLanguages());

    expect(supportedTranslationsKeys.sort()).toEqual(getLanguagesKeys.sort());
  });

  it('defines transaction-aware gas-limit range copy for every locale', () => {
    const gasModalTranslations = Object.values(supportedTranslations).map(
      (translation) => translation.transactions.gas_modal,
    );

    gasModalTranslations.forEach((gasModal) => {
      expect(gasModal.gas_limit_too_high).toBeTruthy();
      expect(gasModal.gas_limit_too_low).toBeUndefined();
    });
  });
});
