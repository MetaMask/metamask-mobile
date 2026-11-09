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
 * Maps the stored Kalshi entry to a step. Resumes from storage: the relay's
 * `currentStep` drives the first half, `vendorAccount.state` the second.
 *
 * @param entry - `sessions.kalshi`, if any.
 * @param context - UI-only facts for this visit.
 * @returns The step to show.
 */
export const deriveKalshiStep = (
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

  const account = entry.vendorAccount;
  switch (account?.state) {
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
      // Stored by startVendorAccountLink: a code is on its way. The screen
      // offers "send a new code", which opens a fresh intent.
      return 'link_code';
    default:
      return 'link';
  }
};
