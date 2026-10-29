/**
 * Fallback Money referral share link when `/referral/me` has no `share_url`.
 *
 * The live shape is owned by ops `REFERRAL_SHARE_URL_TEMPLATE` on the API.
 * This constant is only the client fallback for a null template, and must not
 * be used to reject a server-supplied URL. Money share is not the points path
 * `buildReferralUrl` builds (`link.metamask.io/rewards?referral=`).
 */
export const MONEY_SHARE_HOME_REF_BASE = 'https://link.metamask.io/home?ref=';

/**
 * Whether a server-supplied `share_url` is safe to put in front of the user's
 * contacts, clipboard, and QR code.
 *
 * The template can change host, path, and query without an app release, so this
 * does not require `/home?ref=` (or `uref`). It only refuses values that are
 * not an http(s) URL, or that smuggle a destination in the userinfo
 * (`https://evil.com@link.metamask.io/…`).
 *
 * @param value - The candidate URL, already trimmed.
 */
function isShareableHttpUrl(value: string): boolean {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return false;
  }

  if (url.username || url.password) {
    return false;
  }

  return true;
}

/**
 * The link a referrer shares for their code.
 *
 * `share_url` from `GET /referral/me` wins when the server sent one that is
 * shareable — that field is the filled `REFERRAL_SHARE_URL_TEMPLATE`, and is
 * how a link shape change ships without an app release. Otherwise the link is
 * built from the referral code as `https://link.metamask.io/home?ref=`. `null`
 * means there is nothing to share and the caller must hide its QR and link
 * affordances. This slice does not interpolate a username or emit `uref`.
 *
 * @param code - `referral_code.code` from `GET /referral/me`.
 * @param shareUrl - `referral_code.share_url`, null when the server template is unset.
 * @returns The share URL, or null when neither input yields one.
 */
export function resolveMoneyShareUrl(
  code: string | null | undefined,
  shareUrl: string | null | undefined,
): string | null {
  const trimmedShareUrl = shareUrl?.trim();
  if (trimmedShareUrl && isShareableHttpUrl(trimmedShareUrl)) {
    return trimmedShareUrl;
  }

  const trimmedCode = code?.trim();
  if (!trimmedCode) {
    return null;
  }

  return `${MONEY_SHARE_HOME_REF_BASE}${encodeURIComponent(trimmedCode)}`;
}
