import { getAuthTokens } from '.';
import {
  AuthConnection,
  HandleFlowParams,
  LoginHandlerResult,
} from '../Oauth2loginInterface';

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

export abstract class BaseLoginHandler {
  public nonce: string;

  abstract get authConnection(): AuthConnection;

  abstract get scope(): string[];

  abstract get authServerPath(): string;

  abstract login(): Promise<LoginHandlerResult | undefined>;

  constructor() {
    this.nonce = this.generateNonce();
  }

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

  generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
