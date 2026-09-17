import { supportedTranslations, getLanguages } from './i18n';

describe('getLanguage', () => {
  it('returns the same locale keys as supportedTranslations', () => {
    const supportedTranslationsKeys = Object.keys(supportedTranslations);

    const getLanguagesKeys = Object.keys(getLanguages());

    expect(supportedTranslationsKeys.sort()).toEqual(getLanguagesKeys.sort());
  });

  it('defines the new gas-limit copy in the source locale', () => {
    const gasModal = supportedTranslations.en.transactions.gas_modal;

    expect(gasModal.gas_limit_below_minimum).toBe(
      'Gas limit must be at least 12000',
    );
    expect(gasModal.gas_limit_too_low).toBeUndefined();
  });

  it('leaves the new gas-limit copy to the translation pipeline', () => {
    const translatedGasModals = Object.entries(supportedTranslations)
      .filter(([locale]) => locale !== 'en')
      .map(([, translation]) => translation.transactions.gas_modal);

    translatedGasModals.forEach((gasModal) => {
      expect(gasModal.gas_limit_below_minimum).toBeUndefined();
      expect(gasModal.gas_limit_too_low).toBeUndefined();
    });
  });
});
