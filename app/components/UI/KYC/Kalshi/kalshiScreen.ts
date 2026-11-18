import type { KycStep, KycStepStatus } from '@metamask/kyc-controller';

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
 *
 * kyc-api decides steps, not screens. Where a step covers an address and
 * the code sent to it, only the phone can know which of the two the user is
 * looking at — and only the phone can take them back to correct a typo.
 */
export interface KalshiScreenContext {
  /** The link code was sent, so the code screen follows the email screen. */
  linkCodeSent: boolean;
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
    case 'account_link':
      // The email and its code are one step. Kalshi has no way to tell us
      // the address was wrong, so the phone keeps the code screen and the
      // way back to the email on its own side.
      return context.linkCodeSent ? 'link_code' : 'email';
    case 'confirm_identity':
      return 'confirm';
    case 'identity_email_code':
      return 'email_code';
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
