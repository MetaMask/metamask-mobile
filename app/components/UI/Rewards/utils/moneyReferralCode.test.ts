import {
  normalizeMoneyReferralCode,
  parseMoneyReferralCode,
  parseMoneyReferralCodeFromUrl,
} from './moneyReferralCode';

describe('normalizeMoneyReferralCode', () => {
  it.each([
    ['DATA-NERD', 'DATANERD'],
    [' data-nerd ', 'DATANERD'],
    ['-ABC', 'ABC'],
    ['A--B-', 'AB'],
  ])('normalizes %p to %p', (value, expected) => {
    expect(normalizeMoneyReferralCode(value)).toBe(expected);
  });
});

describe('parseMoneyReferralCodeFromUrl', () => {
  it.each([
    'https://link.metamask.io/home?ref=kol123',
    'metamask://home?ref=kol123',
    'https://link.metamask.io/rewards?utm_source=x&ref=KOL123',
    'https://link.metamask.io/home?ref=kol-123',
  ])('reads the normalized code from %s', (url) => {
    const result = parseMoneyReferralCodeFromUrl(url);

    expect(result).toBe('KOL123');
  });

  it.each([
    'https://link.metamask.io/home',
    'https://link.metamask.io/home?ref=a',
    'https://link.metamask.io/home?ref=a-b',
    'https://link.metamask.io/home?referral=KOL123',
  ])('returns null for %s', (url) => {
    const result = parseMoneyReferralCodeFromUrl(url);

    expect(result).toBeNull();
  });
});

describe('parseMoneyReferralCode', () => {
  it('uppercases a valid code', () => {
    const result = parseMoneyReferralCode('kol123');

    expect(result).toBe('KOL123');
  });

  it('trims surrounding whitespace', () => {
    const result = parseMoneyReferralCode(' kol123 ');

    expect(result).toBe('KOL123');
  });

  it.each([
    ['shorter than 3 characters', 'AB'],
    ['longer than 24 characters', 'A'.repeat(25)],
    ['empty', ''],
    ['shorter than 3 characters once hyphens are dropped', 'A-B'],
    ['longer than 24 characters once hyphens are dropped', 'A-'.repeat(25)],
    ['made of hyphens only', '---'],
    ['with an underscore', 'KOL_123'],
  ])('rejects a code %s', (_label, value) => {
    const result = parseMoneyReferralCode(value);

    expect(result).toBeNull();
  });

  it.each([
    ['DATA-NERD', 'DATANERD'],
    ['data-nerd', 'DATANERD'],
    ['-ABC', 'ABC'],
    // 25 characters with the hyphen, 24 without: the bound applies after normalizing.
    ['ABCDEFGHIJKL-MNOPQRSTUVWX', 'ABCDEFGHIJKLMNOPQRSTUVWX'],
  ])('drops hyphens from %p', (value, expected) => {
    expect(parseMoneyReferralCode(value)).toBe(expected);
  });

  it('accepts the length bounds', () => {
    expect(parseMoneyReferralCode('ABC')).toBe('ABC');
    expect(parseMoneyReferralCode('A'.repeat(24))).toBe('A'.repeat(24));
  });

  it.each([undefined, null, 123, ['KOL1']])(
    'rejects a non-string value %p',
    (value) => {
      const result = parseMoneyReferralCode(value);

      expect(result).toBeNull();
    },
  );
});
