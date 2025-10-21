import { useCallback, useMemo, useState } from 'react';
import { useCardSDK } from '../sdk';
import { storeCardBaanxToken } from '../util/cardTokenVault';
import { generatePKCEPair, generateState } from '../util/pkceHelpers';
import {
  CardError,
  CardErrorType,
  CardLocation,
  CardLoginResponse,
} from '../types';
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

interface UseCardProviderAuthenticationResponse {
  login: (params: {
    location: CardLocation;
    email: string;
    password: string;
    otpCode?: string;
  }) => Promise<CardLoginResponse | void>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  otpLoading: boolean;
  sendOtpLogin: (params: {
    userId: string;
    location: CardLocation;
  }) => Promise<void>;
  otpError: string | null;
  clearOtpError: () => void;
}

const useCardProviderAuthentication =
  (): UseCardProviderAuthenticationResponse => {
    const dispatch = useDispatch();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const { sdk } = useCardSDK();

    const clearOtpError = useCallback(() => {
      setOtpError(null);
    }, []);

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    const sendOtpLogin = useCallback(
      async (params: { userId: string }): Promise<void> => {
        if (!sdk) {
          throw new Error('Card SDK not initialized');
        }

        try {
          setOtpLoading(true);
          await sdk.sendOtpLogin({
            userId: params.userId,
          });
        } catch (err) {
          setOtpError(getErrorMessage(err));
        } finally {
          setOtpLoading(false);
        }
      },
      [sdk],
    );

    const login = useCallback(
      async (params: {
        location: CardLocation;
        email: string;
        password: string;
        otpCode?: string;
      }): Promise<CardLoginResponse | void> => {
        if (!sdk) {
          throw new Error('Card SDK not initialized');
        }

        const state = generateState();
        const { codeVerifier, codeChallenge } = await generatePKCEPair();

        try {
          setLoading(true);
          const initiateResponse = await sdk.initiateCardProviderAuthentication(
            {
              state,
              codeChallenge,
            },
          );

          const loginResponse = await sdk.login({
            email: params.email,
            password: params.password,
            ...(params.otpCode ? { otpCode: params.otpCode } : {}),
          });

          if (loginResponse.isOtpRequired) {
            return loginResponse;
          }

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
            accessTokenExpiresAt: exchangeTokenResponse.expiresIn,
            refreshTokenExpiresAt: exchangeTokenResponse.refreshTokenExpiresIn,
            location: params.location,
          });

          setError(null);
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
        sendOtpLogin,
        error,
        otpError,
        loading,
        otpLoading,
        clearError,
        clearOtpError,
      }),
      [
        login,
        sendOtpLogin,
        error,
        otpError,
        loading,
        otpLoading,
        clearError,
        clearOtpError,
      ],
    );
  };

export default useCardProviderAuthentication;
