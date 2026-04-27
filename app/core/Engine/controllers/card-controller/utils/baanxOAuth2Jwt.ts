import type { CardLocation } from '../../../../../components/UI/Card/types';

const APP_ID_US = 'FOX_US';
const APP_ID_INTL = 'FOX';

/**
 * Decodes JWT payload (middle segment) without verifying the signature.
 * Used only to read Baanx `app_id` for region after OAuth2 login.
 */
export function decodeJwtPayloadUnsafe(
  jwt: string,
): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      '=',
    );
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Maps Baanx access token JWT `app_id` claim to card API region.
 */
export function cardLocationFromBaanxAccessToken(
  accessToken: string,
): CardLocation | null {
  const payload = decodeJwtPayloadUnsafe(accessToken);
  if (!payload) {
    return null;
  }
  const appId = payload.app_id;
  if (appId === APP_ID_US) {
    return 'us';
  }
  if (appId === APP_ID_INTL) {
    return 'international';
  }
  return null;
}

/**
 * True when the JWT payload includes a non-empty `app_id` that is not FOX / FOX_US.
 * False when the token is unparseable, or `app_id` is absent, so callers can fall back to session location.
 */
export function hasUnknownBaanxOAuthAppId(accessToken: string): boolean {
  const payload = decodeJwtPayloadUnsafe(accessToken);
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'app_id')) {
    return false;
  }
  const appId = payload.app_id;
  if (typeof appId !== 'string' || appId.length === 0) {
    return false;
  }
  return appId !== APP_ID_US && appId !== APP_ID_INTL;
}
