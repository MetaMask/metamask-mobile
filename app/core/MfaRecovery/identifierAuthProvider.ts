import { Platform } from 'react-native';
import { bytesToHex, stringToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha2';
import type { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import {
  AuthConnection,
  type AuthResponse,
  type HandleFlowParams,
} from '../OAuthService/OAuthInterface';
import { createLoginHandler } from '../OAuthService/OAuthLoginHandlers';
import {
  AuthConnectionConfig,
  AuthServerUrl,
  web3AuthNetwork,
} from '../OAuthService/OAuthLoginHandlers/constants';
import {
  fromBase64UrlSafe,
  toBase64UrlSafe,
} from '../OAuthService/OAuthLoginHandlers/utils';
import { OAuthError, OAuthErrorType } from '../OAuthService/error';
import { getAuthConnectionIdFromClientId } from '../OAuthService/OAuthService';
import { fromByteArray, toByteArray } from 'react-native-quick-base64';
import ReduxService from '../redux';
import { selectTelegramLoginEnabled } from '../../selectors/featureFlagController/seedlessTelegramLogin';
import type {
  Identifier,
  KeyBoundIdentifierLogin,
  KeyBoundIdentifierToken,
  RecoveryIdentifierAuthProvider,
  SeedlessAuthData,
} from './types';

export const OIDC_ISSUERS: Record<string, AuthConnection> = {
  'https://accounts.google.com': AuthConnection.Google,
  'https://appleid.apple.com': AuthConnection.Apple,
  'https://oauth.telegram.org': AuthConnection.Telegram,
};

export const AUTH_CONNECTION_OIDC_ISSUERS: Record<AuthConnection, string> = {
  [AuthConnection.Google]: 'https://accounts.google.com',
  [AuthConnection.Apple]: 'https://appleid.apple.com',
  [AuthConnection.Telegram]: 'https://oauth.telegram.org',
};

export type LoginWithNonce = (params: {
  authConnection: AuthConnection;
  nonce: string;
}) => Promise<string>;

export type LoginWithNonceAndSeedlessAuth = (params: {
  authConnection: AuthConnection;
  nonce: string;
}) => Promise<{
  providerIdToken: string;
  seedlessAuthData: SeedlessAuthData;
}>;

export interface OidcIdentifierAuthProviderOptions {
  isEnabled: () => boolean;
  /**
   * Override for tests. Production uses
   * {@link loginWithNonceAndSeedlessAuthViaHandlers}.
   */
  loginWithNonceAndSeedlessAuth?: LoginWithNonceAndSeedlessAuth;
}

/**
 * Same value the escrow checks against the ID token `nonce` claim:
 * SHA-256 of the canonical JSON `[proofPublicKey, requestHash]`, 0x-hex.
 *
 * `proofPublicKey` is the 0x-hex of the raw 32-byte Ed25519 public key.
 */
export const computeKeyBoundNonce = (
  proofPublicKeyHex: string,
  requestHash: string,
): string =>
  bytesToHex(
    sha256(stringToBytes(JSON.stringify([proofPublicKeyHex, requestHash]))),
  );

const decodeJwtPayload = (jwt: string): Record<string, unknown> => {
  const [, payload] = jwt.split('.');
  if (!payload) {
    throw new Error('MFA recovery: provider returned a malformed ID token');
  }
  const json = new TextDecoder().decode(
    toByteArray(fromBase64UrlSafe(payload)),
  );
  return JSON.parse(json) as Record<string, unknown>;
};

const trimTrailingSlash = (value: string) => value.replace(/\/$/u, '');

const buildSeedlessAuthData = (
  authConnection: AuthConnection,
  authResponse: AuthResponse,
  userId: string,
  clientId: string,
  socialLoginEmail?: string,
): SeedlessAuthData => {
  const config = getAuthConnectionIdFromClientId({
    clientId,
    authConnection,
    authConnectionConfig: AuthConnectionConfig,
  });
  if (!authResponse.id_token) {
    throw new OAuthError(
      'MFA recovery: auth server did not return id_token',
      OAuthErrorType.LoginError,
    );
  }
  if (!authResponse.access_token) {
    throw new OAuthError(
      'MFA recovery: auth server did not return access_token',
      OAuthErrorType.LoginError,
    );
  }
  if (!authResponse.metadata_access_token) {
    throw new OAuthError(
      'MFA recovery: auth server did not return metadata_access_token',
      OAuthErrorType.LoginError,
    );
  }
  if (!authResponse.refresh_token) {
    throw new OAuthError(
      'MFA recovery: auth server did not return refresh_token',
      OAuthErrorType.LoginError,
    );
  }
  // Match OAuthService.handleSeedlessAuthenticate — revoke_token is required.
  if (!authResponse.revoke_token) {
    throw new OAuthError(
      'MFA recovery: auth server did not return revoke_token',
      OAuthErrorType.LoginError,
    );
  }
  if (!userId) {
    throw new OAuthError(
      'MFA recovery: auth server response missing user id',
      OAuthErrorType.LoginError,
    );
  }

  return {
    idTokens: [authResponse.id_token],
    accessToken: authResponse.access_token,
    metadataAccessToken: authResponse.metadata_access_token,
    refreshToken: authResponse.refresh_token,
    revokeToken: authResponse.revoke_token,
    authConnection,
    authConnectionId: config.authConnectionId,
    ...(config.groupedAuthConnectionId
      ? { groupedAuthConnectionId: config.groupedAuthConnectionId }
      : {}),
    userId,
    ...(socialLoginEmail ? { socialLoginEmail } : {}),
  };
};

/**
 * One social login with a bound nonce that returns both the provider ID token
 * (for key-bound recovery) and seedless auth-server tokens (for password unlock).
 * Uses offline access so refresh/revoke tokens are present for seedless authenticate.
 */
export const loginWithNonceAndSeedlessAuthViaHandlers: LoginWithNonceAndSeedlessAuth =
  async ({ authConnection, nonce }) => {
    // Android Google ACM falls back to legacy Google Sign-In when Credential
    // Manager has no accounts; that legacy path drops the OIDC nonce, so MFA
    // key-binding fails with "ID token nonce does not match". Force browser
    // OAuth for nonce-bound Android Google logins (handler honors extraParams.nonce).
    const useBrowserFallback =
      Platform.OS === 'android' && authConnection === AuthConnection.Google;

    // Pass the remote flag through — do not hardcode true (Tyler).
    const telegramLoginEnabled =
      authConnection === AuthConnection.Telegram
        ? selectTelegramLoginEnabled(ReduxService.store.getState())
        : undefined;

    const handler = createLoginHandler(
      Platform.OS,
      authConnection,
      useBrowserFallback,
      {
        nonce,
        ...(telegramLoginEnabled !== undefined ? { telegramLoginEnabled } : {}),
      },
    );
    const result = await handler.login();
    if (!result) {
      throw new OAuthError(
        `MFA recovery: ${authConnection} login was cancelled`,
        OAuthErrorType.UserCancelled,
      );
    }

    let authResponse: AuthResponse;
    try {
      authResponse = await handler.getAuthTokens(
        {
          ...result,
          web3AuthNetwork: web3AuthNetwork as Web3AuthNetwork,
        } as HandleFlowParams,
        AuthServerUrl,
        'offline',
      );
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthError(
        error instanceof Error ? error : 'Unknown error',
        OAuthErrorType.LoginError,
      );
    }

    const providerIdToken =
      authResponse.provider_id_token ??
      ('idToken' in result ? result.idToken : undefined);
    if (!providerIdToken) {
      throw new OAuthError(
        `MFA recovery: auth server did not return the ${authConnection} ID token`,
        OAuthErrorType.LoginError,
      );
    }

    const { userId, accountName } = handler.getUserInfo(authResponse);
    const seedlessAuthData = buildSeedlessAuthData(
      authConnection,
      authResponse,
      userId,
      handler.options.clientId,
      accountName || undefined,
    );

    return { providerIdToken, seedlessAuthData };
  };

/**
 * Login with a caller nonce. Native flows return the raw ID token directly;
 * code flows (iOS Google, Android Apple, Telegram) exchange the code with the
 * auth server, which returns the original token as `provider_id_token`.
 *
 * Prefer {@link loginWithNonceAndSeedlessAuthViaHandlers} when seedless auth
 * tokens are also required from the same login.
 */
export const loginWithNonceViaHandlers: LoginWithNonce = async ({
  authConnection,
  nonce,
}) => {
  const { providerIdToken } = await loginWithNonceAndSeedlessAuthViaHandlers({
    authConnection,
    nonce,
  });
  return providerIdToken;
};

const assertEnabledAndResolveConnection = (
  isEnabled: () => boolean,
  identifier: Identifier,
): AuthConnection => {
  if (!isEnabled()) {
    throw new Error('MFA recovery is disabled');
  }
  // Core IDENTIFIER_AUTH_MODES registers social OIDC as `social` (not `oidc`).
  if (identifier.type !== 'social') {
    throw new Error(
      `MFA recovery: unsupported identifier type ${identifier.type}`,
    );
  }
  const issuer = trimTrailingSlash(identifier.namespace);
  const authConnection = OIDC_ISSUERS[issuer];
  if (!authConnection) {
    throw new Error(`MFA recovery: unsupported OIDC issuer ${issuer}`);
  }
  return authConnection;
};

/**
 * Candidate Apple ID-token `nonce` encodings for a caller-bound raw nonce.
 *
 * Apple always SHA-256-hashes the authorize nonce before writing the claim.
 * Some stacks (iOS ASAuthorization / auth-server) pre-hash before Apple hashes
 * again — accept both single and double hex digests. Also accept base64url of
 * the single digest bytes (seen in some OIDC Apple integrations).
 */
export const appleNonceClaimCandidates = (nonce: string): string[] => {
  const once = sha256(stringToBytes(nonce));
  const onceHex = bytesToHex(once);
  const onceHexNoPrefix = onceHex.slice(2);
  const twiceHex = bytesToHex(sha256(stringToBytes(onceHexNoPrefix)));
  const twiceHexNoPrefix = twiceHex.slice(2);
  // Pre-hash with 0x prefix (if a layer hashed the full `0x…` string).
  const twiceFromPrefixed = bytesToHex(sha256(stringToBytes(onceHex)));
  const onceBase64Url = toBase64UrlSafe(fromByteArray(once));
  return [
    onceHex,
    onceHexNoPrefix,
    twiceHex,
    twiceHexNoPrefix,
    twiceFromPrefixed,
    twiceFromPrefixed.slice(2),
    onceBase64Url,
  ];
};

/**
 * Apple hashes the authorize/request nonce with SHA-256 before writing it into
 * the ID token `nonce` claim (expo-apple-authentication does the same). Google
 * and Telegram echo the raw nonce. Accept Apple encodings so MFA key-binding
 * works once auth-server returns a real Apple ID token.
 */
const isMatchingProviderNonce = (
  claimNonce: unknown,
  nonce: string,
  issuer: string,
): boolean => {
  if (typeof claimNonce === 'string' && claimNonce === nonce) {
    return true;
  }
  if (OIDC_ISSUERS[issuer] !== AuthConnection.Apple) {
    return false;
  }
  if (typeof claimNonce !== 'string' || !claimNonce) {
    return false;
  }
  return appleNonceClaimCandidates(nonce).includes(claimNonce);
};

/**
 * Validates nonce/issuer and resolves the OIDC subject from the provider ID
 * token. When `identifier.value` is set, it must match `claims.sub`. When it is
 * empty (password-unlock rehydration), the subject is discovered from the token
 * — seedless `userId` is the auth-server subject and must not be used here.
 */
const validateProviderIdToken = (
  idToken: string,
  identifier: Identifier,
  nonce: string,
): string => {
  const issuer = trimTrailingSlash(identifier.namespace);
  const claims = decodeJwtPayload(idToken);
  if (!isMatchingProviderNonce(claims.nonce, nonce, issuer)) {
    throw new Error('MFA recovery: ID token nonce does not match the request');
  }
  if (typeof claims.sub !== 'string' || !claims.sub) {
    throw new Error('MFA recovery: ID token is missing subject');
  }
  if (identifier.value && claims.sub !== identifier.value) {
    throw new Error('MFA recovery: signed in with a different account');
  }
  if (trimTrailingSlash(String(claims.iss)) !== issuer) {
    throw new Error('MFA recovery: ID token issuer does not match');
  }
  return claims.sub;
};

const buildKeyBoundToken = (
  identifier: Identifier,
  proofPublicKey: Uint8Array,
  requestHash: string,
  providerAssertion: string,
  providerSubject: string,
): KeyBoundIdentifierToken => ({
  identifier: {
    ...identifier,
    value: providerSubject,
  },
  proofPublicKey,
  requestHash,
  providerAssertion,
});

/**
 * Builds the `identifierAuthProvider` the MFA recovery controller calls when it
 * needs a key-bound Google, Apple, or Telegram assertion for a specific request.
 *
 * Implements Core’s single provider method
 * {@link RecoveryIdentifierAuthProvider.getKeyBoundIdentifierLogin}: one social
 * login returns the key-bound token plus optional seedless auth-server data.
 */
export const createOidcIdentifierAuthProvider = ({
  isEnabled,
  loginWithNonceAndSeedlessAuth = loginWithNonceAndSeedlessAuthViaHandlers,
}: OidcIdentifierAuthProviderOptions): RecoveryIdentifierAuthProvider => ({
  async getKeyBoundIdentifierLogin({
    identifier,
    proofPublicKey,
    requestHash,
  }: {
    identifier: Identifier;
    proofPublicKey: Uint8Array;
    requestHash: string;
  }): Promise<KeyBoundIdentifierLogin> {
    const authConnection = assertEnabledAndResolveConnection(
      isEnabled,
      identifier,
    );
    const proofPublicKeyHex = bytesToHex(proofPublicKey);
    const nonce = computeKeyBoundNonce(proofPublicKeyHex, requestHash);

    const { providerIdToken, seedlessAuthData } =
      await loginWithNonceAndSeedlessAuth({ authConnection, nonce });

    const providerSubject = validateProviderIdToken(
      providerIdToken,
      identifier,
      nonce,
    );

    return {
      token: buildKeyBoundToken(
        identifier,
        proofPublicKey,
        requestHash,
        providerIdToken,
        providerSubject,
      ),
      seedlessAuthData,
    };
  },
});
