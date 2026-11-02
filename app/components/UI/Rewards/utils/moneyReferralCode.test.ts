import {
  parseMoneyReferralCode,
  parseMoneyReferralCodeFromUrl,
} from './moneyReferralCode';

describe('parseMoneyReferralCodeFromUrl', () => {
  it.each([
    'https://link.metamask.io/home?ref=kol-123',
    'metamask://home?ref=kol-123',
    'https://link.metamask.io/rewards?utm_source=x&ref=KOL123',
  ])('reads the normalized code from %s', (url) => {
    const result = parseMoneyReferralCodeFromUrl(url);

    expect(result).toBe('KOL123');
  });

  it.each([
    'https://link.metamask.io/home',
    'https://link.metamask.io/home?ref=a',
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

  it('strips characters a code cannot contain', () => {
    const result = parseMoneyReferralCode(' kol-12_3 ');

    expect(result).toBe('KOL123');
  });

  it.each([
    ['shorter than 3 characters', 'AB'],
    ['longer than 24 characters', 'A'.repeat(25)],
    ['empty', ''],
    ['only separators', '--__'],
  ])('rejects a code %s', (_label, value) => {
    const result = parseMoneyReferralCode(value);

    expect(result).toBeNull();
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
