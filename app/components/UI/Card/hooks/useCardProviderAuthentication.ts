import { useCallback, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import { generatePKCEPair, generateState } from '../util/pkceHelpers';
import { CardError, CardErrorType, CardLocation } from '../types';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';

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

const useCardProviderAuthentication = (
  onAuthenticationSuccess?: () => Promise<void>,
): {
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(
    async (params: {
      location: CardLocation;
      email: string;
      password: string;
    }): Promise<void> => {
      const state = generateState();
      const { codeVerifier, codeChallenge } = await generatePKCEPair();

      try {
        setLoading(true);
        setError(null);

        Logger.log(
          'useCardProviderAuthentication: Starting authentication flow',
          {
            location: params.location,
          },
        );

        // Use CardController methods instead of SDK
        const initiateResponse = await Engine.controllerMessenger.call(
          'CardController:initiateLogin',
          {
            location: params.location,
            state,
            codeChallenge,
          },
        );

        const loginResponse = await Engine.controllerMessenger.call(
          'CardController:authenticate',
          {
            location: params.location,
            email: params.email,
            password: params.password,
          },
        );

        const authorizeResponse = await Engine.controllerMessenger.call(
          'CardController:authorize',
          {
            location: params.location,
            initiateAccessToken: initiateResponse.token,
            loginAccessToken: loginResponse.accessToken,
          },
        );

        if (authorizeResponse.state !== state) {
          throw new Error('Invalid state');
        }

        // This will automatically update the CardController's authentication state
        const exchangeTokenResponse = await Engine.controllerMessenger.call(
          'CardController:exchangeToken',
          {
            location: params.location,
            code: authorizeResponse.code,
            codeVerifier,
            grantType: 'authorization_code',
          },
        );

        Logger.log('useCardProviderAuthentication: Authentication successful', {
          location: params.location,
          hasAccessToken: !!exchangeTokenResponse.accessToken,
        });

        setError(null);

        // Notify parent component of successful authentication
        if (onAuthenticationSuccess) {
          await onAuthenticationSuccess();
        }
      } catch (err) {
        Logger.log('useCardProviderAuthentication: Authentication failed', err);
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [onAuthenticationSuccess],
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
