import { parseMoneyReferralCode } from './moneyReferralCode';

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
