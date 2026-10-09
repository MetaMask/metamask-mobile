import { shouldShowApplePaySplash } from './shouldShowApplePaySplash';

const ready = {
  isIos: true,
  isAuthenticated: true,
  applePayCapability: true,
  provisioningEnabled: true,
  seen: false,
  canAddToWallet: true,
  isPushProvisioningLoading: false,
};

describe('shouldShowApplePaySplash', () => {
  it('shows when Apple Pay provisioning is available and the splash is unseen', () => {
    expect(shouldShowApplePaySplash(ready)).toBe(true);
  });

  it('hides after the splash has been seen', () => {
    expect(shouldShowApplePaySplash({ ...ready, seen: true })).toBe(false);
  });

  it('hides off iOS', () => {
    expect(shouldShowApplePaySplash({ ...ready, isIos: false })).toBe(false);
  });

  it('hides until the cardholder is signed in', () => {
    expect(shouldShowApplePaySplash({ ...ready, isAuthenticated: false })).toBe(
      false,
    );
  });

  it('hides when the provider does not support Apple Pay', () => {
    expect(
      shouldShowApplePaySplash({ ...ready, applePayCapability: false }),
    ).toBe(false);
  });

  it('hides when the rollout flag is off', () => {
    expect(
      shouldShowApplePaySplash({ ...ready, provisioningEnabled: false }),
    ).toBe(false);
  });

  it('waits until wallet eligibility has finished', () => {
    expect(
      shouldShowApplePaySplash({ ...ready, isPushProvisioningLoading: true }),
    ).toBe(false);
  });

  it('hides when the card cannot be added to Apple Wallet', () => {
    expect(shouldShowApplePaySplash({ ...ready, canAddToWallet: false })).toBe(
      false,
    );
  });
});
