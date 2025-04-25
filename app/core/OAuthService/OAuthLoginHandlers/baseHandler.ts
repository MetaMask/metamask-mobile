import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';
import {
  AuthConnection,
  AuthResponse,
  HandleFlowParams,
  LoginHandlerCodeResult,
  LoginHandlerIdTokenResult,
  LoginHandlerResult,
} from '../OAuthInterface';
import { OAuthError, OAuthErrorType } from '../error';

/**
 * Pads a string to a length of 4 characters
 *
 * @param input - The base64 encoded string to pad
 * @returns The padded string
 */
function padBase64String(input: string) {
  const segmentLength = 4;
  const stringLength = input.length;
  const diff = stringLength % segmentLength;
  if (!diff) {
    return input;
  }
  let position = stringLength;
  let padLength = segmentLength - diff;
  const paddedStringLength = stringLength + padLength;
  const buffer = Buffer.alloc(paddedStringLength);
  buffer.write(input);
  while (padLength > 0) {
    buffer.write('=', position);
    position += 1;
    padLength -= 1;
  }
  return buffer.toString();
}

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
  params: HandleFlowParams,
  pathname: string,
  authServerUrl: string,
): Promise<AuthResponse> {
  const {
    authConnection,
    clientId,
    redirectUri,
    codeVerifier,
    web3AuthNetwork,
  } = params;

  // Type guard to check if params has a code property
  const hasCode = (
    p: HandleFlowParams,
  ): p is LoginHandlerCodeResult & { web3AuthNetwork: Web3AuthNetwork } =>
    'code' in p;

  // Type guard to check if params has an idToken property
  const hasIdToken = (
    p: HandleFlowParams,
  ): p is LoginHandlerIdTokenResult & { web3AuthNetwork: Web3AuthNetwork } =>
    'idToken' in p;

  const code = hasCode(params) ? params.code : undefined;
  const idToken = hasIdToken(params) ? params.idToken : undefined;

  const body = {
    code,
    id_token: idToken,
    client_id: clientId,
    login_provider: authConnection,
    network: web3AuthNetwork,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  const res = await fetch(`${authServerUrl}/${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 200) {
    const data = (await res.json()) as AuthResponse;
    return data;
  }

  throw new OAuthError(
     `AuthServer Error, request failed with status: [${res.status}]: ${await res.text()}`,
    OAuthErrorType.AuthServerError,
  );
}

/**
 * Base class for the login handlers
 */
export abstract class BaseLoginHandler {
  public nonce: string;

  abstract get authConnection(): AuthConnection;

  abstract get scope(): string[];

  abstract get authServerPath(): string;

  abstract login(): Promise<LoginHandlerResult | undefined>;

  constructor() {
    this.nonce = this.#generateNonce();
  }

  /**
   * Get the auth tokens from the auth server
   *
   * @param params - The params from the login handler
   * @param authServerUrl - The url of the auth server
   */
  getAuthTokens(params: HandleFlowParams, authServerUrl: string) {
    return getAuthTokens(params, this.authServerPath, authServerUrl);
  }

  /**
   * Decode the JWT Token to get the user's information.
   *
   * @param idToken - The JWT Token from the Web3Auth Authentication Server.
   * @returns The user's information from the JWT Token.
   */
  decodeIdToken(idToken: string): string {
    const [, idTokenPayload] = idToken.split('.');
    const base64String = padBase64String(idTokenPayload)
      .replace(/-/u, '+')
      .replace(/_/u, '/');
    // Using buffer here instead of atob because userinfo can contain emojis which are not supported by atob
    // the browser replacement for atob is https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
    // which is not supported in all chrome yet
    return Buffer.from(base64String, 'base64').toString('utf-8');
  }

  #generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
