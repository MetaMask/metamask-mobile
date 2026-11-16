import type { KycStep } from '@metamask/kyc-controller';

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
  /** The phone code was sent from this screen and is being entered. */
  phoneCodeSent: boolean;
}

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
    case 'identity_email_code':
      return 'email_code';
    case 'identity_phone':
      // The number and its code are one step. The code field follows the
      // number on the same screen once the code was sent.
      return context.phoneCodeSent ? 'phone_code' : 'phone';
    case 'identity_provider':
      return 'sumsub';
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
