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

  it('falls back to the English consent sentence when paragraph1b is untranslated', () => {
    const english =
      supportedTranslations.en.experience_enhancer_modal.paragraph1b;

    expect(english.startsWith('We')).toBe(true);

    Object.entries(supportedTranslations).forEach(([locale, messages]) => {
      if (locale === 'en') {
        return;
      }

      expect(messages.experience_enhancer_modal.paragraph1b).toBeUndefined();
    });
  });
});
