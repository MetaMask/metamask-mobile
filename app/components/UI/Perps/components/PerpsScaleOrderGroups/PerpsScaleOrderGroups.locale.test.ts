import { strings, supportedTranslations } from '../../../../../../locales/i18n';

describe('Scale group provider label', () => {
  it.each(Object.keys(supportedTranslations))(
    'interpolates the market and provider through the real %s translator',
    (locale) => {
      const params = { locale, assetSymbol: 'SOL', providerName: 'Lighter' };

      const label = strings(
        'perps.pro_order_form.scale.groups.market_provider',
        params,
      );

      expect(label).toBe('SOL · Lighter');
    },
  );
});
