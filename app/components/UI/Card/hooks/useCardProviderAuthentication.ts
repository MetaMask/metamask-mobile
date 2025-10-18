import { useCallback, useMemo, useState } from 'react';
import { useCardSDK } from '../sdk';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import { generatePKCEPair, generateState } from '../util/pkceHelpers';
import { CardError, CardErrorType, CardLocation } from '../types';
import { strings } from '../../../../../locales/i18n';
import { useDispatch } from 'react-redux';
import {
  setIsAuthenticatedCard as setIsAuthenticatedAction,
  setUserCardLocation,
} from '../../../../core/redux/slices/card';

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
        return strings(
          'card.card_authentication.errors.invalid_email_or_password',
        );
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
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { sdk } = useCardSDK();

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
          state,
          codeChallenge,
        });

        const loginResponse = await sdk.login({
          email: params.email,
          password: params.password,
        });

        const authorizeResponse = await sdk.authorize({
          initiateAccessToken: initiateResponse.token,
          loginAccessToken: loginResponse.accessToken,
        });

        if (authorizeResponse.state !== state) {
          throw new Error('Invalid state');
        }

        const exchangeTokenResponse = await sdk.exchangeToken({
          code: authorizeResponse.code,
          codeVerifier,
          grantType: 'authorization_code',
        });

        await storeCardBaanxToken({
          accessToken: exchangeTokenResponse.accessToken,
          refreshToken: exchangeTokenResponse.refreshToken,
          acessTokenExpiresAt: exchangeTokenResponse.expiresIn,
          refreshTokenExpiresAt: exchangeTokenResponse.refreshTokenExpiresIn,
          location: params.location,
        });

        dispatch(setIsAuthenticatedAction(true));
        dispatch(setUserCardLocation(params.location));
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [sdk, dispatch],
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
