import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAuthRequest,
  ResponseType,
  type DiscoveryDocument,
  Prompt,
} from 'expo-auth-session';
import Logger from '../../../../util/Logger';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import { strings } from '../../../../../locales/i18n';
import { generateState } from '../util/pkceHelpers';
import { getCardOAuth2UiErrorMessage } from '../util/getCardOAuth2UiErrorMessage';
import {
  CardProviderError,
  type CardAuthResult,
  type CardCredentials,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

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

export interface UseCardOAuth2AuthenticationOptions {
  /** When true, adds `region=us` to the authorize request per Baanx spec. */
  isUsRegion: boolean;
  /** Typically `submit.mutateAsync` from `useCardAuth` so React Query `onSuccess` runs. */
  submitCredentials: (credentials: CardCredentials) => Promise<CardAuthResult>;
}

export interface UseCardOAuth2AuthenticationReturn {
  login: () => Promise<CardAuthResult | null>;
  loading: boolean;
  isReady: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCardOAuth2Authentication(
  options: UseCardOAuth2AuthenticationOptions,
): UseCardOAuth2AuthenticationReturn {
  const { isUsRegion, submitCredentials } = options;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clientId = process.env.MM_CARD_BAANX_API_CLIENT_KEY ?? '';
  const baanxApiBaseUrl = useMemo(() => {
    if (process.env.BAANX_API_URL) {
      return process.env.BAANX_API_URL;
    }
    return getDefaultBaanxApiBaseUrlForMetaMaskEnv(
      process.env.METAMASK_ENVIRONMENT,
    );
  }, []);
  const discovery = useMemo(
    () => buildDiscoveryDocument(baanxApiBaseUrl),
    [baanxApiBaseUrl],
  );

  const redirectUri = getOAuthRedirectUri();
  const state = useMemo(() => generateState(), []);

  const extraParams = useMemo(
    (): Record<string, string> | undefined =>
      isUsRegion ? { region: 'us' } : undefined,
    [isUsRegion],
  );

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId,
      responseType: ResponseType.Code,
      redirectUri,
      scopes: OAUTH2_SCOPES,
      usePKCE: true,
      state,
      prompt: Prompt.Consent,
      extraParams,
    },
    discovery,
  );

  const isReady = clientId.length > 0 && request !== null;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (): Promise<CardAuthResult | null> => {
    if (!isReady || !request || !clientId) {
      setError(strings('card.card_authentication.errors.configuration_error'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await promptAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return null;
      }

      if (result.type === 'error') {
        const oauthErrorCode =
          result.error?.params?.error ?? result.params.error ?? undefined;
        setError(getCardOAuth2UiErrorMessage(oauthErrorCode));
        return null;
      }

      if (result.type !== 'success') {
        Logger.error(new Error(`OAuth2 auth result: ${result.type}`), {
          tags: { feature: 'card', operation: 'oauth2Login' },
        });
        setError(strings('card.card_authentication.errors.unknown_error'));
        return null;
      }

      if (result.params.error) {
        setError(getCardOAuth2UiErrorMessage(result.params.error));
        return null;
      }

      if (result.params.state !== request.state) {
        Logger.error(
          new Error(
            `OAuth2 state mismatch: expected=${request.state}, received=${result.params.state}`,
          ),
          { tags: { feature: 'card', operation: 'oauth2Login' } },
        );
        setError(strings('card.card_authentication.errors.server_error'));
        return null;
      }

      const { code } = result.params;
      const codeVerifier = request.codeVerifier;

      if (!code || !codeVerifier) {
        setError(strings('card.card_authentication.errors.unknown_error'));
        return null;
      }

      const authResult = await submitCredentials({
        type: 'oauth2',
        code,
        codeVerifier,
        redirectUri,
      });

      setError(null);
      return authResult;
    } catch (err) {
      if (err instanceof CardProviderError) {
        throw err;
      }
      Logger.error(err as Error, {
        tags: { feature: 'card', operation: 'oauth2Login' },
      });
      setError(strings('card.card_authentication.errors.network_error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [isReady, request, clientId, promptAsync, redirectUri, submitCredentials]);

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
}

export default useCardOAuth2Authentication;
