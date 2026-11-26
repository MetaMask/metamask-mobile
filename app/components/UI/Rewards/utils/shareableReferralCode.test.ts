import { isShareableReferralCode } from './shareableReferralCode';

describe('isShareableReferralCode', () => {
  it('accepts an active, non-empty code', () => {
    expect(
      isShareableReferralCode({ code: 'SOPHIE', status: 'ACTIVE' }, 'ACTIVE'),
    ).toBe(true);
  });

  it('reads the status on the code when the referrer status is absent', () => {
    expect(
      isShareableReferralCode({ code: 'SOPHIE', status: 'ACTIVE' }, null),
    ).toBe(true);
  });

  it.each(['PENDING', 'INACTIVE', 'REVOKED', 'UNKNOWN'])(
    'rejects a code whose referrer status is %s',
    (status) => {
      expect(
        isShareableReferralCode({ code: 'SOPHIE', status: 'ACTIVE' }, status),
      ).toBe(false);
    },
  );

  it('prefers the referrer status over the status on the code', () => {
    expect(
      isShareableReferralCode({ code: 'SOPHIE', status: 'PENDING' }, 'ACTIVE'),
    ).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('rejects an active status with a %s code', (_label, code) => {
    expect(isShareableReferralCode({ code, status: 'ACTIVE' }, 'ACTIVE')).toBe(
      false,
    );
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('rejects a %s code object', (_label, referralCode) => {
    expect(isShareableReferralCode(referralCode, 'ACTIVE')).toBe(false);
  });

  it('rejects when no status is known', () => {
    expect(isShareableReferralCode({ code: 'SOPHIE' }, undefined)).toBe(false);
  });
});
