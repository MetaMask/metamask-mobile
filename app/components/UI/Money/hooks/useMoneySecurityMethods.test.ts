import { hasVerificationMethodsAfterRemoval } from './useMoneySecurityMethods';

describe('hasVerificationMethodsAfterRemoval', () => {
  it('keeps transaction verification enabled when a passkey remains', () => {
    expect(hasVerificationMethodsAfterRemoval(1, false)).toBe(true);
  });

  it('keeps transaction verification enabled when another method remains', () => {
    expect(hasVerificationMethodsAfterRemoval(0, true)).toBe(true);
  });

  it('allows transaction verification to be disabled when no methods remain', () => {
    expect(hasVerificationMethodsAfterRemoval(0, false)).toBe(false);
  });
});
