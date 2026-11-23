import I18n from '../../../locales/i18n';
import { formatSubscriptionFiat } from './formatSubscriptionFiat';

describe('formatSubscriptionFiat', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('formats a USD amount with two fraction digits for en-US', () => {
    I18n.locale = 'en-US';

    const result = formatSubscriptionFiat(4.99, 'usd');

    expect(result).toBe('$4.99');
  });

  it('returns a plain fallback when Intl rejects the currency', () => {
    I18n.locale = 'en-US';

    const result = formatSubscriptionFiat(10, 'not-a-currency');

    expect(result).toBe('10 NOT-A-CURRENCY');
  });

  it.each([
    ['en-US', 8, 'usd', '$8.00'],
    ['en-US', 8, 'cad', '$8.00'],
    ['en-US', 1200, 'jpy', '¥1,200.00'],
    ['de-DE', 7.99, 'eur', '7,99\u00a0€'],
  ] as const)(
    'formats %s %s %s as %s',
    (locale, amount, currency, expected) => {
      I18n.locale = locale;

      const result = formatSubscriptionFiat(amount, currency);

      expect(result).toBe(expected);
    },
  );

  it('keeps the currency code for a four-letter code', () => {
    I18n.locale = 'en-US';

    const result = formatSubscriptionFiat(8, 'usdc');

    expect(result).toBe('8 USDC');
  });
});
