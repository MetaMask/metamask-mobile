import {
  AuthRequest,
  CodeChallengeMethod,
  ResponseType,
  exchangeCodeAsync,
  refreshAsync,
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
import { setTokens, getTokens, clearTokens } from './XTokenStorage';
import type { XTokens } from './types';
import Logger from '../../util/Logger';

/**
 * Flow logging for developer debugging in Metro/console output
 * (console.log in __DEV__, Sentry breadcrumb in production for opted-in
 * users). SECURITY: never log tokens, authorization codes, verifiers,
 * state values, raw URLs/params/responses, or the client_id value —
 * metadata only (step names, result types, OAuth error codes, booleans,
 * numbers, scopes, redirect URI, endpoints).
 */
const log = (
  message: string,
  data?: Record<string, string | number | boolean | undefined>,
) => Logger.log(`[XAuth] ${message}`, data ?? '');

/**
 * Safe metadata for logging caught errors: the error class name and, for
 * XAuthError, its OAuth error type. Never the full message — token
 * endpoint error_description values can echo server-provided text.
 */
function logErrorMetadata(
  error: unknown,
): Record<string, string | number | boolean | undefined> {
  return {
    errorName: error instanceof Error ? error.name : 'unknown',
    errorType: error instanceof XAuthError ? error.type : undefined,
  };
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 * Non-Error rejections (strings, plain objects) would otherwise render
 * as "undefined" when interpolated via `(error as Error).message`.
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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
  log('connectX: start', {
    redirectUri: X_REDIRECT_URI,
    scopes: X_OAUTH_SCOPES.join(' '),
  });
  const clientId = getXClientId();
  log('connectX: client id resolved', { hasClientId: Boolean(clientId) });

  const authRequest = new AuthRequest({
    clientId,
    redirectUri: X_REDIRECT_URI,
    scopes: X_OAUTH_SCOPES,
    responseType: ResponseType.Code,
    codeChallengeMethod: CodeChallengeMethod.S256,
    usePKCE: true,
  });

  log('connectX: opening authorization session');
  let result: AuthSessionResult;
  try {
    result = await authRequest.promptAsync(
      { authorizationEndpoint: X_AUTHORIZATION_ENDPOINT },
      { preferUniversalLinks: true },
    );
  } catch (error) {
    log('connectX: promptAsync rejected', logErrorMetadata(error));
    throw new XAuthError(
      XAuthErrorType.NetworkFailure,
      `Failed to open X authorization session: ${getErrorMessage(error)}`,
    );
  }

  log('connectX: promptAsync resolved', {
    resultType: result.type,
    errorCode: result.type === 'error' ? result.error?.code : undefined,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    log('connectX: user cancelled or dismissed the authorization session', {
      resultType: result.type,
    });
    throw new XAuthError(
      XAuthErrorType.UserCancelled,
      'User cancelled the X authorization process',
    );
  }

  if (result.type === 'error' && result.error?.code === 'state_mismatch') {
    log('connectX: state mismatch', { errorCode: result.error.code });
    throw new XAuthError(
      XAuthErrorType.StateMismatch,
      'X authorization state mismatch — the returned state did not match the sent state',
    );
  }

  if (result.type === 'error' && result.error?.code === 'access_denied') {
    log('connectX: user denied consent', { errorCode: result.error.code });
    throw new XAuthError(
      XAuthErrorType.UserCancelled,
      'User denied the X authorization request',
    );
  }

  if (result.type !== 'success') {
    const code = result.type === 'error' ? result.error?.code : undefined;
    log('connectX: authorization did not succeed', {
      resultType: result.type,
      errorCode: code,
    });
    throw new XAuthError(
      XAuthErrorType.TokenExchangeFailed,
      `X authorization did not succeed: ${result.type}${code ? ` (${code})` : ''}`,
    );
  }

  log('connectX: exchanging authorization code');
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
    log('connectX: code exchange failed', logErrorMetadata(error));
    throw new XAuthError(
      XAuthErrorType.TokenExchangeFailed,
      `Failed to exchange X authorization code: ${getErrorMessage(error)}`,
    );
  }

  log('connectX: code exchange succeeded', {
    hasRefreshToken: Boolean(tokenResponse.refreshToken),
    expiresIn: tokenResponse.expiresIn,
  });

  if (!tokenResponse.refreshToken) {
    log('connectX: token response missing refresh token', {
      hasRefreshToken: false,
    });
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
  log('connectX: tokens stored', { expiresAt: tokens.expiresAt });

  log('connectX: done', { expiresAt: tokens.expiresAt });
  return tokens;
}

/**
 * Refreshes the access token using the stored refresh token. X rotates
 * refresh tokens on every refresh — if the response includes a new
 * refresh_token, it MUST overwrite the stored one, since X invalidates
 * the old one immediately after rotation. If the response omits it, the
 * existing stored refresh token remains valid and is kept.
 */
export async function refreshXToken(): Promise<XTokens> {
  log('refreshXToken: start');
  const stored = await getTokens();
  if (!stored) {
    log('refreshXToken: no stored tokens');
    throw new XAuthError(
      XAuthErrorType.NoStoredTokens,
      'No stored X tokens to refresh',
    );
  }

  log('refreshXToken: refreshing', { hasStoredTokens: true });
  const clientId = getXClientId();

  let tokenResponse: TokenResponse;
  try {
    tokenResponse = await refreshAsync(
      { clientId, refreshToken: stored.refreshToken },
      { tokenEndpoint: X_TOKEN_ENDPOINT },
    );
  } catch (error) {
    log('refreshXToken: refresh failed', logErrorMetadata(error));
    throw new XAuthError(
      XAuthErrorType.TokenExchangeFailed,
      `Failed to refresh X token: ${getErrorMessage(error)}`,
    );
  }

  log('refreshXToken: refresh succeeded', {
    refreshTokenRotated: Boolean(tokenResponse.refreshToken),
    expiresIn: tokenResponse.expiresIn,
  });

  const tokens: XTokens = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken ?? stored.refreshToken,
    expiresAt:
      tokenResponse.issuedAt * 1000 + (tokenResponse.expiresIn ?? 0) * 1000,
  };

  await setTokens(tokens);
  log('refreshXToken: tokens stored', { expiresAt: tokens.expiresAt });

  return tokens;
}

/**
 * Clears the locally stored X tokens. Does not call any X revocation
 * endpoint — local clear only (server-side revocation is out of scope).
 */
export async function disconnectX(): Promise<void> {
  log('disconnectX: start');
  await clearTokens();
  log('disconnectX: tokens cleared');
}

/**
 * Returns whether X OAuth tokens are stored locally. Used to decide
 * whether the UI should offer connecting X or show a connected state.
 * A failed keychain read (e.g. corrupt stored JSON) is treated as
 * "not connected" rather than propagating the error.
 */
export async function isXConnected(): Promise<boolean> {
  try {
    const tokens = await getTokens();
    log('isXConnected: result', { connected: tokens !== null });
    return tokens !== null;
  } catch {
    log('isXConnected: token read failed', { connected: false });
    return false;
  }
}
