import { strings } from '../../../../../locales/i18n';

const OAUTH_ERROR_KEYS = [
  'access_denied',
  'temporarily_unavailable',
  'login_required',
  'session_expired',
] as const;

type KnownOAuthErrorKey = (typeof OAUTH_ERROR_KEYS)[number];

function isKnownOAuthErrorKey(code: string): code is KnownOAuthErrorKey {
  return (OAUTH_ERROR_KEYS as readonly string[]).includes(code);
}

/**
 * Maps OAuth2 authorization error codes (RFC 6749 redirect `error` param) to card auth copy.
 */
export function getCardOAuth2UiErrorMessage(
  errorCode: string | null | undefined,
): string {
  if (!errorCode) {
    return strings('card.card_authentication.errors.unknown_error');
  }

  if (isKnownOAuthErrorKey(errorCode)) {
    return strings(`card.card_authentication.errors.oauth.${errorCode}`);
  }

  return strings('card.card_authentication.errors.unknown_error');
}
