import {
  boolean,
  enums,
  number,
  optional,
  string,
  type,
  union,
  create,
} from '@metamask/superstruct';

export const KALSHI_ONBOARDING_STATES = [
  'none',
  'link_pending',
  'kyc_pending',
  'kyc_review',
  'unsupported',
  'approved',
  'inconsistent',
  'cancelled',
  'active',
] as const;

export type KalshiOnboardingState = (typeof KALSHI_ONBOARDING_STATES)[number];

const toState = (value: string): KalshiOnboardingState =>
  (KALSHI_ONBOARDING_STATES as readonly string[]).includes(value)
    ? (value as KalshiOnboardingState)
    : 'unsupported';

const expireTs = optional(union([string(), number()]));

const StatusStruct = type({
  state: string(),
  intentStatus: optional(string()),
  expireTs,
});

export interface KalshiOnboardingStatus {
  /** An unknown server state reads as `unsupported`. */
  state: KalshiOnboardingState;
  /** Raw Kalshi enum. Logs only: the phone branches on `state`. */
  intentStatus?: string;
  expireTs?: string | number;
}

export const parseKalshiOnboardingStatus = (
  value: unknown,
): KalshiOnboardingStatus => {
  const parsed = create(value, StatusStruct);
  return {
    state: toState(parsed.state),
    ...(parsed.intentStatus === undefined
      ? {}
      : { intentStatus: parsed.intentStatus }),
    ...(parsed.expireTs === undefined ? {} : { expireTs: parsed.expireTs }),
  };
};

const IntentStruct = type({
  intentStatus: string(),
  expireTs,
  supersededPrevious: boolean(),
});

export const parseKalshiEnrollmentIntent = (value: unknown) =>
  create(value, IntentStruct);

export const KALSHI_MFA_METHODS = [
  'sms',
  'email',
  'authenticator-app',
] as const;

export type KalshiMfaMethod = (typeof KALSHI_MFA_METHODS)[number];

/** The second factor Kalshi still wants after the first code was accepted. */
export interface KalshiMfaChallenge {
  method: KalshiMfaMethod;
  phoneLast4?: string;
  obfuscatedEmail?: string;
}

const VerifyStruct = type({
  verified: boolean(),
  mfa: optional(
    type({
      method: enums(KALSHI_MFA_METHODS),
      phoneLast4: optional(string()),
      obfuscatedEmail: optional(string()),
    }),
  ),
});

export interface KalshiLinkVerify {
  verified: boolean;
  /** Set when `verified` is false: submit that code to the same route. */
  mfa?: KalshiMfaChallenge;
}

export const parseKalshiLinkVerify = (value: unknown): KalshiLinkVerify =>
  create(value, VerifyStruct);

const ActivateStruct = type({
  intentStatus: string(),
  payoutMethodId: optional(string()),
});

export const parseKalshiActivate = (value: unknown) =>
  create(value, ActivateStruct);

const DemoKycStruct = type({ state: string() });

export const parseKalshiDemoKyc = (
  value: unknown,
): { state: KalshiOnboardingState } => ({
  state: toState(create(value, DemoKycStruct).state),
});
