import Logger from '../../../../util/Logger';
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

    const { refreshToken, refreshTokenExpiresAt, location } =
      tokenResult.tokenData;

    // Check if refresh token will be expired in the next 1 hour.
    // If so, remove the token and return false.
    if (Date.now() + 1 * 60 * 60 * 1000 > refreshTokenExpiresAt) {
      await removeCardBaanxToken();
      return { isAuthenticated: false };
    }

    // If refresh token is still valid, retrieve a new accessToken and store it
    try {
      const newTokens = await refreshCardToken(refreshToken, location);

      if (!newTokens?.accessToken || !newTokens?.refreshToken) {
        throw new Error('Invalid token response from refresh request');
      }

      await storeCardBaanxToken({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        acessTokenExpiresAt: newTokens.expiresIn,
        refreshTokenExpiresAt: newTokens.refreshTokenExpiresIn,
        location,
      });

      return {
        isAuthenticated: true,
        userCardLocation: location,
      };
    } catch (error) {
      Logger.log('Token refresh failed:', error);
      return { isAuthenticated: false };
    }
  } catch (error) {
    Logger.log('Authentication verification failed:', error);
    return {
      isAuthenticated: false,
    };
  }
};
