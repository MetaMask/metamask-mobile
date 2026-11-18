import type { KycStep, KycStepStatus } from '@metamask/kyc-controller';

/**
 * The screens of the Kalshi onboarding flow. kyc-api decides which one the
 * user is on. The phone only picks the screen for the step.
 */
export type KalshiScreen =
  | 'loading'
  | 'terms'
  | 'confirm'
  | 'email'
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
 *
 * MetaMask MFA and the Kalshi email both happen before the session exists,
 * on `confirm_identity`. Changing the email happens on the code step. Only
 * the phone knows which of those screens is showing.
 */
export interface KalshiScreenContext {
  /** MetaMask MFA finished, so the email field is showing. */
  emailEntry: boolean;
  /** On the code step, the user went back to change the address. */
  editingEmail: boolean;
  /** The phone code was sent from this screen and is being entered. */
  phoneCodeSent: boolean;
}

/**
 * Picks the screen for the step kyc-api decided.
 *
 * @param step - The step kyc-api decided, or `null` / `undefined` before it
 * answered.
 * @param status - How verification is going, as kyc-api reported it.
 * @param context - What the phone knows beyond the step.
 * @returns The screen to show.
 */
export function deriveKalshiScreen(
  step: KycStep | null | undefined,
  status: KycStepStatus | null,
  context: KalshiScreenContext,
): KalshiScreen {
  switch (step) {
    case undefined:
    case null:
      return 'loading';
    case 'vendor_terms':
      return 'terms';
    case 'confirm_identity':
      return context.emailEntry ? 'email' : 'confirm';
    case 'identity_email_code':
      return context.editingEmail ? 'email' : 'email_code';
    case 'identity_phone':
      return context.phoneCodeSent ? 'phone_code' : 'phone';
    case 'identity_provider':
      // A retry is the same screen as the first attempt; the status is what
      // the "we need another look" copy keys off.
      return 'sumsub';
    case 'done':
      return doneScreen(status);
    default:
      return 'error';
  }
}

/**
 * Picks the screen for a finished flow, which the status decides.
 *
 * @param status - How verification went.
 * @returns The screen to show.
 */
function doneScreen(status: KycStepStatus | null): KalshiScreen {
  switch (status) {
    case 'approved':
      return 'done';
    case 'rejected':
      return 'rejected';
    default:
      return 'waiting';
  }
}
