import type { KycVendorSessionState } from '@metamask/kyc-controller';

/**
 * POC: the screen the Kalshi flow shows, derived from `sessions.kalshi`.
 *
 * First half (idOS relay, UKYC session): terms → email → email code → phone
 * → phone code → SumSub → waiting for a decision.
 * Second half (device-signed, `vendorAccount`): link the account to
 * MetaMask → account code → activate → done.
 */
export type KalshiStep =
  | 'terms'
  | 'email'
  | 'confirm'
  | 'email_code'
  | 'phone'
  | 'phone_code'
  | 'sumsub'
  | 'waiting'
  | 'rejected'
  | 'link'
  | 'link_code'
  | 'link_waiting'
  | 'activate'
  | 'done'
  | 'unsupported';

/** UI-only facts the controller does not store. */
export interface KalshiStepContext {
  /** A phone code was sent in this visit. */
  phoneCodeSent: boolean;
}

/**
 * The relay's code steps inside identity verification. kyc-api reports the
 * whole UKYC half as `identity_verification`; the relay's `currentStep` says
 * which code the user owes first.
 *
 * @param entry - `sessions.kalshi`.
 * @param context - UI-only facts for this visit.
 * @returns A code step, or `undefined` when no code is owed.
 */
const relayCodeStep = (
  entry: KycVendorSessionState | undefined,
  context: KalshiStepContext,
): KalshiStep | undefined => {
  const currentStep = entry?.sessionStatus?.currentStep;
  if (currentStep === 'emailOtpCollection') {
    return 'email_code';
  }
  if (currentStep === 'phoneOtpCollection') {
    return context.phoneCodeSent ? 'phone_code' : 'phone';
  }
  return undefined;
};

/**
 * The Kalshi account half, once UKYC approved the identity. Still decided on
 * the phone: kyc-api does not model the account link and activation yet.
 *
 * @param entry - `sessions.kalshi`.
 * @returns The account step.
 */
const accountStep = (entry: KycVendorSessionState | undefined): KalshiStep => {
  switch (entry?.vendorAccount?.state) {
    case 'active':
      return 'done';
    case 'approved':
      return 'activate';
    case 'kyc_pending':
    case 'kyc_review':
      return 'link_waiting';
    case 'unsupported':
    case 'inconsistent':
      return 'unsupported';
    case 'link_pending':
      return 'link_code';
    default:
      return 'link';
  }
};

/**
 * The step kyc-api decided (`sessions.kalshi.nextStep`), mapped to a Kalshi
 * screen. `undefined` when kyc-api has not answered yet or returned `error`,
 * so the screen falls back to the stored entry.
 *
 * @param entry - `sessions.kalshi`.
 * @param context - UI-only facts for this visit.
 * @returns The step, or `undefined`.
 */
const deriveFromServerStep = (
  entry: KycVendorSessionState | undefined,
  context: KalshiStepContext,
): KalshiStep | undefined => {
  switch (entry?.nextStep) {
    case 'vendor_terms':
      return 'terms';
    // Kalshi's account comes first: the email starts Kalshi's link, and
    // MetaMask confirms the email when the UKYC session is opened.
    case 'account_link':
      return 'email';
    case 'account_link_code':
      return 'link_code';
    case 'verify_email':
      return 'confirm';
    case 'identity_verification':
      return relayCodeStep(entry, context) ?? 'sumsub';
    case 'kyc_retry':
      return 'sumsub';
    case 'kyc_pending':
      return 'waiting';
    case 'kyc_rejected':
      return 'rejected';
    // Activation (wallet/register) belongs to Predict; KYC ends at approval.
    case 'approved':
      return 'done';
    default:
      return undefined;
  }
};

/**
 * The step from the stored entry alone, used until kyc-api answers.
 *
 * @param entry - `sessions.kalshi`, if any.
 * @param context - UI-only facts for this visit.
 * @returns The step to show.
 */
const deriveFromEntry = (
  entry: KycVendorSessionState | undefined,
  context: KalshiStepContext,
): KalshiStep => {
  if (!entry?.vendorDisclaimersAccepted) {
    return 'terms';
  }
  const session = entry.sessionStatus;
  if (!session) {
    return 'email';
  }

  if (session.currentStep === 'emailOtpCollection') {
    return 'email_code';
  }
  if (session.currentStep === 'phoneOtpCollection') {
    return context.phoneCodeSent ? 'phone_code' : 'phone';
  }

  const { finalStatus, kycStatus } = session;
  if (finalStatus === 'rejected') {
    return 'rejected';
  }
  if (finalStatus !== 'approved') {
    if (
      finalStatus === 'retry' ||
      (entry.providerFlowStatus !== 'submitted' &&
        finalStatus !== 'pending' &&
        kycStatus !== 'pending')
    ) {
      return 'sumsub';
    }
    return 'waiting';
  }

  return accountStep(entry);
};

/**
 * Maps `sessions.kalshi` to a screen. kyc-api decides the UKYC stage
 * (`nextStep`); the relay's `currentStep` picks the code screen inside
 * identity verification, and `vendorAccount.state` drives the account half.
 * Until kyc-api answers, the stored entry decides.
 *
 * @param entry - `sessions.kalshi`, if any.
 * @param context - UI-only facts for this visit.
 * @returns The step to show.
 */
export const deriveKalshiStep = (
  entry: KycVendorSessionState | undefined,
  context: KalshiStepContext,
): KalshiStep => {
  const serverStep = deriveFromServerStep(entry, context);
  if (serverStep) {
    return serverStep;
  }
  return deriveFromEntry(entry, context);
};
