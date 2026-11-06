import {
  getEnvUrls,
  type EnrolledCredential,
  type LoginResponse,
} from '@metamask/profile-sync-controller/sdk';
import Engine from '../../../../core/Engine';
import { authEnv } from '../../../../core/apiEnv';

/**
 * Social MFA listing helper (exchange + /mfa/credentials).
 * Post-password recovery uses unlocked `refreshEnrolledCredentials` instead;
 * keep this for pre-unlock listing / diagnostics. Do not call `/social/login`
 * from mobile — that stays inside Auth.
 */

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
 * Maps one Auth API credential row to `EnrolledCredential`.
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
 * Active MFA method types in kit cost order (passkey → totp → email).
 * Empty means MFA is not enabled for recovery — skip the accounts kit.
 * Index 0 is the Figma “highest priority” factor (open directly after
 * password); the full list is the picker fallback when primary fails.
 *
 * @param credentials - Enrolled factors from Auth.
 * @returns Active methods the accounts MFA kit can verify with.
 */
export const activeSocialMfaMethods = (
  credentials: EnrolledCredential[],
): ('passkey' | 'totp' | 'email_otp')[] => {
  const active = new Set(
    credentials
      .filter((credential) => credential.status === 'active')
      .map((credential) => credential.type),
  );
  return (['passkey', 'totp', 'email_otp'] as const).filter((method) =>
    active.has(method),
  );
};

/**
 * Profile methods derived from enrolled MFA credentials.
 *
 * @param credentials - Enrolled factors.
 * @returns Visibility flags for legacy WalletRecoveryVerify UI.
 */
export const socialRecoveryMethodFlags = (
  credentials: EnrolledCredential[],
): {
  showPasskey: boolean;
  showEmail: boolean;
  showTotp: boolean;
} => {
  const methods = activeSocialMfaMethods(credentials);
  return {
    showPasskey: methods.includes('passkey'),
    showEmail: methods.includes('email_otp'),
    showTotp: methods.includes('totp'),
  };
};

/**
 * Profile session via `exchangeSocialAccessToken`, then list MFA factors from
 * the Auth API — usable before seedless vault unlock with the Auth POC.
 *
 * @returns Supported enrolled credentials for the social-paired profile.
 */
export const listSocialEnrolledCredentials = async (): Promise<
  EnrolledCredential[]
> => {
  const login: LoginResponse =
    await Engine.context.AuthenticationController.exchangeSocialAccessToken();
  const accessToken = login.token.accessToken;

  // Must match AuthenticationController's authEnv — the bearer from
  // exchangeSocialAccessToken is issued by that same Auth cluster.
  const url = `${getEnvUrls(authEnv()).authApiUrl}/api/v2/mfa/credentials`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `listSocialEnrolledCredentials failed: HTTP ${response.status}`,
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
