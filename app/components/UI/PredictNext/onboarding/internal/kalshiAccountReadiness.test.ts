import {
  KALSHI_ONBOARDING_STATES,
  parseKalshiOnboardingStatus,
  type KalshiOnboardingState,
} from '../../contracts/v1/onboarding';
import type { AccountReadinessSnapshot } from '../accountReadiness.types';
import { mapKalshiAccountReadiness } from './kalshiAccountReadiness';
import type { OnboardingFailure } from './kalshiDemoOnboardingMachine';

const expected: Record<KalshiOnboardingState, AccountReadinessSnapshot> = {
  none: { readiness: 'setup_required', card: { kind: 'not_started' } },
  link_pending: {
    readiness: 'setup_required',
    card: { kind: 'finish_verifying', intent: 'resume' },
  },
  kyc_pending: {
    readiness: 'setup_required',
    card: { kind: 'finish_verifying', intent: 'resume' },
  },
  kyc_review: { readiness: 'verifying', card: { kind: 'verifying' } },
  approved: {
    readiness: 'setup_required',
    card: {
      kind: 'action_required',
      reason: 'activation_required',
      intent: 'resume',
    },
  },
  active: { readiness: 'ready', card: { kind: 'verified' } },
  cancelled: {
    readiness: 'setup_required',
    card: { kind: 'action_required', reason: 'cancelled', intent: 'restart' },
  },
  unsupported: {
    readiness: 'unavailable',
    card: {
      kind: 'action_required',
      reason: 'status_unsupported',
      intent: 'retry',
    },
  },
  inconsistent: {
    readiness: 'unavailable',
    card: {
      kind: 'action_required',
      reason: 'status_inconsistent',
      intent: 'retry',
    },
  },
};

const restart: AccountReadinessSnapshot = {
  readiness: 'setup_required',
  card: {
    kind: 'action_required',
    reason: 'verification_failed',
    intent: 'restart',
  },
};
const unavailable: AccountReadinessSnapshot = {
  readiness: 'unavailable',
  card: {
    kind: 'action_required',
    reason: 'setup_unavailable',
    intent: 'retry',
  },
};

describe('mapKalshiAccountReadiness', () => {
  it.each(KALSHI_ONBOARDING_STATES)(
    'maps %s to its authoritative card',
    (state) => {
      expect(mapKalshiAccountReadiness(state)).toEqual(expected[state]);
    },
  );

  it('hides readiness when there has been no successful status', () => {
    expect(mapKalshiAccountReadiness(undefined)).toEqual({
      readiness: 'unknown',
      card: { kind: 'hidden' },
    });
  });

  it('maps an unknown wire enum through the parser to unsupported', () => {
    const status = parseKalshiOnboardingStatus({
      state: 'future_state',
      intentStatus: 'active',
    });

    expect(mapKalshiAccountReadiness(status.state)).toEqual(
      expected.unsupported,
    );
  });

  it.each(['expired', 'new_account_failed'] as const)(
    'maps classified %s restart failures to a restart card',
    (message) => {
      expect(
        mapKalshiAccountReadiness('kyc_pending', { message, next: 'email' }),
      ).toEqual(restart);
    },
  );

  it.each([
    'signup_incomplete',
    'account_blocked',
    'wallet_invalid',
    'demo_unavailable',
  ] as const)(
    'maps classified %s terminal failures to setup unavailable',
    (message) => {
      expect(
        mapKalshiAccountReadiness('none', { message, next: 'close' }),
      ).toEqual(unavailable);
    },
  );

  it.each([
    'active',
    'approved',
    'kyc_review',
    'unsupported',
    'inconsistent',
    'cancelled',
  ] as const)(
    'keeps authoritative %s ahead of a stale restart failure',
    (state) => {
      expect(
        mapKalshiAccountReadiness(state, { message: 'expired', next: 'email' }),
      ).toEqual(expected[state]);
    },
  );

  it.each([
    'active',
    'approved',
    'kyc_review',
    'unsupported',
    'inconsistent',
    'cancelled',
  ] as const)(
    'keeps authoritative %s ahead of a stale terminal failure',
    (state) => {
      expect(
        mapKalshiAccountReadiness(state, {
          message: 'account_blocked',
          next: 'close',
        }),
      ).toEqual(expected[state]);
    },
  );

  it.each<Pick<OnboardingFailure, 'message' | 'next'>>([
    { message: 'generic', next: 'retry' },
    { message: 'generic', next: 'status' },
    { message: 'generic', next: 'close' },
    { message: 'review_timeout', next: 'status' },
    { message: 'code_incorrect', next: 'stay' },
    { message: 'rate_limited', next: 'stay' },
    { message: 'expired', next: 'retry' },
    { message: 'new_account_failed', next: 'close' },
  ])(
    'retains the current status for non-restart failure $message/$next',
    (failure) => {
      expect(mapKalshiAccountReadiness('link_pending', failure)).toEqual(
        expected.link_pending,
      );
    },
  );

  it('retains review after its timeout', () => {
    expect(
      mapKalshiAccountReadiness('kyc_review', {
        message: 'review_timeout',
        next: 'status',
      }),
    ).toEqual(expected.kyc_review);
  });
});
