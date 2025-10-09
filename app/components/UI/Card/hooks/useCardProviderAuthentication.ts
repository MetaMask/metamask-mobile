import { useCallback, useMemo, useState } from 'react';
import { useCardSDK } from '../sdk';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import { generatePKCEPair, generateState } from '../util/pkceHelpers';
import { CardError, CardErrorType, CardLocation } from '../types';
import { strings } from '../../../../../locales/i18n';

/**
 * Maps CardError types to user-friendly localized error messages
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof CardError) {
    switch (error.type) {
      case CardErrorType.INVALID_CREDENTIALS:
        return strings('card.card_authentication.errors.invalid_credentials');
      case CardErrorType.NETWORK_ERROR:
        return strings('card.card_authentication.errors.network_error');
      case CardErrorType.TIMEOUT_ERROR:
        return strings('card.card_authentication.errors.timeout_error');
      case CardErrorType.API_KEY_MISSING:
        return strings('card.card_authentication.errors.configuration_error');
      case CardErrorType.VALIDATION_ERROR:
        return error.message; // Use specific validation message
      case CardErrorType.SERVER_ERROR:
        return strings('card.card_authentication.errors.server_error');
      case CardErrorType.UNKNOWN_ERROR:
      default:
        return strings('card.card_authentication.errors.unknown_error');
    }
  }

  // Fallback for non-CardError instances
  return strings('card.card_authentication.errors.unknown_error');
};

const useCardProviderAuthentication = (): {
  login: (params: {
    location: CardLocation;
    email: string;
    password: string;
  }) => Promise<void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
} => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { sdk, setIsAuthenticated } = useCardSDK();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(
    async (params: {
      location: CardLocation;
      email: string;
      password: string;
    }): Promise<void> => {
      if (!sdk) {
        throw new Error('Card SDK not initialized');
      }

      const state = generateState();
      const { codeVerifier, codeChallenge } = await generatePKCEPair();

      try {
        setLoading(true);
        const initiateResponse = await sdk.initiateCardProviderAuthentication({
          location: params.location,
          state,
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

        if (authorizeResponse.state !== state) {
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

        setError(null);
        setIsAuthenticated(true);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sdk, setIsAuthenticated],
  );

  return useMemo(
    () => ({
      login,
      error,
      loading,
      clearError,
    }),
    [login, error, loading, clearError],
  );
};

export default useCardProviderAuthentication;
