import type { KalshiOnboardingState } from '../../contracts/v1/onboarding';
import type { AccountReadinessSnapshot } from '../accountReadiness.types';
import type { OnboardingFailure } from './kalshiDemoOnboardingMachine';

/** Projects authoritative status and classified workflow failures onto Home. */
export function mapKalshiAccountReadiness(
  state: KalshiOnboardingState | undefined,
  failure?: Pick<OnboardingFailure, 'message' | 'next'>,
): AccountReadinessSnapshot {
  switch (state) {
    case 'active':
      return { readiness: 'ready', card: { kind: 'verified' } };
    case 'approved':
      return {
        readiness: 'setup_required',
        card: {
          kind: 'action_required',
          reason: 'activation_required',
          intent: 'resume',
        },
      };
    case 'kyc_review':
      return { readiness: 'verifying', card: { kind: 'verifying' } };
    case 'unsupported':
      return {
        readiness: 'unavailable',
        card: {
          kind: 'action_required',
          reason: 'status_unsupported',
          intent: 'retry',
        },
      };
    case 'inconsistent':
      return {
        readiness: 'unavailable',
        card: {
          kind: 'action_required',
          reason: 'status_inconsistent',
          intent: 'retry',
        },
      };
    case 'cancelled':
      return {
        readiness: 'setup_required',
        card: {
          kind: 'action_required',
          reason: 'cancelled',
          intent: 'restart',
        },
      };
    default:
      break;
  }

  if (
    failure?.next === 'close' &&
    (failure.message === 'signup_incomplete' ||
      failure.message === 'account_blocked' ||
      failure.message === 'wallet_invalid' ||
      failure.message === 'demo_unavailable')
  ) {
    return {
      readiness: 'unavailable',
      card: {
        kind: 'action_required',
        reason: 'setup_unavailable',
        intent: 'retry',
      },
    };
  }
  if (
    failure?.next === 'email' &&
    (failure.message === 'expired' || failure.message === 'new_account_failed')
  ) {
    return {
      readiness: 'setup_required',
      card: {
        kind: 'action_required',
        reason: 'verification_failed',
        intent: 'restart',
      },
    };
  }

  switch (state) {
    case 'none':
      return { readiness: 'setup_required', card: { kind: 'not_started' } };
    case 'link_pending':
    case 'kyc_pending':
      return {
        readiness: 'setup_required',
        card: { kind: 'finish_verifying', intent: 'resume' },
      };
    default:
      return { readiness: 'unknown', card: { kind: 'hidden' } };
  }
}
