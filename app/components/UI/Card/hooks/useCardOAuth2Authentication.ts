import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAuthRequest,
  ResponseType,
  type DiscoveryDocument,
  Prompt,
} from 'expo-auth-session';
import { useDispatch, useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import {
  DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  getBaanxApiBaseUrl,
} from '../util/mapBaanxApiUrl';
import {
  selectUserCardLocation,
  setIsAuthenticatedCard as setIsAuthenticatedAction,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';
import { BaanxOAuth2Error, BaanxOAuth2ErrorType } from '../types';
import { strings } from '../../../../../locales/i18n';
import { useCardSDK } from '../sdk';
import { generateState } from '../util/pkceHelpers';

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

const OAUTH_REDIRECT_URI_IOS = 'io.metamask.Metamask://card-oauth';
const OAUTH_REDIRECT_URI_ANDROID = 'https://link.metamask.io/card-oauth';

const getOAuthRedirectUri = (): string =>
  Platform.OS === 'ios' ? OAUTH_REDIRECT_URI_IOS : OAUTH_REDIRECT_URI_ANDROID;

const buildDiscoveryDocument = (baseUrl: string): DiscoveryDocument => ({
  authorizationEndpoint: `${baseUrl}/v1/auth/oauth2/authorize`,
});

const USER_FACING_AUTH_ERRORS: Record<string, BaanxOAuth2ErrorType> = {
  access_denied: BaanxOAuth2ErrorType.ACCESS_DENIED,
  temporarily_unavailable: BaanxOAuth2ErrorType.TEMPORARILY_UNAVAILABLE,
  login_required: BaanxOAuth2ErrorType.LOGIN_REQUIRED,
  consent_required: BaanxOAuth2ErrorType.LOGIN_REQUIRED,
  interaction_required: BaanxOAuth2ErrorType.LOGIN_REQUIRED,
  account_selection_required: BaanxOAuth2ErrorType.LOGIN_REQUIRED,
  invalid_grant: BaanxOAuth2ErrorType.SESSION_EXPIRED,
};

const mapOAuthErrorCode = (code: string | undefined): BaanxOAuth2ErrorType => {
  if (!code) {
    return BaanxOAuth2ErrorType.UNKNOWN_ERROR;
  }
  return USER_FACING_AUTH_ERRORS[code] ?? BaanxOAuth2ErrorType.UNKNOWN_ERROR;
};

const getErrorMessage = (errorType: BaanxOAuth2ErrorType): string => {
  switch (errorType) {
    case BaanxOAuth2ErrorType.NETWORK_ERROR:
      return strings('card.card_authentication.errors.network_error');
    case BaanxOAuth2ErrorType.TOKEN_EXCHANGE_FAILED:
    case BaanxOAuth2ErrorType.INVALID_STATE:
      return strings('card.card_authentication.errors.server_error');
    case BaanxOAuth2ErrorType.ACCESS_DENIED:
      return strings('card.card_authentication.errors.access_denied');
    case BaanxOAuth2ErrorType.TEMPORARILY_UNAVAILABLE:
      return strings('card.card_authentication.errors.temporarily_unavailable');
    case BaanxOAuth2ErrorType.LOGIN_REQUIRED:
      return strings('card.card_authentication.errors.login_required');
    case BaanxOAuth2ErrorType.SESSION_EXPIRED:
      return strings('card.card_authentication.errors.session_expired');
    default:
      return strings('card.card_authentication.errors.unknown_error');
  }
};

/**
 * Return type for the useCardOAuth2Authentication hook
 */
export interface UseCardOAuth2AuthenticationReturn {
  login: () => Promise<void>;
  loading: boolean;
  isReady: boolean;
  error: string | null;
  clearError: () => void;
}

const useCardOAuth2Authentication = (): UseCardOAuth2AuthenticationReturn => {
  const dispatch = useDispatch();
  const location = useSelector(selectUserCardLocation);
  const { sdk } = useCardSDK();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientId = process.env.MM_CARD_BAANX_API_CLIENT_KEY ?? '';

  const baanxApiBaseUrl = useMemo(() => getBaanxApiBaseUrl(), []);
  const discovery = useMemo(
    () => buildDiscoveryDocument(baanxApiBaseUrl),
    [baanxApiBaseUrl],
  );

  const redirectUri = getOAuthRedirectUri();
  const state = useMemo(() => generateState(), []);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId,
      responseType: ResponseType.Code,
      redirectUri,
      scopes: OAUTH2_SCOPES,
      usePKCE: true,
      state,
      prompt: Prompt.Consent,
    },
    discovery,
  );

  const isReady = clientId.length > 0 && request !== null;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (): Promise<void> => {
    if (!isReady || !request || !clientId || !sdk) {
      setError(strings('card.card_authentication.errors.configuration_error'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await promptAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      Logger.log('result', JSON.stringify(result, null, 2));

      if (result.type !== 'success') {
        const errorCode =
          result.type === 'error' ? result.error?.code : undefined;
        const errorType = mapOAuthErrorCode(errorCode);

        Logger.error(
          new Error(
            `OAuth2 auth error: code=${errorCode}, description=${result.type === 'error' ? result.error?.description : result.type}`,
          ),
          { tags: { feature: 'card', operation: 'oauth2Login' } },
        );

        setError(getErrorMessage(errorType));
        return;
      }

      if (result.params.state !== request.state) {
        Logger.error(
          new Error(
            `OAuth2 state mismatch: expected=${request.state}, received=${result.params.state}`,
          ),
          { tags: { feature: 'card', operation: 'oauth2Login' } },
        );
        setError(getErrorMessage(BaanxOAuth2ErrorType.INVALID_STATE));
        return;
      }

      const { code } = result.params;
      const codeVerifier = request.codeVerifier;

      if (!code || !codeVerifier) {
        setError(getErrorMessage(BaanxOAuth2ErrorType.UNKNOWN_ERROR));
        return;
      }

      const tokenResponse = await sdk.exchangeOAuth2Code({
        code,
        codeVerifier,
        redirectUri,
        location,
      });

      if (!tokenResponse.accessToken) {
        setError(getErrorMessage(BaanxOAuth2ErrorType.TOKEN_EXCHANGE_FAILED));
        return;
      }

      await storeCardBaanxToken({
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        accessTokenExpiresAt: tokenResponse.expiresIn ?? 600,
        refreshTokenExpiresAt: DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
        location,
      });

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
    sdk,
    promptAsync,
    redirectUri,
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
