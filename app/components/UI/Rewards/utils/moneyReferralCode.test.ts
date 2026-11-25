import {
  parseMoneyReferralCode,
  parseMoneyReferralCodeFromUrl,
} from './moneyReferralCode';

describe('parseMoneyReferralCodeFromUrl', () => {
  it.each([
    'https://link.metamask.io/home?ref=kol123',
    'metamask://home?ref=kol123',
    'https://link.metamask.io/rewards?utm_source=x&ref=KOL123',
  ])('reads the normalized code from %s', (url) => {
    const result = parseMoneyReferralCodeFromUrl(url);

    expect(result).toBe('KOL123');
  });

  it.each([
    'https://link.metamask.io/home',
    'https://link.metamask.io/home?ref=a',
    'https://link.metamask.io/home?ref=kol-123',
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
    ['with a hyphen', 'KOL-123'],
    ['with an underscore', 'KOL_123'],
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

/**
 * RWDS-1732/RWDS-1733: a KOL referral code is Crockford Base32 — the backend
 * generates and validates codes over `0123456789ABCDEFGHJKMNPQRSTVWXYZ`
 * (src/api/referral/referral-code/code-generator.ts in
 * consensys-vertical-apps/va-mmcx-rewards-money), so the letters I, L, O and
 * U never appear in a code it issued. The client's
 * `isMoneyReferralCodeFormatValid` still accepts them and spends a validate
 * round trip before the server refuses the code, so this expected behaviour
 * is skipped until the client pattern rejects those letters too.
 */
describe('KOL referral code alphabet (RWDS-1732/RWDS-1733)', () => {
  it.skip('rejects the excluded Crockford letters I, L, O and U', () => {
    expect(parseMoneyReferralCode('ANNI')).toBeNull();
    expect(parseMoneyReferralCode('ANNL')).toBeNull();
    expect(parseMoneyReferralCode('ANNO')).toBeNull();
    expect(parseMoneyReferralCode('ANNU')).toBeNull();
  });
});
