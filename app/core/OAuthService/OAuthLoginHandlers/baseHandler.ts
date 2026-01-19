import {
  AuthConnection,
  AuthRequestParams,
  AuthResponse,
  HandleFlowParams,
  LoginHandlerResult,
} from '../OAuthInterface';
import { OAuthError, OAuthErrorType } from '../error';
import { fromBase64UrlSafe, retryWithDelay, toBase64UrlSafe } from './utils';
import { bytesToString } from '@metamask/utils';
import { toByteArray, fromByteArray } from 'react-native-quick-base64';
import QuickCrypto from 'react-native-quick-crypto';

/**
 * Get the auth tokens from the auth server
 *
 * @param params - The params required to get the auth tokens
 * @param params.authConnection - The auth connection type (Google, Apple, etc.)
 * @param params.clientId - The client id of the app ( clientId for Google, Service ID or Bundle ID for Apple)
 * @param params.redirectUri - The redirect uri of the app used for the login
 * @param params.codeVerifier - The PKCE code verifier if PKCE is used
 * @param params.web3AuthNetwork - The web3 auth network (sapphire_mainnet, sapphire_devnet, etc.)
 *
 * @param pathname - The pathname(endpoint) of the auth server
 * @param authServerUrl - The url of the auth server
 */
export async function getAuthTokens(
  params: AuthRequestParams,
  pathname: string,
  authServerUrl: string,
): Promise<AuthResponse> {
  const res = await fetch(`${authServerUrl}/${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...params, access_type: 'offline' }),
  });

  if (res.status === 200 || res.status === 201) {
    const data: AuthResponse = (await res.json()) satisfies AuthResponse;
    return data;
  }

  throw new OAuthError(
    `AuthServer Error, request failed with status: [${
      res.status
    }]: ${await res.text()}`,
    OAuthErrorType.AuthServerError,
  );
}

export interface BaseHandlerOptions {
  authServerUrl: string;
  clientId: string;
  web3AuthNetwork: string;
}

/**
 * Base class for the login handlers
 */
export abstract class BaseLoginHandler {
  public options: BaseHandlerOptions;

  public nonce: string;

  protected readonly CODE_CHALLENGE_METHOD = 'S256';

  protected readonly AUTH_SERVER_TOKEN_PATH = '/api/v1/oauth/token';

  protected readonly AUTH_SERVER_REVOKE_PATH = '/api/v1/oauth/revoke';

  abstract get authConnection(): AuthConnection;

  abstract get scope(): string[];

  abstract get authServerPath(): string;

  abstract login(): Promise<LoginHandlerResult | undefined>;

  constructor(options: BaseHandlerOptions) {
    this.options = options;
    this.nonce = this.generateNonce();
  }

  /**
   * Get the auth token request data
   *
   * @param params - The params from the login handler
   * @returns The auth token request data
   */
  abstract getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams;

  /**
   * Get the auth tokens from the auth server
   *
   * @param params - The params from the login handler
   * @param authServerUrl - The url of the auth server
   */
  getAuthTokens(params: HandleFlowParams, authServerUrl: string) {
    const requestData = this.getAuthTokenRequestData(params);

    return retryWithDelay(
      () => getAuthTokens(requestData, this.authServerPath, authServerUrl),
      {
        retries: 3,
        delayMs: [1000, 2000, 3000],
      },
    );
  }

  /**
   * Decode the JWT Token to get the user's information.
   *
   * @param idToken - The JWT Token from the Web3Auth Authentication Server.
   * @returns The user's information from the JWT Token.
   */
  decodeIdToken(idToken: string): string {
    const [, idTokenPayload] = idToken.split('.');
    const base64String = fromBase64UrlSafe(idTokenPayload);
    // Using buffer here instead of atob because userinfo can contain emojis which are not supported by atob
    // the browser replacement for atob is https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
    // which is not supported in all chrome yet
    return bytesToString(toByteArray(base64String));
  }

  /**
   * Validate the state value from the OAuth login redirect URL.
   *
   * @param state - The state value from the OAuth login redirect URL.
   */
  validateState(state: unknown): void {
    if (typeof state !== 'string') {
      throw new OAuthError(
        'state is not a string',
        OAuthErrorType.InvalidOauthStateError,
      );
    }

    const parsedState = JSON.parse(state);

    if (parsedState.nonce !== this.nonce) {
      throw new OAuthError(
        'nonce do not match',
        OAuthErrorType.InvalidOauthStateError,
      );
    }
  }

  /**
   * Generate a nonce value.
   *
   * @returns The nonce value.
   */
  protected generateNonce(): string {
    return QuickCrypto.randomUUID();
  }

  /**
   * Generate a code verifier and challenge value for PKCE flow.
   *
   * @returns The code verifier and challenge value.
   */
  protected generateCodeVerifierChallenge(): {
    codeVerifier: string;
    challenge: string;
  } {
    const codeVerifierBytes = QuickCrypto.randomBytes(32);
    const codeVerifier = toBase64UrlSafe(fromByteArray(codeVerifierBytes));
    const challengeBytes = QuickCrypto.createHash('sha256')
      .update(codeVerifier)
      .digest();
    const challenge = toBase64UrlSafe(fromByteArray(challengeBytes));
    return {
      challenge,
      codeVerifier,
    };
  }
}
