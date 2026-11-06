import StorageWrapper from '../../../../../store/storage-wrapper';

/**
 * TEMPORARY. Debug support for the Kalshi demo onboarding. Delete with the
 * rest of the demo onboarding (mobile plan, replacement path).
 *
 * The phone never keeps the email, and Kalshi never returns it. To tell which
 * Kalshi account a profile was linked to, the last typed email is remembered
 * on this device so the debug panel can show it.
 */
const LAST_EMAIL_KEY = 'PredictNext.kalshiDemo.lastLinkedEmail';

export const rememberKalshiDemoEmail = (email: string): void => {
  // Best effort. A storage failure must never affect onboarding.
  Promise.resolve()
    .then(() => StorageWrapper.setItem(LAST_EMAIL_KEY, email))
    .catch(() => undefined);
};

export const readKalshiDemoEmail = async (): Promise<string | undefined> => {
  try {
    return (await StorageWrapper.getItem(LAST_EMAIL_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
};

export interface A2tSummary {
  sub?: string;
  aud?: string;
  iss?: string;
  expiresAt?: string;
}

/** Claims only. The token itself is never shown or logged. */
export const summarizeA2t = (token: string | undefined): A2tSummary => {
  const payload = token?.split('.')[1];
  if (!payload) {
    return {};
  }
  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
    const claims = JSON.parse(
      // eslint-disable-next-line no-restricted-globals
      Buffer.from(base64, 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    return {
      sub: typeof claims.sub === 'string' ? claims.sub : undefined,
      aud: typeof claims.aud === 'string' ? claims.aud : undefined,
      iss: typeof claims.iss === 'string' ? claims.iss : undefined,
      expiresAt:
        typeof claims.exp === 'number'
          ? new Date(claims.exp * 1000).toISOString()
          : undefined,
    };
  } catch {
    return {};
  }
};
