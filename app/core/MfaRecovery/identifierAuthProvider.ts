import { Platform } from 'react-native';
import { bytesToHex, stringToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha2';
import type { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import { createLoginHandler } from '../OAuthService/OAuthLoginHandlers';
import {
  AuthServerUrl,
  web3AuthNetwork,
} from '../OAuthService/OAuthLoginHandlers/constants';
import { fromBase64UrlSafe } from '../OAuthService/OAuthLoginHandlers/utils';
import { toByteArray } from 'react-native-quick-base64';
import type {
  Identifier,
  KeyBoundIdentifierToken,
  RecoveryIdentifierAuthProvider,
} from './types';

export const OIDC_ISSUERS: Record<string, AuthConnection> = {
  'https://accounts.google.com': AuthConnection.Google,
  'https://appleid.apple.com': AuthConnection.Apple,
  'https://oauth.telegram.org': AuthConnection.Telegram,
};

export type LoginWithNonce = (params: {
  authConnection: AuthConnection;
  nonce: string;
}) => Promise<string>;

export interface OidcIdentifierAuthProviderOptions {
  isEnabled: () => boolean;
  loginWithNonce?: LoginWithNonce;
}

/**
 * Same value the escrow checks against the ID token `nonce` claim:
 * SHA-256 of the canonical JSON `[proofPublicKey, requestHash]`, 0x-hex.
 */
export const computeKeyBoundNonce = (
  proofPublicKey: string,
  requestHash: string,
): string =>
  bytesToHex(
    sha256(stringToBytes(JSON.stringify([proofPublicKey, requestHash]))),
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
 * Login with a caller nonce. Native flows return the raw ID token directly;
 * code flows (iOS Google, Android Apple, Telegram) exchange the code with the
 * auth server, which returns the original token as `provider_id_token`.
 */
export const loginWithNonceViaHandlers: LoginWithNonce = async ({
  authConnection,
  nonce,
}) => {
  const handler = createLoginHandler(Platform.OS, authConnection, false, {
    nonce,
    // Recovery must construct a Telegram handler even when onboarding hides it.
    ...(authConnection === AuthConnection.Telegram
      ? { telegramLoginEnabled: true }
      : {}),
  });
  const result = await handler.login();
  if (!result) {
    throw new Error(`MFA recovery: ${authConnection} login was cancelled`);
  }
  if ('idToken' in result) {
    return result.idToken;
  }
  const { provider_id_token: providerIdToken } = await handler.getAuthTokens(
    { ...result, web3AuthNetwork: web3AuthNetwork as Web3AuthNetwork },
    AuthServerUrl,
    'online',
  );
  if (!providerIdToken) {
    throw new Error(
      `MFA recovery: auth server did not return the ${authConnection} ID token`,
    );
  }
  return providerIdToken;
};

/**
 * Builds the `identifierAuthProvider` the MFA recovery controller calls when it
 * needs a key-bound Google, Apple, or Telegram assertion for a specific request.
 */
export const createOidcIdentifierAuthProvider = ({
  isEnabled,
  loginWithNonce = loginWithNonceViaHandlers,
}: OidcIdentifierAuthProviderOptions): RecoveryIdentifierAuthProvider => ({
  async getKeyBoundIdentifierToken({
    identifier,
    proofPublicKey,
    requestHash,
  }: {
    identifier: Identifier;
    proofPublicKey: string;
    requestHash: string;
  }): Promise<KeyBoundIdentifierToken> {
    if (!isEnabled()) {
      throw new Error('MFA recovery is disabled');
    }
    if (identifier.type !== 'oidc') {
      throw new Error(
        `MFA recovery: unsupported identifier type ${identifier.type}`,
      );
    }
    const issuer = trimTrailingSlash(identifier.namespace);
    const authConnection = OIDC_ISSUERS[issuer];
    if (!authConnection) {
      throw new Error(`MFA recovery: unsupported OIDC issuer ${issuer}`);
    }

    const nonce = computeKeyBoundNonce(proofPublicKey, requestHash);
    const idToken = await loginWithNonce({ authConnection, nonce });

    const claims = decodeJwtPayload(idToken);
    if (claims.nonce !== nonce) {
      throw new Error(
        'MFA recovery: ID token nonce does not match the request',
      );
    }
    if (claims.sub !== identifier.value) {
      throw new Error('MFA recovery: signed in with a different account');
    }
    if (trimTrailingSlash(String(claims.iss)) !== issuer) {
      throw new Error('MFA recovery: ID token issuer does not match');
    }

    // The escrow hashes exactly these four fields for the PoP signature.
    return {
      identifier,
      proofPublicKey,
      requestHash,
      providerAssertion: idToken,
    };
  },
});
