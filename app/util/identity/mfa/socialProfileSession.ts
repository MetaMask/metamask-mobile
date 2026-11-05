import {
  getEnvUrls,
  type EnrolledCredential,
  type LoginResponse,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../core/Engine';
import { profileSyncEnv } from '../../../core/OAuthService/OAuthLoginHandlers/constants';
import { MfaFlowError } from './engine/errors';

/**
 * Profile session obtained from the Seedless / Web3Auth social JWT — no vault
 * unlock and no SRP signing. Used to list MFA factors before password on the
 * social rehydration "Verify it's you" screen.
 *
 * AuthController already exposes `exchangeSocialAccessToken()`. Listing
 * credentials with the resulting access token is not yet a first-class
 * AuthController API; this module bridges that gap for mobile integration.
 */
export interface SocialProfileSession {
  accessToken: string;
  expiresIn: number;
  obtainedAt: number;
  profileId: string;
}

interface MfaCredentialsApiRow {
  credential_id: string;
  credential_type: string;
  status: string;
  enrolled_at?: string;
  last_used_at?: string;
  passkey?: { display_name?: string };
  email?: { address?: string; verified?: boolean };
}

interface MfaCredentialsApiResponse {
  credentials?: MfaCredentialsApiRow[];
}

const parseCredentialDate = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * Maps one Auth API credential row to the kit's `EnrolledCredential` shape.
 * Unknown types/statuses are dropped (same policy as profile-sync SDK).
 *
 * @param credential - Raw `/api/v2/mfa/credentials` row.
 * @returns Supported credential, or `undefined` when unsupported.
 */
export const mapApiCredentialToEnrolled = (
  credential: MfaCredentialsApiRow,
): EnrolledCredential | undefined => {
  const { credential_id: id, credential_type: type, status } = credential;
  if (status !== 'active' && status !== 'pending') {
    return undefined;
  }

  const enrolledAt = parseCredentialDate(credential.enrolled_at);
  const lastUsedAt = parseCredentialDate(credential.last_used_at);
  const base = {
    id,
    status: status as 'active' | 'pending',
    ...(enrolledAt === undefined ? {} : { enrolledAt }),
    ...(lastUsedAt === undefined ? {} : { lastUsedAt }),
  };

  if (type === 'passkey') {
    return {
      type: 'passkey',
      ...base,
      ...(credential.passkey?.display_name
        ? { displayName: credential.passkey.display_name }
        : {}),
    };
  }
  if (type === 'email_otp') {
    const address = credential.email?.address;
    return {
      type: 'email_otp',
      ...base,
      ...(address === undefined ? {} : { email: address }),
      verified: credential.email?.verified ?? status === 'active',
    };
  }
  if (type === 'totp') {
    return { type: 'totp', ...base };
  }
  return undefined;
};

/**
 * Exchanges the Seedless W3A/social JWT for a profile access token.
 * Does not require the vault to be unlocked.
 *
 * @returns Social profile session fields the kit can use for listing factors.
 */
export const establishSocialProfileSession =
  async (): Promise<SocialProfileSession> => {
    const login: LoginResponse =
      await Engine.context.AuthenticationController.exchangeSocialAccessToken();
    return {
      accessToken: login.token.accessToken,
      expiresIn: login.token.expiresIn,
      obtainedAt: login.token.obtainedAt,
      profileId: login.profile.profileId,
    };
  };

/**
 * Lists enrolled MFA credentials using a profile access token (e.g. from
 * {@link establishSocialProfileSession}).
 *
 * @param accessToken - Bearer token for the canonical profile.
 * @returns Supported enrolled credentials.
 */
export const listEnrolledCredentialsWithAccessToken = async (
  accessToken: string,
): Promise<EnrolledCredential[]> => {
  const url = `${getEnvUrls(profileSyncEnv).authApiUrl}/api/v2/mfa/credentials`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new MfaFlowError(
      response.status === 401 ? 'authentication_required' : 'server_error',
    );
  }

  const json = (await response.json()) as MfaCredentialsApiResponse;
  const rows = Array.isArray(json.credentials) ? json.credentials : [];
  return rows
    .map(mapApiCredentialToEnrolled)
    .filter((credential): credential is EnrolledCredential =>
      Boolean(credential),
    );
};

/**
 * Full pre-unlock path: W3A/social JWT → profile session → enrolled factors.
 *
 * @returns Enrolled credentials for the social-paired profile.
 */
export const listEnrolledCredentialsWithSocialSession = async (): Promise<
  EnrolledCredential[]
> => {
  const session = await establishSocialProfileSession();
  return listEnrolledCredentialsWithAccessToken(session.accessToken);
};
