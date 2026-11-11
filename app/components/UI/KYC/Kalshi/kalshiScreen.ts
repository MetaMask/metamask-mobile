import { KYC_CURRENT_STEPS, type KycStep } from '@metamask/kyc-controller';

/**
 * The screens of the Kalshi onboarding flow. kyc-api decides which one the
 * user is on. The phone only picks the screen for the step.
 */
export type KalshiScreen =
  | 'loading'
  | 'terms'
  | 'email'
  | 'link_code'
  | 'confirm'
  | 'email_code'
  | 'phone'
  | 'phone_code'
  | 'sumsub'
  | 'waiting'
  | 'rejected'
  | 'done'
  | 'error';

/**
 * What the phone knows beyond the step.
 */
export interface KalshiScreenContext {
  /**
   * The step of the idOS relay's session, read from the session status. It
   * says which code idOS wants while the step is `identity_verification`.
   */
  relayStep?: string;
  /** The phone code was sent from this screen and is being entered. */
  phoneCodeSent: boolean;
}

const deriveIdentityScreen = ({
  relayStep,
  phoneCodeSent,
}: KalshiScreenContext): KalshiScreen => {
  if (relayStep === KYC_CURRENT_STEPS.emailOtpCollection) {
    return 'email_code';
  }
  if (relayStep === KYC_CURRENT_STEPS.phoneOtpCollection) {
    return phoneCodeSent ? 'phone_code' : 'phone';
  }
  return 'sumsub';
};

/**
 * Picks the screen for the step kyc-api decided.
 *
 * @param step - The step kyc-api decided, or `undefined` before it answered.
 * @param context - What the phone knows beyond the step.
 * @returns The screen to show.
 */
export function deriveKalshiScreen(
  step: KycStep | undefined,
  context: KalshiScreenContext,
): KalshiScreen {
  switch (step) {
    case undefined:
      return 'loading';
    case 'vendor_terms':
      return 'terms';
    case 'account_link':
      return 'email';
    case 'account_link_code':
      return 'link_code';
    case 'confirm_identity':
      return 'confirm';
    case 'identity_verification':
      return deriveIdentityScreen(context);
    case 'kyc_retry':
      return 'sumsub';
    case 'kyc_pending':
      return 'waiting';
    case 'kyc_rejected':
      return 'rejected';
    case 'approved':
      return 'done';
    default:
      return 'error';
  }
}
