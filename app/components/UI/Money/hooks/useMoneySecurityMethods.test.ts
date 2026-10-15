import {
  getIsMoneySmsAdded,
  getIsMoneySocialLogin,
  hasVerificationMethodsAfterRemoval,
} from './useMoneySecurityMethods';
import { AccountType } from '../../../../constants/onboarding';

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

describe('getIsMoneySmsAdded', () => {
  it('keeps the existing SMS method for social-login users', () => {
    expect(getIsMoneySmsAdded(true, false)).toBe(true);
  });

  it('requires SRP users to explicitly add SMS', () => {
    expect(getIsMoneySmsAdded(false, false)).toBe(false);
    expect(getIsMoneySmsAdded(false, false, Date.now())).toBe(true);
  });

  it('hides SMS after either user type removes it', () => {
    expect(getIsMoneySmsAdded(true, true, Date.now())).toBe(false);
    expect(getIsMoneySmsAdded(false, true, Date.now())).toBe(false);
  });
});

describe('getIsMoneySocialLogin', () => {
  it('honors a prototype social-login signal for an existing SRP account type', () => {
    expect(getIsMoneySocialLogin(AccountType.Metamask, true)).toBe(true);
  });

  it('does not classify an SRP account without social-login signals as social', () => {
    expect(getIsMoneySocialLogin(AccountType.Metamask, false)).toBe(false);
  });

  it('recognizes persisted social account types', () => {
    expect(getIsMoneySocialLogin(AccountType.MetamaskGoogle, false)).toBe(true);
  });
});
