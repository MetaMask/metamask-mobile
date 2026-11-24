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
 * `kalshi_email_link` covers the Kalshi email and its code. The email field
 * shows until the code was sent from this screen, because the address is what
 * opens the session, and again when the user goes back to change it.
 * `kalshi_phone_link` covers the phone number and, once it was sent, its code.
 * kyc-api cannot tell those screens apart, so only the phone knows which is
 * showing.
 */
export interface KalshiScreenContext {
  /** The email code was sent from this screen and is being entered. */
  emailSent: boolean;
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
    case 'mfa':
      return 'confirm';
    case 'terms':
      return 'terms';
    case 'kalshi_email_link':
      return context.emailSent && !context.editingEmail
        ? 'email_code'
        : 'email';
    case 'kalshi_phone_link':
      return context.phoneCodeSent ? 'phone_code' : 'phone';
    case 'sumsub':
      // A retry is the same screen as the first attempt; the status is what
      // the "we need another look" copy keys off.
      return 'sumsub';
    case 'decision':
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
