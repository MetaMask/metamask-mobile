import { CardLocation } from '../types';
import {
  getCardBaanxToken,
  removeCardBaanxToken,
  storeCardBaanxToken,
} from './cardTokenVault';
import { refreshCardToken } from './refreshCardToken';

export const handleLocalAuthentication = async ({
  isBaanxLoginEnabled,
}: {
  isBaanxLoginEnabled: boolean;
}): Promise<{
  isAuthenticated: boolean;
  userCardLocation?: CardLocation;
}> => {
  try {
    // If Baanx login is not enabled, user is not authenticated
    if (!isBaanxLoginEnabled) {
      return { isAuthenticated: false };
    }

    const tokenResult = await getCardBaanxToken();

    // If token retrieval was successful but no token data, user is not authenticated
    if (!tokenResult?.success || !tokenResult?.tokenData) {
      return { isAuthenticated: false };
    }

    const {
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      location,
    } = tokenResult.tokenData;

    // CASE 1: Access-only token (from onboarding flow)
    // Check if we have an access token but no refresh token
    if (!refreshToken) {
      // Check if access token is still valid (not expired in the next 5 minutes)
      // Using 5 minutes as buffer to avoid edge cases where token expires during requests
      if (Date.now() + 5 * 60 * 1000 > accessTokenExpiresAt) {
        await removeCardBaanxToken();
        return { isAuthenticated: false };
      }

      // Access token is still valid, user is authenticated
      return {
        isAuthenticated: true,
        userCardLocation: location,
      };
    }

    // CASE 2: Full token pair (access + refresh tokens)
    // Check if refresh token will be expired in the next 1 hour.
    // If so, remove the token and return false.
    if (
      refreshTokenExpiresAt &&
      Date.now() + 1 * 60 * 60 * 1000 > refreshTokenExpiresAt
    ) {
      await removeCardBaanxToken();
      return { isAuthenticated: false };
    }

    // Check if access token is still fresh enough to skip refresh
    // Skip if access token has more than 5 minutes of validity remaining
    if (Date.now() + 5 * 60 * 1000 < accessTokenExpiresAt) {
      return {
        isAuthenticated: true,
        userCardLocation: location,
      };
    }

    // If refresh token is still valid but access token is about to expire,
    // retrieve a new accessToken and store it
    try {
      const newTokens = await refreshCardToken(refreshToken, location);

      if (!newTokens?.accessToken || !newTokens?.refreshToken) {
        throw new Error('Invalid token response from refresh request');
      }

      await storeCardBaanxToken({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        accessTokenExpiresAt: newTokens.expiresIn,
        refreshTokenExpiresAt: newTokens.refreshTokenExpiresIn,
        location,
      });

      return {
        isAuthenticated: true,
        userCardLocation: location,
      };
    } catch (error) {
      await removeCardBaanxToken();
      return { isAuthenticated: false };
    }
  } catch (error) {
    return {
      isAuthenticated: false,
    };
  }
};
