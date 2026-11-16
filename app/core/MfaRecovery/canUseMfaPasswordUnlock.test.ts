import { canUseMfaPasswordUnlock } from './canUseMfaPasswordUnlock';

describe('canUseMfaPasswordUnlock', () => {
  const base = {
    isMoneyMfaEnabled: true,
    createWallet: false,
    seedlessUserId: 'user-1',
    seedlessAuthConnection: 'google',
    provider: 'google',
    hasMfaRecoveryController: true,
  };

  it('returns true when all left-hand gates pass', () => {
    expect(canUseMfaPasswordUnlock(base)).toBe(true);
  });

  it('returns false when Money MFA flag is off', () => {
    expect(canUseMfaPasswordUnlock({ ...base, isMoneyMfaEnabled: false })).toBe(
      false,
    );
  });

  it('returns false for create-wallet flows', () => {
    expect(canUseMfaPasswordUnlock({ ...base, createWallet: true })).toBe(
      false,
    );
  });

  it('returns false when seedless userId is missing', () => {
    expect(
      canUseMfaPasswordUnlock({ ...base, seedlessUserId: undefined }),
    ).toBe(false);
    expect(canUseMfaPasswordUnlock({ ...base, seedlessUserId: '' })).toBe(
      false,
    );
  });

  it('returns false when seedless auth connection does not match provider', () => {
    expect(
      canUseMfaPasswordUnlock({
        ...base,
        seedlessAuthConnection: 'apple',
        provider: 'google',
      }),
    ).toBe(false);
  });

  it('returns false when MfaRecoveryController is not wired', () => {
    expect(
      canUseMfaPasswordUnlock({
        ...base,
        hasMfaRecoveryController: false,
      }),
    ).toBe(false);
  });
});
