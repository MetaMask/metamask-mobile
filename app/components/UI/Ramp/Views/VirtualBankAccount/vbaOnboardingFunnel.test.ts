import { KYC_STEPS, type KycStep } from '@metamask/kyc-controller';
import {
  createEmptyVbaOnboardingSnapshot,
  getVbaDestinationForStep,
  type VbaOnboardingDestinationId,
} from './vbaOnboardingFunnel';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from './vbaOnboardingSnapshot';

describe('getVbaDestinationForStep', () => {
  const notReady = { autorampStatus: 'not_ready' as const };

  it.each([
    ['vendor_terms', 'vendorTerms'],
    ['verify_email', 'email'],
    ['identity_verification', 'identityVerification'],
    ['kyc_pending', 'kycPending'],
    ['kyc_retry', 'kycRejected'],
    ['kyc_rejected', 'kycRejected'],
    ['approved', 'identityVerified'],
    ['error', 'error'],
  ] as [KycStep, VbaOnboardingDestinationId][])(
    'maps the %s step to %s',
    (step, destination) => {
      expect(getVbaDestinationForStep(step, notReady)).toBe(destination);
    },
  );

  it('covers every step kyc-api can return', () => {
    for (const step of KYC_STEPS) {
      expect(getVbaDestinationForStep(step, notReady)).toBeDefined();
    }
  });

  it.each(KYC_STEPS)(
    'opens the account when the autoramp is ready, even on the %s step',
    (step) => {
      expect(getVbaDestinationForStep(step, { autorampStatus: 'ready' })).toBe(
        'complete',
      );
    },
  );

  it('returns error when the step is unknown', () => {
    expect(getVbaDestinationForStep(null, notReady)).toBe('error');
    expect(getVbaDestinationForStep(undefined, undefined)).toBe('error');
  });
});

describe('createEmptyVbaOnboardingSnapshot', () => {
  it('returns a fresh copy of the empty snapshot', () => {
    const snapshot = createEmptyVbaOnboardingSnapshot();

    expect(snapshot).toStrictEqual(EMPTY_VBA_ONBOARDING_SNAPSHOT);
    expect(snapshot).not.toBe(EMPTY_VBA_ONBOARDING_SNAPSHOT);
  });
});
