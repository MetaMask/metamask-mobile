import { getIntlDateTimeFormatter, getIntlNumberFormatter } from './intl';

describe('getIntlNumberFormatter', () => {
  it('returns cached Intl.NumberFormat', () => {
    const formatter1 = getIntlNumberFormatter('en-US');
    const formatter2 = getIntlNumberFormatter('en-US');
    expect(formatter1).toBe(formatter2);
  });

  it('returns cached Intl.NumberFormat when using options', () => {
    const formatter1 = getIntlNumberFormatter('en-US', { currency: 'USD' });
    const formatter2 = getIntlNumberFormatter('en-US', { currency: 'USD' });
    expect(formatter1).toBe(formatter2);
  });

  it('cached multiple instances of Intl.NumberFormat based on options', () => {
    const formatter1 = getIntlNumberFormatter('en-US');
    const formatter2 = getIntlNumberFormatter('fr-FR');
    const formatter3 = getIntlNumberFormatter('en-US');
    const formatter4 = getIntlNumberFormatter('fr-FR');
    expect(formatter1).toBe(formatter3);
    expect(formatter2).toBe(formatter4);
    expect(formatter1).not.toBe(formatter2);
    expect(formatter3).not.toBe(formatter4);
  });
});

// getIntlDateTimeFormatter tests

describe('getIntlDateTimeFormatter', () => {
  it('returns cached Intl.DateTimeFormat', () => {
    const formatter1 = getIntlDateTimeFormatter('en-US');
    const formatter2 = getIntlDateTimeFormatter('en-US');
    expect(formatter1).toBe(formatter2);
  });

  it('returns cached Intl.DateTimeFormat when using options', () => {
    const formatter1 = getIntlDateTimeFormatter('en-US', { timeZone: 'UTC' });
    const formatter2 = getIntlDateTimeFormatter('en-US', { timeZone: 'UTC' });
    expect(formatter1).toBe(formatter2);
  });

  it('cached multiple instances of Intl.DateTimeFormat based on options', () => {
    const formatter1 = getIntlDateTimeFormatter('en-US');
    const formatter2 = getIntlDateTimeFormatter('fr-FR');
    const formatter3 = getIntlDateTimeFormatter('en-US');
    const formatter4 = getIntlDateTimeFormatter('fr-FR');
    expect(formatter1).toBe(formatter3);
    expect(formatter2).toBe(formatter4);
    expect(formatter1).not.toBe(formatter2);
    expect(formatter3).not.toBe(formatter4);
  });
});
