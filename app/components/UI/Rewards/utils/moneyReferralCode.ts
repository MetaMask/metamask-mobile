export const MONEY_REFERRAL_CODE_MIN_LENGTH = 3;
export const MONEY_REFERRAL_CODE_MAX_LENGTH = 24;

/** Query key that carries a Money referral code on a MetaMask deeplink. */
export const MONEY_REFERRAL_CODE_QUERY_PARAM = 'ref';

/**
 * Reads a Money referral code from a raw link value.
 *
 * Keeps letters and digits only and uppercases them. Returns null when the
 * value is not a string or the result is not 3-24 characters long, so a
 * malformed code is discarded rather than prefilled.
 */
export function parseMoneyReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const code = value.replace(/[^a-zA-Z0-9]/gu, '').toUpperCase();
  if (
    code.length < MONEY_REFERRAL_CODE_MIN_LENGTH ||
    code.length > MONEY_REFERRAL_CODE_MAX_LENGTH
  ) {
    return null;
  }
  return code;
}
