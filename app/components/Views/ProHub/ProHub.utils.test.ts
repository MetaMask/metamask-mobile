import I18n from '../../../../locales/i18n';
import { formatSubscriptionPeriodEnd } from './ProHub.utils';

describe('formatSubscriptionPeriodEnd', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it.each([
    ['2027-07-20T12:00:00.000Z', 'Jul 20, 2027'],
    ['2026-09-15T12:00:00.000Z', 'Sep 15, 2026'],
    ['2026-10-04T12:00:00.000Z', 'Oct 4, 2026'],
  ])('formats %s as %s in English', (timestamp, expected) => {
    I18n.locale = 'en';

    expect(formatSubscriptionPeriodEnd(timestamp)).toBe(expected);
  });

  it('formats in the app language rather than English only', () => {
    I18n.locale = 'es';

    expect(formatSubscriptionPeriodEnd('2027-07-20T12:00:00.000Z')).toBe(
      '20 jul 2027',
    );
  });

  it('renders the calendar day in the device timezone', () => {
    // Jest runs with TZ=America/Toronto.
    I18n.locale = 'en';

    expect(formatSubscriptionPeriodEnd('2027-07-20T00:00:00.000Z')).toBe(
      'Jul 19, 2027',
    );
  });

  it('returns undefined for a missing timestamp', () => {
    expect(formatSubscriptionPeriodEnd(undefined)).toBeUndefined();
  });

  it('returns undefined for an unparseable timestamp', () => {
    expect(formatSubscriptionPeriodEnd('not-a-date')).toBeUndefined();
  });
});
