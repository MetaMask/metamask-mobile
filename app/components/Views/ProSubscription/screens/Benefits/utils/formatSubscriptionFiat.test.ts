import I18n from '../../../../../../../locales/i18n';
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

  it('uppercases the currency code before formatting', () => {
    I18n.locale = 'en-US';

    const result = formatSubscriptionFiat(49.99, 'usd');

    expect(result).toBe('$49.99');
  });

  it('returns a plain fallback when Intl rejects the currency', () => {
    I18n.locale = 'en-US';

    const result = formatSubscriptionFiat(10, 'not-a-currency');

    expect(result).toBe('10 NOT-A-CURRENCY');
  });
});
