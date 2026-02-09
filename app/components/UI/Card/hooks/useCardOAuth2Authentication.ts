import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAuthRequest,
  exchangeCodeAsync,
  ResponseType,
  type DiscoveryDocument,
  type AuthRequestPromptOptions,
} from 'expo-auth-session';
// expo-web-browser is a peer dependency of expo-auth-session
// eslint-disable-next-line import/no-extraneous-dependencies, import/namespace
import {
  maybeCompleteAuthSession,
  warmUpAsync,
  coolDownAsync,
} from 'expo-web-browser';
import { useDispatch, useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import { fetchCardOAuthConfig } from '../util/fetchCardOAuthConfig';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import {
  selectUserCardLocation,
  setIsAuthenticatedCard as setIsAuthenticatedAction,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';
import { BaanxOAuth2Error, BaanxOAuth2ErrorType } from '../types';
import { strings } from '../../../../../locales/i18n';

// Web only: Ensures auth popup closes properly
maybeCompleteAuthSession();

/**
 * Default OAuth 2.0 scopes for Baanx API
 */
const OAUTH2_SCOPES = [
  'openid',
  'profile',
  'email',
  'platform:full',
  'offline_access',
];

/**
 * Default refresh token expiration in seconds when not provided by the server.
 * Baanx DEV uses 20 minutes, production may differ.
 */
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 20 * 60;

/**
 * Universal link redirect URI for the OAuth2 authorization flow.
 * This URL is whitelisted with Baanx and registered in the app's
 * DeeplinkManager as a no-op so it doesn't interfere with
 * expo-auth-session's Linking listener.
 */
const OAUTH_REDIRECT_URI = 'https://link.metamask.io/card-oauth';

/**
 * Resolve the Baanx API base URL from environment
 */
const getBaanxApiBaseUrl = (): string =>
  process.env.BAANX_API_URL ||
  getDefaultBaanxApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);

/**
 * Build the OAuth2 discovery document from the Baanx API base URL
 */
const buildDiscoveryDocument = (baseUrl: string): DiscoveryDocument => ({
  authorizationEndpoint: `${baseUrl}/v1/auth/oauth2/authorize`,
  tokenEndpoint: `${baseUrl}/v1/auth/oauth2/token`,
  revocationEndpoint: `${baseUrl}/v1/auth/oauth2/revoke`,
  userInfoEndpoint: `${baseUrl}/v1/user`,
});

/**
 * Maps error types to user-friendly localized error messages
 */
const getErrorMessage = (errorType: BaanxOAuth2ErrorType): string => {
  switch (errorType) {
    case BaanxOAuth2ErrorType.USER_CANCELLED:
    case BaanxOAuth2ErrorType.USER_DISMISSED:
      return strings('card.card_authentication.errors.auth_cancelled');
    case BaanxOAuth2ErrorType.NETWORK_ERROR:
      return strings('card.card_authentication.errors.network_error');
    case BaanxOAuth2ErrorType.TOKEN_EXCHANGE_FAILED:
      return strings('card.card_authentication.errors.server_error');
    default:
      return strings('card.card_authentication.errors.unknown_error');
  }
};

/**
 * Return type for the useCardOAuth2Authentication hook
 */
export interface UseCardOAuth2AuthenticationReturn {
  /** Start the OAuth2 authorization flow */
  login: () => Promise<void>;
  /** Whether an OAuth operation is in progress */
  loading: boolean;
  /** Whether the auth request is ready to be prompted */
  isReady: boolean;
  /** Current user-facing error message, if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
}

/**
 * Hook for Card authentication using OAuth 2.0 Authorization Code Flow with PKCE.
 *
 * This replaces the native email/password login flow with a browser-based OAuth flow.
 * The flow:
 * 1. Fetches the Baanx Client ID from the Card API configuration endpoint
 * 2. Opens a system browser for the user to authenticate with Baanx
 * 3. Exchanges the authorization code for access and refresh tokens
 * 4. Stores tokens in SecureKeychain
 * 5. Updates Redux auth state
 *
 * @returns OAuth 2.0 login function, loading state, and error handling
 */
const useCardOAuth2Authentication = (): UseCardOAuth2AuthenticationReturn => {
  const dispatch = useDispatch();
  const location = useSelector(selectUserCardLocation);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Resolve Baanx API base URL and build discovery document
  const baanxApiBaseUrl = useMemo(() => getBaanxApiBaseUrl(), []);
  const discovery = useMemo(
    () => buildDiscoveryDocument(baanxApiBaseUrl),
    [baanxApiBaseUrl],
  );

  const redirectUri = OAUTH_REDIRECT_URI;

  // Fetch the Client ID from Card API on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchCardOAuthConfig();
        setClientId(config.baanxClientId);
      } catch (err) {
        Logger.error(err as Error, {
          tags: { feature: 'card', operation: 'loadOAuthConfig' },
        });
        setError(
          strings('card.card_authentication.errors.configuration_error'),
        );
      }
    };
    loadConfig();
  }, []);

  // Android only: Warm up browser for faster launch
  useEffect(() => {
    warmUpAsync();
    return () => {
      coolDownAsync();
    };
  }, []);

  // useAuthRequest requires a static clientId. When clientId is null (not loaded yet),
  // we pass a placeholder and disable the request until it's ready.
  const [request, , promptAsync] = useAuthRequest(
    clientId
      ? {
          clientId,
          scopes: OAUTH2_SCOPES,
          redirectUri,
          responseType: ResponseType.Code,
          usePKCE: true,
        }
      : {
          clientId: 'loading',
          scopes: OAUTH2_SCOPES,
          redirectUri,
          responseType: ResponseType.Code,
          usePKCE: true,
        },
    clientId ? discovery : null,
  );

  const isReady = clientId !== null && request !== null;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Start the full OAuth2 login flow:
   * 1. Open browser for authorization
   * 2. Exchange code for tokens
   * 3. Store tokens
   * 4. Update Redux state
   */
  const login = useCallback(async (): Promise<void> => {
    if (!isReady || !request || !clientId) {
      setError(strings('card.card_authentication.errors.configuration_error'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Open browser for authorization
      Logger.log('[CardOAuth2] Starting authorization...');
      const result = await promptAsync({
        // iOS: Use ephemeral session to avoid cookie issues
        // with Baanx cross-subdomain session handling
        preferEphemeralSession: true,
      } as AuthRequestPromptOptions & { preferEphemeralSession?: boolean });

      Logger.log('[CardOAuth2] Authorization result type:', result.type);

      if (result.type === 'cancel') {
        const cancelError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.USER_CANCELLED,
          'User cancelled the authorization',
        );
        setError(getErrorMessage(cancelError.type));
        return;
      }

      if (result.type === 'dismiss') {
        const dismissError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.USER_DISMISSED,
          'User dismissed the authorization',
        );
        setError(getErrorMessage(dismissError.type));
        return;
      }

      if (result.type !== 'success') {
        const authError = new BaanxOAuth2Error(
          BaanxOAuth2ErrorType.UNKNOWN_ERROR,
          result.type === 'error'
            ? result.error?.message || 'Authorization failed'
            : 'Unknown authorization error',
        );
        setError(getErrorMessage(authError.type));
        return;
      }

      const { code } = result.params;
      const codeVerifier = request.codeVerifier;

      if (!code || !codeVerifier) {
        setError(getErrorMessage(BaanxOAuth2ErrorType.UNKNOWN_ERROR));
        return;
      }

      // Step 2: Exchange authorization code for tokens
      Logger.log('[CardOAuth2] Exchanging code for tokens...');
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: codeVerifier,
          },
        },
        discovery,
      );

      Logger.log('[CardOAuth2] Token exchange successful');

      if (!tokenResponse.accessToken) {
        setError(getErrorMessage(BaanxOAuth2ErrorType.TOKEN_EXCHANGE_FAILED));
        return;
      }

      // Step 3: Store tokens in SecureKeychain
      // Baanx OAuth2 may not include refresh_token_expires_in in the
      // standard response. expo-auth-session only exposes standard fields,
      // so we use a default expiration for the refresh token.
      const refreshTokenExpiresIn = DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS;

      await storeCardBaanxToken({
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        accessTokenExpiresAt: tokenResponse.expiresIn ?? 600,
        refreshTokenExpiresAt: refreshTokenExpiresIn as number,
        location,
      });

      Logger.log('[CardOAuth2] Tokens stored successfully');

      // Step 4: Update Redux auth state
      dispatch(setIsAuthenticatedAction(true));
      dispatch(setUserCardLocation(location));

      setError(null);
    } catch (err) {
      Logger.error(err as Error, {
        tags: { feature: 'card', operation: 'oauth2Login' },
      });

      if (err instanceof BaanxOAuth2Error) {
        setError(getErrorMessage(err.type));
      } else {
        setError(getErrorMessage(BaanxOAuth2ErrorType.NETWORK_ERROR));
      }
    } finally {
      setLoading(false);
    }
  }, [
    isReady,
    request,
    clientId,
    promptAsync,
    redirectUri,
    discovery,
    location,
    dispatch,
  ]);

  return useMemo(
    () => ({
      login,
      loading,
      isReady,
      error,
      clearError,
    }),
    [login, loading, isReady, error, clearError],
  );
};

export default useCardOAuth2Authentication;
