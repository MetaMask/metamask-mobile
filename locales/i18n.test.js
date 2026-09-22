import { supportedTranslations, getLanguages } from './i18n';

describe('getLanguage', () => {
  it('returns the same locale keys as supportedTranslations', () => {
    const supportedTranslationsKeys = Object.keys(supportedTranslations);

    const getLanguagesKeys = Object.keys(getLanguages());

    expect(supportedTranslationsKeys.sort()).toEqual(getLanguagesKeys.sort());
  });

  it('defines the new gas-limit copy in the source locale', () => {
    const { alert_system: alertSystem, transactions } =
      supportedTranslations.en;
    const gasModal = transactions.gas_modal;

    expect(alertSystem.gas_limit_below_minimum).toEqual({
      title: 'Low gas limit',
      message:
        "To continue with this transaction, you'll need to increase the gas limit to 12000 or higher.",
    });
    expect(gasModal.gas_limit_below_minimum).toBe(
      'Gas limit must be at least 12000',
    );
    expect(gasModal.gas_limit_too_low).toBeUndefined();
  });

  it('leaves the new gas-limit copy to the translation pipeline', () => {
    const translatedLocales = Object.entries(supportedTranslations).filter(
      ([locale]) => locale !== 'en',
    );

    translatedLocales.forEach(([, translation]) => {
      expect(
        translation.alert_system.gas_limit_below_minimum,
      ).toBeUndefined();
      expect(
        translation.transactions.gas_modal.gas_limit_below_minimum,
      ).toBeUndefined();
      expect(
        translation.transactions.gas_modal.gas_limit_too_low,
      ).toBeUndefined();
    });
  });
});
