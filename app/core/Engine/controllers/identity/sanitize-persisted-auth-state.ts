import {
  Env,
  getEnvUrls,
  type LoginResponse,
} from '@metamask/profile-sync-controller/sdk';
import type { AuthenticationControllerState } from '@metamask/profile-sync-controller/auth';

function decodeJwtIss(accessToken: string): string | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/gu, '+').replace(/_/gu, '/');
    const json =
      typeof atob === 'function'
        ? (JSON.parse(atob(normalized)) as { iss?: unknown })
        : (JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as {
            iss?: unknown;
          });
    return typeof json.iss === 'string' ? json.iss : null;
  } catch {
    return null;
  }
}

function sessionMatchesEnv(
  session: LoginResponse | undefined,
  expectedOidcIss: string,
): boolean {
  const accessToken = session?.token?.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return false;
  }
  const iss = decodeJwtIss(accessToken);
  return iss === expectedOidcIss;
}

/**
 * Drop persisted Profile Sync sessions minted for a different OIDC env.
 *
 * Restarting alone is not enough: cached `srpSessionData` is reused until
 * expiry, so a DEV JWT keeps getting attached after switching to PRD.
 */
export function sanitizePersistedAuthenticationState(
  state: AuthenticationControllerState | undefined,
  env: Env,
): AuthenticationControllerState | undefined {
  if (!state?.srpSessionData) {
    return state;
  }

  const expectedOidcIss = getEnvUrls(env).oidcApiUrl;
  const sessions = Object.values(state.srpSessionData);
  const allMatch =
    sessions.length > 0 &&
    sessions.every((session) => sessionMatchesEnv(session, expectedOidcIss));

  if (allMatch) {
    return state;
  }

  console.warn(
    `[authentication] Clearing persisted Profile Sync session(s) that were not minted for OIDC ${expectedOidcIss}. A fresh sign-in will mint a matching token.`,
  );

  return {
    ...state,
    isSignedIn: false,
    srpSessionData: undefined,
  };
}
