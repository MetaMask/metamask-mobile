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
  GoogleWebGID,
  SupportedPlatforms,
  web3AuthNetwork,
} from '../OAuthService/OAuthLoginHandlers/constants';
import { fromBase64UrlSafe } from '../OAuthService/OAuthLoginHandlers/utils';
import { toByteArray } from 'react-native-quick-base64';
import Device from '../../util/device';
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
  loginWithNonce?: LoginWithNonce;
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

/**
 * Match {@link OAuthService} `getAuthConnectionIdFromClientId`: modern iOS
 * Google uses `GoogleWebGID` and must map to the Android auth connection IDs
 * that existing wallets were created with.
 */
const resolveAuthConnectionConfig = (
  authConnection: AuthConnection,
  clientId: string,
) => {
  const platform =
    Device.isAndroid() || clientId === GoogleWebGID
      ? SupportedPlatforms.Android
      : SupportedPlatforms.IOS;
  return AuthConnectionConfig[platform][authConnection];
};

const buildSeedlessAuthData = (
  authConnection: AuthConnection,
  authResponse: AuthResponse,
  userId: string,
  clientId: string,
  socialLoginEmail?: string,
): SeedlessAuthData => {
  const config = resolveAuthConnectionConfig(authConnection, clientId);
  if (!authResponse.id_token) {
    throw new Error('MFA recovery: auth server did not return id_token');
  }
  if (!authResponse.access_token) {
    throw new Error('MFA recovery: auth server did not return access_token');
  }
  if (!authResponse.metadata_access_token) {
    throw new Error(
      'MFA recovery: auth server did not return metadata_access_token',
    );
  }
  if (!authResponse.refresh_token) {
    throw new Error('MFA recovery: auth server did not return refresh_token');
  }
  if (!userId) {
    throw new Error('MFA recovery: auth server response missing user id');
  }

  return {
    idTokens: [authResponse.id_token],
    accessToken: authResponse.access_token,
    metadataAccessToken: authResponse.metadata_access_token,
    refreshToken: authResponse.refresh_token,
    ...(authResponse.revoke_token
      ? { revokeToken: authResponse.revoke_token }
      : {}),
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

    const handler = createLoginHandler(
      Platform.OS,
      authConnection,
      useBrowserFallback,
      {
        nonce,
        ...(authConnection === AuthConnection.Telegram
          ? { telegramLoginEnabled: true }
          : {}),
      },
    );
    const result = await handler.login();
    if (!result) {
      throw new Error(`MFA recovery: ${authConnection} login was cancelled`);
    }

    const authResponse = await handler.getAuthTokens(
      {
        ...result,
        web3AuthNetwork: web3AuthNetwork as Web3AuthNetwork,
      } as HandleFlowParams,
      AuthServerUrl,
      'offline',
    );

    const providerIdToken =
      authResponse.provider_id_token ??
      ('idToken' in result ? result.idToken : undefined);
    if (!providerIdToken) {
      throw new Error(
        `MFA recovery: auth server did not return the ${authConnection} ID token`,
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
  if (claims.nonce !== nonce) {
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
 * Prefer {@link RecoveryIdentifierAuthProvider.getKeyBoundIdentifierLogin} for the
 * seedless + password unlock path (one login → provider proof + seedless tokens).
 */
export const createOidcIdentifierAuthProvider = ({
  isEnabled,
  loginWithNonce,
  loginWithNonceAndSeedlessAuth = loginWithNonceAndSeedlessAuthViaHandlers,
}: OidcIdentifierAuthProviderOptions): RecoveryIdentifierAuthProvider => ({
  async getKeyBoundIdentifierToken({
    identifier,
    proofPublicKey,
    requestHash,
  }: {
    identifier: Identifier;
    proofPublicKey: Uint8Array;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    const authConnection = assertEnabledAndResolveConnection(
      isEnabled,
      identifier,
    );
    const proofPublicKeyHex = bytesToHex(proofPublicKey);
    const nonce = computeKeyBoundNonce(proofPublicKeyHex, requestHash);

    let idToken: string;
    if (loginWithNonce) {
      idToken = await loginWithNonce({ authConnection, nonce });
    } else {
      ({ providerIdToken: idToken } = await loginWithNonceAndSeedlessAuth({
        authConnection,
        nonce,
      }));
    }

    const providerSubject = validateProviderIdToken(idToken, identifier, nonce);
    return buildKeyBoundToken(
      identifier,
      proofPublicKey,
      requestHash,
      idToken,
      providerSubject,
    );
  },

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
