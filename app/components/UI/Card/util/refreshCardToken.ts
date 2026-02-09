import Logger from '../../../../util/Logger';
import { CardError, CardErrorType, CardLocation } from '../types';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

// Constants
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

/**
 * Default refresh token expiration in seconds when not provided by the OAuth2 response.
 * Baanx DEV uses 20 minutes, production may differ.
 */
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 20 * 60;

interface CardExchangeTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  location: CardLocation;
}

/**
 * Refreshes the card token using a refresh token via the OAuth2 endpoint.
 *
 * Uses POST /v1/auth/oauth2/token with x-client-key header.
 * Handles missing refresh_token_expires_in with a default value.
 *
 * @param refreshToken The refresh token to use for getting a new access token
 * @param location The location (us or international) for the API call
 * @returns A promise that resolves to the new token response
 */
export const refreshCardToken = async (
  refreshToken: string,
  location: CardLocation,
): Promise<CardExchangeTokenResponse> => {
  const apiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
  const baseUrl =
    process.env.BAANX_API_URL ||
    getDefaultBaanxApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);

  if (!apiKey) {
    throw new CardError(
      CardErrorType.API_KEY_MISSING,
      'Card API key is not configured',
    );
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-us-env': String(location === 'us'),
    'x-client-key': apiKey,
  };

  const requestBody = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };

  const url = `${baseUrl}/v1/auth/oauth2/token`;

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'omit',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      if (response.status === 401 || response.status === 403) {
        const error = new CardError(
          CardErrorType.INVALID_CREDENTIALS,
          'Token refresh failed. Please try logging in again.',
        );
        Logger.log(
          error,
          `refreshCardToken: Token refresh failed - invalid credentials. Status: ${response.status}`,
        );
        throw error;
      }

      const errorMessage = `Token refresh failed with status ${response.status}`;
      Logger.log(
        `refreshCardToken: ${errorMessage}. Response: ${responseBody}`,
      );
      throw new CardError(CardErrorType.SERVER_ERROR, errorMessage);
    }

    const data = await response.json();

    // OAuth2 may not include refresh_token_expires_in in the response
    const refreshTokenExpiresIn =
      data.refresh_token_expires_in ?? DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS;

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      refreshTokenExpiresIn,
      location,
    } as CardExchangeTokenResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if the error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CardError(
        CardErrorType.TIMEOUT_ERROR,
        'Token refresh request timed out. Please check your connection.',
        error,
      );
    }

    // If it's already a CardError, re-throw it
    if (error instanceof CardError) {
      throw error;
    }

    // Network or other fetch errors
    if (error instanceof Error) {
      throw new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network error during token refresh. Please check your connection.',
        error,
      );
    }

    throw new CardError(
      CardErrorType.UNKNOWN_ERROR,
      'An unexpected error occurred during token refresh.',
      error instanceof Error ? error : undefined,
    );
  }
};
