import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  // makeRedirectUri, // Uncomment when using app's deep link URI
  useAuthRequest,
  exchangeCodeAsync,
  refreshAsync,
  revokeAsync,
  ResponseType,
  TokenResponse,
  TokenTypeHint,
  type DiscoveryDocument,
} from 'expo-auth-session';
// expo-web-browser is a peer dependency of expo-auth-session
// eslint-disable-next-line import/no-extraneous-dependencies, import/namespace
import {
  maybeCompleteAuthSession,
  warmUpAsync,
  coolDownAsync,
} from 'expo-web-browser';
import {
  BaanxOAuth2AuthResult,
  BaanxOAuth2Config,
  BaanxOAuth2Error,
  BaanxOAuth2ErrorType,
  BaanxOAuth2RevokeResponse,
  BaanxOAuth2TokenHint,
  BaanxOAuth2TokenResponse,
  UseBaanxOAuth2DemoReturn,
  UserResponse,
} from '../types';

/**
 * Default OAuth 2.0 configuration for Baanx API (DEV environment)
 * Based on the Baanx OAuth 2.0 Authorization Code Flow with PKCE Testing Guide
 *
 * @remarks
 * - Client ID: MetaMask application identifier for DEV environment
 * - Scopes: Full platform access with offline capability for refresh tokens
 * - Uses S256 PKCE challenge method for security
 */
const DEFAULT_BAANX_OAUTH2_CONFIG: BaanxOAuth2Config = {
  authorizationEndpoint: 'https://dev.api.baanx.com/v1/auth/oauth2/authorize',
  tokenEndpoint: 'https://dev.api.baanx.com/v1/auth/oauth2/token',
  revokeEndpoint: 'https://dev.api.baanx.com/v1/auth/oauth2/revoke',
  userEndpoint: 'https://dev.api.baanx.com/v1/user',
  clientId: '43f2ecb1-8910-45f6-a2a6-61923bbc8156',
  scopes: ['openid', 'profile', 'email', 'platform:full', 'offline_access'],
  codeChallengeMethod: 'S256',
};

/**
 * Pre-whitelisted redirect URI for testing (from Baanx documentation)
 *
 * NOTE: This webhook.site URL is for TESTING ONLY.
 * The OAuth flow will redirect to this URL instead of back to the app.
 * You'll need to manually copy the authorization code from the URL.
 *
 * For production, you'll need to:
 * 1. Get your app's redirect URI whitelisted with Baanx
 * 2. Use makeRedirectUri({ scheme: 'metamask', path: 'oauth-redirect' })
 */
const TESTING_REDIRECT_URI =
  'https://webhook.site/cec64e9f-c2bb-4915-bcd6-537434a5e720';

/**
 * Generate the redirect URI for OAuth callbacks
 *
 * Currently using the testing webhook.site URI from Baanx docs.
 * For production, switch to the app's deep link URI.
 *
 * Production alternative (requires URI to be whitelisted with Baanx):
 * ```ts
 * const getRedirectUri = () => makeRedirectUri({ scheme: 'metamask', path: 'oauth-redirect' });
 * ```
 */
const getRedirectUri = (): string => TESTING_REDIRECT_URI;

/**
 * Create a DiscoveryDocument from our config
 * This is the standard expo-auth-session way to define OAuth endpoints
 */
const createDiscoveryDocument = (
  config: BaanxOAuth2Config,
): DiscoveryDocument => ({
  authorizationEndpoint: config.authorizationEndpoint,
  tokenEndpoint: config.tokenEndpoint,
  revocationEndpoint: config.revokeEndpoint,
  userInfoEndpoint: config.userEndpoint,
});

/**
 * Convert expo-auth-session TokenResponse to our response type
 */
const convertTokenResponse = (
  tokenResponse: TokenResponse,
): BaanxOAuth2TokenResponse => ({
  accessToken: tokenResponse.accessToken,
  expiresIn: tokenResponse.expiresIn ?? 0,
  idToken: tokenResponse.idToken,
  refreshToken: tokenResponse.refreshToken ?? '',
  scope: tokenResponse.scope ?? '',
  tokenType: 'Bearer',
});

/**
 * Map our token hint to expo-auth-session TokenTypeHint
 */
const mapTokenHint = (hint: BaanxOAuth2TokenHint): TokenTypeHint =>
  hint === 'access_token'
    ? TokenTypeHint.AccessToken
    : TokenTypeHint.RefreshToken;

// Web only: Ensures auth popup closes properly
maybeCompleteAuthSession();

/**
 * Demo hook for OAuth 2.0 Authorization Code Flow with PKCE
 *
 * This hook uses Expo's recommended hook-based approach with:
 * - `useAuthRequest` hook for async setup (prevents browser blocking)
 * - `WebBrowser.warmUpAsync()` for faster browser launch on Android
 * - `WebBrowser.maybeCompleteAuthSession()` for proper popup handling
 *
 * ## Testing Mode (Current)
 *
 * Currently using webhook.site redirect URI for testing. The flow is semi-manual:
 * 1. Call `promptAsync()` via the `authorize()` function - opens browser, user logs in
 * 2. Browser redirects to webhook.site (not back to app)
 * 3. Copy the `code` parameter from the webhook.site URL
 * 4. Call `exchangeToken(code, codeVerifier)` with the copied code
 *
 * @example
 * ```tsx
 * const { authorize, request, response, exchangeToken, loading, error } = useBaanxOAuth2Demo();
 *
 * // Handle response when it changes
 * useEffect(() => {
 *   if (response?.type === 'success') {
 *     const { code } = response.params;
 *     // Exchange code for tokens
 *     exchangeToken(code, request?.codeVerifier || '');
 *   }
 * }, [response]);
 *
 * // Start authorization (button must wait for request to be ready)
 * <Button disabled={!request} onPress={authorize} title="Login" />
 * ```
 *
 * @param config - Optional custom OAuth configuration (defaults to DEV environment)
 * @returns OAuth 2.0 operations, request, response, loading state, and error handling
 */
const useBaanxOAuth2Demo = (
  config: BaanxOAuth2Config = DEFAULT_BAANX_OAUTH2_CONFIG,
): UseBaanxOAuth2DemoReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<BaanxOAuth2Error | null>(null);

  // Create discovery document for expo-auth-session
  const discovery = useMemo(() => createDiscoveryDocument(config), [config]);

  // Get redirect URI
  const redirectUri = useMemo(() => getRedirectUri(), []);

  // Android only: Warm up browser for faster launch
  useEffect(() => {
    warmUpAsync();
    return () => {
      coolDownAsync();
    };
  }, []);

  // Use the hook-based approach - this handles async setup properly
  // and prevents mobile browsers from blocking the authentication
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: config.clientId,
      scopes: config.scopes,
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: true,
      extraParams: {
        prompt: 'consent',
      },
    },
    discovery,
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Start the OAuth authorization flow
   *
   * This wraps promptAsync and handles errors.
   * The response will be available via the `response` property.
   *
   * @returns Authorization result
   */
  const authorize = useCallback(async (): Promise<BaanxOAuth2AuthResult> => {
    if (!request) {
      const notReadyError = new BaanxOAuth2Error(
        BaanxOAuth2ErrorType.UNKNOWN_ERROR,
        'Auth request not ready yet. Please wait and try again.',
      );
      setError(notReadyError);
      return {
        success: false,
        error: notReadyError.message,
        errorType: BaanxOAuth2ErrorType.UNKNOWN_ERROR,
      };
    }

    setLoading(true);
    setError(null);

    try {
      // promptAsync opens the browser for authentication
      const result = await promptAsync();

      if (result.type === 'success') {
        return {
          success: true,
          code: result.params.code,
          state: result.params.state,
          codeVerifier: request.codeVerifier,
        };
      }

      if (result.type === 'cancel') {
        const cancelError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.USER_CANCELLED,
          'User cancelled the authorization',
        );
        setError(cancelError);
        return {
          success: false,
          error: cancelError.message,
          errorType: BaanxOAuth2ErrorType.USER_CANCELLED,
        };
      }

      if (result.type === 'dismiss') {
        const dismissError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.USER_DISMISSED,
          'User dismissed the authorization',
        );
        setError(dismissError);
        return {
          success: false,
          error: dismissError.message,
          errorType: BaanxOAuth2ErrorType.USER_DISMISSED,
        };
      }

      // Handle error or other result types
      const authError = new BaanxOAuth2Error(
        BaanxOAuth2ErrorType.UNKNOWN_ERROR,
        result.type === 'error'
          ? result.error?.message || 'Authorization failed'
          : 'Unknown authorization error',
      );
      setError(authError);
      return {
        success: false,
        error: authError.message,
        errorType: BaanxOAuth2ErrorType.UNKNOWN_ERROR,
      };
    } catch (err) {
      const networkError = new BaanxOAuth2Error(
        BaanxOAuth2ErrorType.NETWORK_ERROR,
        err instanceof Error ? err.message : 'Authorization request failed',
        err instanceof Error ? err : undefined,
      );
      setError(networkError);
      return {
        success: false,
        error: networkError.message,
        errorType: BaanxOAuth2ErrorType.NETWORK_ERROR,
      };
    } finally {
      setLoading(false);
    }
  }, [request, promptAsync]);

  /**
   * Step 4: Exchange authorization code for tokens
   *
   * Uses expo-auth-session's built-in exchangeCodeAsync for RFC 6749 compliance.
   * See: https://tools.ietf.org/html/rfc6749#section-4.1.3
   *
   * @param code - Authorization code from the authorize step
   * @param codeVerifier - PKCE code verifier from the authorize step
   * @returns Token response with access_token, refresh_token, etc.
   */
  const exchangeToken = useCallback(
    async (
      code: string,
      codeVerifier: string,
    ): Promise<BaanxOAuth2TokenResponse> => {
      setLoading(true);
      setError(null);

      try {
        // Use expo-auth-session's built-in token exchange
        // This handles the OAuth 2.0 token request per RFC 6749 Section 4.1.3
        const tokenResponse = await exchangeCodeAsync(
          {
            clientId: config.clientId,
            code,
            redirectUri,
            extraParams: {
              code_verifier: codeVerifier,
            },
          },
          discovery,
        );

        return convertTokenResponse(tokenResponse);
      } catch (err) {
        const tokenError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.TOKEN_EXCHANGE_FAILED,
          err instanceof Error ? err.message : 'Token exchange failed',
          err instanceof Error ? err : undefined,
        );
        setError(tokenError);
        throw tokenError;
      } finally {
        setLoading(false);
      }
    },
    [config.clientId, redirectUri, discovery],
  );

  /**
   * Refresh access token using a refresh token
   *
   * Uses expo-auth-session's built-in refreshAsync for RFC 6749 compliance.
   * See: https://tools.ietf.org/html/rfc6749#section-6
   *
   * @param refreshTokenValue - The refresh token to use
   * @returns New token response with fresh access_token
   */
  const refreshToken = useCallback(
    async (refreshTokenValue: string): Promise<BaanxOAuth2TokenResponse> => {
      setLoading(true);
      setError(null);

      try {
        // Use expo-auth-session's built-in token refresh
        // This handles the OAuth 2.0 refresh request per RFC 6749 Section 6
        const tokenResponse = await refreshAsync(
          {
            clientId: config.clientId,
            refreshToken: refreshTokenValue,
          },
          discovery,
        );

        return convertTokenResponse(tokenResponse);
      } catch (err) {
        const refreshError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.TOKEN_REFRESH_FAILED,
          err instanceof Error ? err.message : 'Token refresh failed',
          err instanceof Error ? err : undefined,
        );
        setError(refreshError);
        throw refreshError;
      } finally {
        setLoading(false);
      }
    },
    [config.clientId, discovery],
  );

  /**
   * Revoke a token (access or refresh)
   *
   * Uses expo-auth-session's built-in revokeAsync for RFC 7009 compliance.
   * See: https://tools.ietf.org/html/rfc7009#section-2.1
   *
   * @param token - The token to revoke
   * @param tokenHint - Type of token ('access_token' or 'refresh_token')
   * @returns Revocation result
   */
  const revokeToken = useCallback(
    async (
      token: string,
      tokenHint: BaanxOAuth2TokenHint,
    ): Promise<BaanxOAuth2RevokeResponse> => {
      setLoading(true);
      setError(null);

      try {
        // Use expo-auth-session's built-in token revocation
        // This handles the OAuth 2.0 revocation request per RFC 7009 Section 2.1
        const success = await revokeAsync(
          {
            clientId: config.clientId,
            token,
            tokenTypeHint: mapTokenHint(tokenHint),
          },
          discovery,
        );

        return { success };
      } catch (err) {
        const revokeError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.TOKEN_REVOKE_FAILED,
          err instanceof Error ? err.message : 'Token revocation failed',
          err instanceof Error ? err : undefined,
        );
        setError(revokeError);
        throw revokeError;
      } finally {
        setLoading(false);
      }
    },
    [config.clientId, discovery],
  );

  /**
   * Validate an access token by fetching user info
   *
   * @param accessToken - The access token to validate
   * @returns User information if token is valid
   */
  const validateToken = useCallback(
    async (accessToken: string): Promise<UserResponse> => {
      setLoading(true);
      setError(null);

      try {
        const userInfoResponse = await fetch(config.userEndpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'x-client-key': config.clientId,
          },
        });

        if (!userInfoResponse.ok) {
          const errorBody = await userInfoResponse.text();
          throw new Error(
            `Token validation failed: ${userInfoResponse.status} - ${errorBody}`,
          );
        }

        return (await userInfoResponse.json()) as UserResponse;
      } catch (err) {
        const validationError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.UNKNOWN_ERROR,
          err instanceof Error ? err.message : 'Token validation failed',
          err instanceof Error ? err : undefined,
        );
        setError(validationError);
        throw validationError;
      } finally {
        setLoading(false);
      }
    },
    [config.userEndpoint, config.clientId],
  );

  return useMemo(
    () => ({
      // Auth request state from useAuthRequest hook
      request,
      response,
      // Actions
      authorize,
      exchangeToken,
      refreshToken,
      revokeToken,
      validateToken,
      // State
      loading,
      error,
      clearError,
    }),
    [
      request,
      response,
      authorize,
      exchangeToken,
      refreshToken,
      revokeToken,
      validateToken,
      loading,
      error,
      clearError,
    ],
  );
};

export default useBaanxOAuth2Demo;

/**
 * Export the default configuration for testing and documentation purposes
 */
export { DEFAULT_BAANX_OAUTH2_CONFIG };
