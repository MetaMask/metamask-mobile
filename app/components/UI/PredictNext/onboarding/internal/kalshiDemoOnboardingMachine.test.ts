import { KalshiOnboardingHttpError } from '../../adapters/remote/KalshiOnboardingClient';
import type { KalshiOnboardingState } from '../../contracts/v1/onboarding';
import {
  describeOnboardingFailure,
  initialOnboardingState,
  onboardingReducer,
  stepForStatus,
} from './kalshiDemoOnboardingMachine';

const http = (status: number, code?: string, retryAfterSec?: number) =>
  new KalshiOnboardingHttpError(status, code, retryAfterSec);

describe('stepForStatus', () => {
  it.each<[KalshiOnboardingState, string]>([
    ['active', 'hidden'],
    ['none', 'email'],
    ['link_pending', 'email'],
    ['cancelled', 'email'],
    ['kyc_pending', 'working'],
    ['kyc_review', 'working'],
    ['approved', 'wallet'],
    ['unsupported', 'error'],
    ['inconsistent', 'error'],
  ])('resumes %s on the %s step', (state, step) => {
    expect(stepForStatus(state, true).step).toBe(step);
  });

  it('shows done when a profile becomes active during this session', () => {
    expect(stepForStatus('active', false).step).toBe('done');
  });
});

describe('describeOnboardingFailure', () => {
  it.each<[string, string, string]>([
    ['onboarding_code_incorrect', 'code_incorrect', 'stay'],
    ['onboarding_intent_missing', 'expired', 'email'],
    ['onboarding_conflict', 'expired', 'email'],
    ['onboarding_not_approved', 'expired', 'email'],
    ['onboarding_signup_incomplete', 'signup_incomplete', 'close'],
    ['onboarding_user_blocked', 'account_blocked', 'close'],
    ['onboarding_user_deactivated', 'account_blocked', 'close'],
    ['onboarding_phone_matched_existing', 'new_account_failed', 'email'],
    ['onboarding_kyc_rejected', 'new_account_failed', 'email'],
    ['onboarding_kyc_not_approved', 'new_account_failed', 'email'],
    ['onboarding_profile_rejected', 'new_account_failed', 'email'],
    ['onboarding_wallet_invalid', 'wallet_invalid', 'close'],
    ['onboarding_unavailable', 'generic', 'retry'],
    ['venue_auth_rejected', 'generic', 'retry'],
    ['onboarding_venue_error', 'generic', 'retry'],
    ['venue_auth_invalid', 'generic', 'retry'],
    ['onboarding_not_ready', 'generic', 'status'],
    ['onboarding_not_found', 'demo_unavailable', 'close'],
    ['venue_signature_required', 'generic', 'close'],
    ['venue_auth_malformed', 'generic', 'close'],
    ['onboarding_bad_request', 'generic', 'close'],
  ])('maps %s to %s / %s', (code, message, next) => {
    expect(describeOnboardingFailure(http(409, code))).toMatchObject({
      message,
      next,
    });
  });

  it('keeps Retry-After on a rate limit', () => {
    expect(
      describeOnboardingFailure(http(429, 'onboarding_rate_limited', 12)),
    ).toMatchObject({ message: 'rate_limited', next: 'stay', cooldownSec: 12 });
  });

  it('reports a wallet rejection by code only', () => {
    expect(
      describeOnboardingFailure(http(400, 'onboarding_wallet_invalid')),
    ).toMatchObject({ report: 'onboarding_wallet_invalid' });
  });

  it('closes on a MetaMask 401', () => {
    expect(describeOnboardingFailure(http(401))).toMatchObject({
      next: 'close',
    });
  });
});

describe('onboardingReducer', () => {
  it('returns to email with the restart copy', () => {
    const next = onboardingReducer(
      { step: 'code', busy: true, retryable: false },
      {
        type: 'failed',
        failure: { message: 'expired', next: 'email' },
      },
    );

    expect(next).toMatchObject({
      step: 'email',
      busy: false,
      message: 'expired',
    });
  });

  it('offers try again for a retryable failure', () => {
    const next = onboardingReducer(initialOnboardingState, {
      type: 'failed',
      failure: { message: 'generic', next: 'retry' },
    });

    expect(next).toMatchObject({
      step: 'error',
      retryable: true,
      message: 'generic',
    });
  });

  it('hides the sheet on dismiss', () => {
    expect(
      onboardingReducer(initialOnboardingState, { type: 'dismissed' }).step,
    ).toBe('hidden');
  });

  it('shows the second-factor step and keeps it after a wrong code', () => {
    const mfa = { method: 'sms', phoneLast4: '8564' } as const;
    const asked = onboardingReducer(initialOnboardingState, {
      type: 'mfa_required',
      mfa,
    });
    expect(asked).toMatchObject({ step: 'mfa', busy: false, mfa });

    const wrong = onboardingReducer(asked, {
      type: 'failed',
      failure: describeOnboardingFailure(
        http(400, 'onboarding_code_incorrect'),
      ),
    });
    expect(wrong).toMatchObject({
      step: 'mfa',
      message: 'code_incorrect',
      mfa,
    });
  });
});
