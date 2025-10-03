import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AuthSessionResult,
  ResponseType,
  useAuthRequest,
} from 'expo-auth-session';
import Logger from '../../../../util/Logger';
import { AppRedirectUri } from '../../../../core/OAuthService/OAuthLoginHandlers/constants';
import { uuid4 } from '@sentry/core';
import { useCardSDK } from '../sdk';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import { DEFAULT_TOKEN_EXPIRATION_TIME } from '../constants';

const useCardProviderAuthentication = (): {
  login: () => Promise<void>;
  loading: boolean;
  error: string | null;
} => {
  // Generate state once; generating it on every render causes the auth request
  // to be recreated which can trigger loops with useAuthRequest.
  const stateRef = useRef<string>();
  if (!stateRef.current) {
    stateRef.current = uuid4();
  }
  const state = stateRef.current;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { sdk, setIsAuthenticated } = useCardSDK();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, __, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Token,
      clientId: 'metamask-mobile',
      redirectUri: AppRedirectUri,
      state,
    },
    {},
  );

  const handleResponse = useCallback(
    async (res: AuthSessionResult) => {
      // Satify typescript
      if (!sdk) return;

      if (res.type === 'success') {
        const extractedToken =
          (res as unknown as { params?: Record<string, string> }).params
            ?.token || '';

        if (extractedToken) {
          const { accessToken, refreshToken } = await sdk.exchangeToken({
            token: extractedToken,
          });
          await storeCardBaanxToken({
            accessToken,
            refreshToken,
            expiresAt: Date.now() + DEFAULT_TOKEN_EXPIRATION_TIME,
          });
          setIsAuthenticated(true);
        }
      }

      if (res.type === 'cancel') {
        setError('User cancelled the login process');
      }

      if (res.type === 'dismiss') {
        setError('User dismissed the login process');
      }

      if (res.type === 'error') {
        setError('Unknown error during Baanx login');
      }
    },
    [sdk, setIsAuthenticated],
  );

  const login = useCallback(async (): Promise<void> => {
    if (!sdk) {
      throw new Error('Card SDK not initialized');
    }

    try {
      setLoading(true);
      const { hostedPageUrl } = await sdk.initiateCardProviderAuthentication({
        redirectUrl: AppRedirectUri,
        state,
      });

      const result = await promptAsync({
        url: hostedPageUrl,
      });
      await handleResponse(result);
    } catch (err) {
      Logger.log('BaanxOAuth login: error', err);
      setError('Unknown error during Baanx login');
    } finally {
      setLoading(false);
    }
  }, [promptAsync, state, sdk, handleResponse]);

  return useMemo(
    () => ({
      login,
      error,
      loading,
    }),
    [login, error, loading],
  );
};

export default useCardProviderAuthentication;
