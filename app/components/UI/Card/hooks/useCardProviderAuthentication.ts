import { useCallback, useMemo, useState } from 'react';
import Logger from '../../../../util/Logger';
import { uuid4 } from '@sentry/core';
import { useCardSDK } from '../sdk';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import {
  challengeFromVerifier,
  generateCodeVerifier,
} from '../util/generateCodeVerifier';

const useCardProviderAuthentication = (): {
  login: (params: {
    location: 'us' | 'international';
    email: string;
    password: string;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
} => {
  // Generate state once; generating it on every render causes the auth request
  // to be recreated which can trigger loops with useAuthRequest.
  const stateUuid = uuid4();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { sdk, setIsAuthenticated } = useCardSDK();
  const codeVerifier = generateCodeVerifier();

  const login = useCallback(
    async (params: {
      location: 'us' | 'international';
      email: string;
      password: string;
    }): Promise<void> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      const codeChallenge = await challengeFromVerifier(codeVerifier);

      try {
        setLoading(true);
        const initiateResponse = await sdk.initiateCardProviderAuthentication({
          location: params.location,
          state: stateUuid,
          codeChallenge,
        });

        const loginResponse = await sdk.login({
          location: params.location,
          email: params.email,
          password: params.password,
        });

        const authorizeResponse = await sdk.authorize({
          location: params.location,
          initiateAccessToken: initiateResponse.token,
          loginAccessToken: loginResponse.accessToken,
        });

        if (authorizeResponse.state !== stateUuid) {
          throw new Error('Invalid state');
        }

        const exchangeTokenResponse = await sdk.exchangeToken({
          location: params.location,
          code: authorizeResponse.code,
          codeVerifier,
          grantType: 'authorization_code',
        });

        await storeCardBaanxToken({
          accessToken: exchangeTokenResponse.accessToken,
          refreshToken: exchangeTokenResponse.refreshToken,
          expiresAt: Date.now() + exchangeTokenResponse.expiresIn * 1000,
          location: params.location,
        });
        setIsAuthenticated(true);
      } catch (err) {
        Logger.log('BaanxOAuth login: error', err);
        setError('Unknown error during Baanx login');
      } finally {
        setLoading(false);
      }
    },
    [stateUuid, sdk, codeVerifier, setIsAuthenticated],
  );

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
