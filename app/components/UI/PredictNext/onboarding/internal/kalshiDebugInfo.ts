import StorageWrapper from '../../../../../store/storage-wrapper';

/**
 * TEMPORARY. Debug support for the Kalshi demo onboarding. Delete with the
 * rest of the demo onboarding (mobile plan, replacement path).
 *
 * The phone never keeps the email, and Kalshi never returns it. To tell which
 * Kalshi account a profile was linked to, the last typed email is remembered
 * per MetaMask profile id (the A2T `sub`). MMKV outlives SRP switches, so an
 * unkeyed "last email" would show another SRP's address.
 */
const lastEmailKey = (profileId: string): string =>
  `PredictNext.kalshiDemo.lastLinkedEmail.${profileId}`;

export const rememberKalshiDemoEmail = (
  profileId: string | undefined,
  email: string,
): void => {
  // Best effort. A storage failure must never affect onboarding. An unknown
  // profile id must never surface another profile's email, so store nothing.
  if (!profileId) {
    return;
  }
  Promise.resolve()
    .then(() => StorageWrapper.setItem(lastEmailKey(profileId), email))
    .catch(() => undefined);
};

export const readKalshiDemoEmail = async (
  profileId: string | undefined,
): Promise<string | undefined> => {
  if (!profileId) {
    return undefined;
  }
  try {
    return (await StorageWrapper.getItem(lastEmailKey(profileId))) ?? undefined;
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
