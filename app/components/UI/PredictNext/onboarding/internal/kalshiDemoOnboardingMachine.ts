import {
  KalshiOnboardingHttpError,
  KalshiOnboardingPolicyError,
} from '../../adapters/remote/KalshiOnboardingClient';
import type { KalshiOnboardingState } from '../../contracts/v1/onboarding';

export type OnboardingStep =
  | 'loading'
  | 'email'
  | 'code'
  | 'working'
  | 'wallet'
  | 'done'
  | 'error'
  | 'hidden';

/** Keys under `predict_next.kalshi_demo_onboarding.errors`. */
export type OnboardingMessage =
  | 'generic'
  | 'code_incorrect'
  | 'expired'
  | 'signup_incomplete'
  | 'account_blocked'
  | 'new_account_failed'
  | 'wallet_invalid'
  | 'rate_limited'
  | 'unsupported'
  | 'review_timeout'
  | 'demo_unavailable';

/**
 * What a failure does next. `stay` keeps the current step with a message.
 * `email` restarts with new keys. `retry` repeats the same action with the
 * same idempotency keys. `status` reads status again. `close` ends the flow.
 */
export type FailureNext = 'stay' | 'email' | 'retry' | 'status' | 'close';

export interface OnboardingFailure {
  message: OnboardingMessage;
  next: FailureNext;
  cooldownSec?: number;
  /** Our bug or a venue rejection worth a Sentry event. Never the payload. */
  report?: string;
}

export interface OnboardingViewState {
  step: OnboardingStep;
  busy: boolean;
  message?: OnboardingMessage;
  /** The error step offers *Try again* instead of *Close* only. */
  retryable: boolean;
  cooldownSec?: number;
}

export type OnboardingEvent =
  | { type: 'started' }
  | { type: 'busy' }
  | { type: 'status'; state: KalshiOnboardingState; initial: boolean }
  | { type: 'link_sent' }
  | { type: 'activated' }
  | { type: 'failed'; failure: OnboardingFailure }
  | { type: 'review_timed_out' }
  | { type: 'dismissed' };

export const initialOnboardingState: OnboardingViewState = {
  step: 'loading',
  busy: true,
  retryable: false,
};

/** Server `state` to the step that resumes it (mobile plan §3). */
export const stepForStatus = (
  state: KalshiOnboardingState,
  initial: boolean,
): Pick<OnboardingViewState, 'step' | 'message'> => {
  switch (state) {
    case 'active':
      return { step: initial ? 'hidden' : 'done' };
    case 'none':
    case 'link_pending':
    case 'cancelled':
      return { step: 'email' };
    case 'kyc_pending':
    case 'kyc_review':
      return { step: 'working' };
    case 'approved':
      return { step: 'wallet' };
    case 'unsupported':
    case 'inconsistent':
      return { step: 'error', message: 'unsupported' };
  }
};

export const onboardingReducer = (
  state: OnboardingViewState,
  event: OnboardingEvent,
): OnboardingViewState => {
  switch (event.type) {
    case 'started':
      return initialOnboardingState;
    case 'busy':
      return {
        ...state,
        busy: true,
        message: undefined,
        cooldownSec: undefined,
      };
    case 'status': {
      const next = stepForStatus(event.state, event.initial);
      return {
        step: next.step,
        message: next.message,
        busy: next.step === 'working',
        retryable: false,
      };
    }
    case 'link_sent':
      return { step: 'code', busy: false, retryable: false };
    case 'activated':
      return { step: 'done', busy: false, retryable: false };
    case 'review_timed_out':
      return {
        step: 'error',
        busy: false,
        retryable: false,
        message: 'review_timeout',
      };
    case 'dismissed':
      return { step: 'hidden', busy: false, retryable: false };
    case 'failed': {
      const { failure } = event;
      switch (failure.next) {
        case 'stay':
          return {
            ...state,
            busy: false,
            message: failure.message,
            cooldownSec: failure.cooldownSec,
          };
        case 'email':
          return {
            step: 'email',
            busy: false,
            retryable: false,
            message: failure.message,
          };
        case 'retry':
        case 'status':
          return {
            step: 'error',
            busy: false,
            retryable: true,
            message: failure.message,
            cooldownSec: failure.cooldownSec,
          };
        case 'close':
          return {
            step: 'error',
            busy: false,
            retryable: false,
            message: failure.message,
          };
      }
    }
  }
  return state;
};

const RESTART_CODES = new Set([
  'onboarding_intent_missing',
  'onboarding_conflict',
  'onboarding_not_approved',
]);

const NEW_ACCOUNT_CODES = new Set([
  'onboarding_phone_matched_existing',
  'onboarding_kyc_rejected',
  'onboarding_kyc_not_approved',
  'onboarding_profile_rejected',
]);

const RETRY_CODES = new Set([
  'onboarding_unavailable',
  'venue_auth_rejected',
  'venue_auth_invalid',
  'onboarding_venue_error',
  'venue_account_not_enabled',
]);

const BUG_CODES = new Set([
  'venue_signature_required',
  'venue_auth_malformed',
  'onboarding_bad_request',
]);

/** Branches on the body `code` first, then on status (server plan §9). */
export const describeOnboardingFailure = (
  error: unknown,
): OnboardingFailure => {
  if (error instanceof KalshiOnboardingPolicyError) {
    return {
      message: 'generic',
      next: 'close',
      report: `policy:${error.rule}`,
    };
  }
  if (!(error instanceof KalshiOnboardingHttpError)) {
    return { message: 'generic', next: 'retry' };
  }

  const { code } = error;
  if (code === 'onboarding_code_incorrect') {
    return { message: 'code_incorrect', next: 'stay' };
  }
  if (code && RESTART_CODES.has(code)) {
    return { message: 'expired', next: 'email' };
  }
  if (code === 'onboarding_signup_incomplete') {
    return { message: 'signup_incomplete', next: 'close' };
  }
  if (
    code === 'onboarding_user_blocked' ||
    code === 'onboarding_user_deactivated'
  ) {
    return { message: 'account_blocked', next: 'close' };
  }
  if (code && NEW_ACCOUNT_CODES.has(code)) {
    return { message: 'new_account_failed', next: 'email' };
  }
  if (code === 'onboarding_wallet_invalid') {
    return { message: 'wallet_invalid', next: 'close', report: code };
  }
  if (code === 'onboarding_rate_limited') {
    return {
      message: 'rate_limited',
      next: 'stay',
      cooldownSec: error.retryAfterSec ?? 30,
    };
  }
  if (code === 'onboarding_not_ready') {
    return { message: 'generic', next: 'status' };
  }
  if (code === 'onboarding_not_found') {
    return { message: 'demo_unavailable', next: 'close' };
  }
  if (code && BUG_CODES.has(code)) {
    return { message: 'generic', next: 'close', report: code };
  }
  if (code && RETRY_CODES.has(code)) {
    return { message: 'generic', next: 'retry' };
  }
  if (error.status === 401) {
    return { message: 'generic', next: 'close' };
  }
  return { message: 'generic', next: 'retry' };
};
