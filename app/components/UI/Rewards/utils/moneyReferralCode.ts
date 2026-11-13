import UrlParser from 'url-parse';

export const MONEY_REFERRAL_CODE_MIN_LENGTH = 3;
export const MONEY_REFERRAL_CODE_MAX_LENGTH = 24;

/** Query key that carries a Money referral code on a MetaMask deeplink. */
export const MONEY_REFERRAL_CODE_QUERY_PARAM = 'ref';

/** Money codes are alphanumeric only — the points program's hyphen is not accepted. */
const MONEY_REFERRAL_CODE_PATTERN = /^[A-Z0-9]+$/;

/** The form the API expects, and the only form the client reports or sends. */
export const normalizeMoneyReferralCode = (code: string) =>
  code.trim().toUpperCase();

export const isMoneyReferralCodeFormatValid = (code: string) =>
  code.length >= MONEY_REFERRAL_CODE_MIN_LENGTH &&
  code.length <= MONEY_REFERRAL_CODE_MAX_LENGTH &&
  MONEY_REFERRAL_CODE_PATTERN.test(code);

/**
 * Reads a Money referral code from a raw link value, normalized. Returns null
 * when the value is not a string or not a well-formed code, so a malformed
 * code is discarded rather than prefilled.
 */
export function parseMoneyReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const code = normalizeMoneyReferralCode(value);
  return isMoneyReferralCodeFormatValid(code) ? code : null;
}

/**
 * Reads the Money referral code carried by a deeplink URL, for any scheme
 * the app accepts (`https://link.metamask.io/...`, `metamask://...`).
 * Returns null when the link has no valid code or cannot be parsed.
 */
export function parseMoneyReferralCodeFromUrl(url: string): string | null {
  try {
    const { query } = new UrlParser(url, true);
    return parseMoneyReferralCode(query[MONEY_REFERRAL_CODE_QUERY_PARAM]);
  } catch {
    return null;
  }
}
