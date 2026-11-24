import {
  CubeSignerClient,
  envs,
  type SessionData,
} from '@cubist-labs/cubesigner-sdk';
import { getCubistConfig, type CubistConfig } from './config';
import { MfaRecoveryControllerError } from './errors';

/** Refresh the cached CubeSigner client this many seconds before expiry. */
const EXPIRY_SKEW_SECONDS = 60;

/** Source of the registration-service access token used to open a session. */
export interface CubistSessionTokenProvider {
  getAccessToken: () => Promise<string>;
  getAuthenticatedProfileId: () => Promise<string>;
  clear?: () => void;
}

export interface CubistClientGetter {
  (): Promise<CubeSignerClient>;
  clear: () => void;
}

interface CreateCubistClientGetterOptions {
  tokenProvider: CubistSessionTokenProvider;
  isEnabled: () => boolean;
  getConfig?: () => CubistConfig;
  fetchFn?: typeof fetch;
}

interface OidcTokenResponse {
  idToken: string;
  expiresAt: number;
}

/**
 * Returns a getter that creates a CubeSigner session only when the recovery
 * feature is used, and reuses it for the same profile until it nears expiry.
 */
export function createCubistClientGetter({
  tokenProvider,
  isEnabled,
  getConfig = getCubistConfig,
  fetchFn = fetch,
}: CreateCubistClientGetterOptions): CubistClientGetter {
  let client: CubeSignerClient | undefined;
  let clientProfileId: string | undefined;
  let expiresAt = 0;

  const clear = (): void => {
    client = undefined;
    clientProfileId = undefined;
    expiresAt = 0;
  };

  const getClient = async (): Promise<CubeSignerClient> => {
    if (!isEnabled()) {
      throw new MfaRecoveryControllerError(
        'MFA recovery is disabled',
        'feature_disabled',
      );
    }

    const config = getConfig();
    const profileId = await tokenProvider.getAuthenticatedProfileId();
    if (
      client &&
      clientProfileId === profileId &&
      expiresAt - EXPIRY_SKEW_SECONDS > Math.floor(Date.now() / 1000)
    ) {
      return client;
    }

    const oidcToken = await requestOidcToken(
      config,
      await tokenProvider.getAccessToken(),
      fetchFn,
    );
    const sessionResponse = await CubeSignerClient.createOidcSession(
      envs[config.environment],
      config.orgId,
      oidcToken.idToken,
      config.scopes,
    );
    const sessionData = sessionResponse.data();
    client = await CubeSignerClient.create(sessionData);
    clientProfileId = profileId;
    expiresAt = resolveSessionExpiry(sessionData, oidcToken.expiresAt);
    return client;
  };

  getClient.clear = clear;
  return getClient;
}

function resolveSessionExpiry(
  sessionData: Partial<SessionData> | undefined,
  fallbackExpiresAt: number,
): number {
  const candidates = [
    sessionData?.session_exp,
    sessionData?.session_info?.refresh_token_exp,
    sessionData?.session_info?.auth_token_exp,
  ].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );
  return candidates.length > 0
    ? Math.min(...candidates, fallbackExpiresAt)
    : fallbackExpiresAt;
}

/** Requests an OIDC token authorized by the recovery registration service. */
export async function requestOidcToken(
  config: Pick<CubistConfig, 'registrationUrl'>,
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<OidcTokenResponse> {
  const response = await fetchFn(
    new URL(
      '/v1/recovery/registration/oidc-token',
      `${config.registrationUrl}/`,
    ).toString(),
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new MfaRecoveryControllerError(
      `Recovery registration failed with HTTP ${response.status}`,
      'registration_request_failed',
    );
  }

  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    typeof body.idToken !== 'string' ||
    body.idToken.trim().length === 0 ||
    typeof body.expiresAt !== 'number' ||
    !Number.isFinite(body.expiresAt)
  ) {
    throw new MfaRecoveryControllerError(
      'Recovery registration returned an invalid OIDC token',
      'registration_response_invalid',
    );
  }
  if (body.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new MfaRecoveryControllerError(
      'Recovery registration returned an expired OIDC token',
      'registration_token_expired',
    );
  }
  return { idToken: body.idToken, expiresAt: body.expiresAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
