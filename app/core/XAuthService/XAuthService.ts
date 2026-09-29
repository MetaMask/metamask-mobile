import {
  AuthRequest,
  CodeChallengeMethod,
  ResponseType,
  exchangeCodeAsync,
  type AuthSessionResult,
  type TokenResponse,
} from 'expo-auth-session';
import { XAuthError, XAuthErrorType } from './XAuthError';
import {
  X_AUTHORIZATION_ENDPOINT,
  X_TOKEN_ENDPOINT,
  X_REDIRECT_URI,
  X_OAUTH_SCOPES,
  getXClientId,
} from './XAuthConfig';
import { setTokens } from './XTokenStorage';
import type { XTokens } from './types';

/**
 * Initiates the X (Twitter) OAuth 2.0 Authorization Code + PKCE flow,
 * opens the system browser for the user to authorize, exchanges the
 * returned code for tokens, and stores them. X issues authorization
 * codes with a 30-second expiry, so the exchange happens immediately
 * after promptAsync resolves — no intermediate steps.
 *
 * X's OAuth app is registered as a "Native App" (public client), so no
 * client_secret exists or is needed for this exchange.
 */
export async function connectX(): Promise<XTokens> {
  const clientId = getXClientId();

  const authRequest = new AuthRequest({
    clientId,
    redirectUri: X_REDIRECT_URI,
    scopes: X_OAUTH_SCOPES,
    responseType: ResponseType.Code,
    codeChallengeMethod: CodeChallengeMethod.S256,
    usePKCE: true,
  });

  let result: AuthSessionResult;
  try {
    result = await authRequest.promptAsync(
      { authorizationEndpoint: X_AUTHORIZATION_ENDPOINT },
      { preferUniversalLinks: true },
    );
  } catch (error) {
    throw new XAuthError(
      XAuthErrorType.NetworkFailure,
      `Failed to open X authorization session: ${(error as Error).message}`,
    );
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new XAuthError(
      XAuthErrorType.UserCancelled,
      'User cancelled the X authorization process',
    );
  }

  if (result.type === 'error' && result.error?.code === 'state_mismatch') {
    throw new XAuthError(
      XAuthErrorType.StateMismatch,
      'X authorization state mismatch — the returned state did not match the sent state',
    );
  }

  if (result.type !== 'success') {
    throw new XAuthError(
      XAuthErrorType.TokenExchangeFailed,
      `X authorization did not succeed: ${result.type}`,
    );
  }

  let tokenResponse: TokenResponse;
  try {
    tokenResponse = await exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri: X_REDIRECT_URI,
        extraParams: { code_verifier: authRequest.codeVerifier ?? '' },
      },
      { tokenEndpoint: X_TOKEN_ENDPOINT },
    );
  } catch (error) {
    throw new XAuthError(
      XAuthErrorType.TokenExchangeFailed,
      `Failed to exchange X authorization code: ${(error as Error).message}`,
    );
  }

  if (!tokenResponse.refreshToken) {
    throw new XAuthError(
      XAuthErrorType.TokenExchangeFailed,
      'X token response did not include a refresh token — check that the offline.access scope was granted',
    );
  }

  const tokens: XTokens = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresAt:
      tokenResponse.issuedAt * 1000 + (tokenResponse.expiresIn ?? 0) * 1000,
  };

  await setTokens(tokens);

  return tokens;
}
