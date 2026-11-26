import {
  getKycKalshiErrorCode,
  type KycKalshiErrorCode,
} from '@metamask/kyc-controller';

/**
 * What the user reads for the codes that mean something to them. The wrong
 * code stays on the code screen, so its message says how to get another. A
 * rejected request is safe to send again, because the next attempt is signed
 * anew. A code with no message of its own gets a generic one that keeps the
 * code for support.
 */
const MESSAGES: Partial<Record<KycKalshiErrorCode, string>> = {
  invalid_or_expired_code:
    'That code is wrong or has expired. Check it and try again, or send a new code.',
  kalshi_signed_request_rejected:
    'Kalshi couldn’t confirm this request. Try again.',
  kalshi_signed_request_sub_mismatch:
    'This Kalshi sign-in doesn’t match your MetaMask account. Sign out of MetaMask, sign back in, and try again.',
  kalshi_signed_request_email_mismatch:
    'Kalshi has to be linked to the email you confirmed with MetaMask. Enter that address and try again.',
  kalshi_signed_request_a2t_invalid:
    'MetaMask couldn’t prove your Kalshi sign-in. Try again.',
  kalshi_signed_request_a2t_missing:
    'MetaMask couldn’t prove your Kalshi sign-in. Try again.',
  kalshi_account_exists:
    'This phone number already has a Kalshi account. Linking an existing account isn’t supported yet.',
  idos_relay_unavailable:
    'The verification service is unavailable. Try again in a moment.',
  not_found:
    'Kalshi couldn’t find this sign-up. Try again, and contact support if it keeps happening. (not_found)',
};

/**
 * The message for a failure that carries a relay code.
 *
 * @param error - The failure from a controller call.
 * @returns The message, or `undefined` when the failure has no relay code.
 */
export const describeKalshiError = (error: unknown): string | undefined => {
  const code = getKycKalshiErrorCode(error);
  if (!code) {
    return undefined;
  }
  return (
    MESSAGES[code] ??
    `MetaMask couldn’t send this request to Kalshi. Try again. (${code})`
  );
};

/**
 * Whether the failure says the session is past the email code, so the screen
 * should ask kyc-api where the user is instead of staying put.
 *
 * @param error - The failure from a controller call.
 * @returns Whether to read the step again.
 */
export const shouldRefreshAfter = (error: unknown): boolean =>
  getKycKalshiErrorCode(error) === 'session_not_in_email_verification';
