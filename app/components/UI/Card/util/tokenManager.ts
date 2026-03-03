import Logger from '../../../../util/Logger';
import { CardTokenData, CardLocation } from '../types';
import {
  getCardBaanxToken,
  storeCardBaanxToken,
  removeCardBaanxToken,
} from './cardTokenVault';
import { refreshCardToken } from './refreshCardToken';

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
const REFRESH_TOKEN_EXPIRY_BUFFER_MS = 1 * 60 * 60 * 1000; // 1 hour

/**
 * TokenManager provides concurrency-safe access to the Card OAuth2 tokens.
 *
 * It ensures that:
 * - Access tokens are proactively refreshed before they expire.
 * - Only one refresh request is in-flight at a time (mutex via promise reuse).
 * - Callers can force a refresh (e.g. after a 401 response).
 * - If the refresh token is expired or refresh fails, tokens are cleared.
 */
class TokenManager {
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Returns a valid access token, refreshing proactively if needed.
   *
   * @param forceRefresh - If true, forces a token refresh even if the current token appears valid.
   * Use this after receiving a 401 to handle server-side token revocation.
   * @returns The access token string, or null if no valid token is available.
   */
  async getValidAccessToken(forceRefresh = false): Promise<string | null> {
    const tokenResult = await getCardBaanxToken();

    if (!tokenResult.success || !tokenResult.tokenData) {
      return null;
    }

    const { accessToken, accessTokenExpiresAt, refreshToken } =
      tokenResult.tokenData;

    const isExpiringSoon =
      Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS >= accessTokenExpiresAt;

    if (!forceRefresh && !isExpiringSoon) {
      return accessToken;
    }

    // No refresh token available (onboarding flow) — return the current token
    // if it hasn't fully expired, or null if it has
    if (!refreshToken) {
      return isExpiringSoon ? null : accessToken;
    }

    // Use the mutex to ensure only one refresh is in-flight at a time.
    // Concurrent callers will await the same promise.
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh(tokenResult.tokenData).finally(
        () => {
          this.refreshPromise = null;
        },
      );
    }

    return this.refreshPromise;
  }

  /**
   * Checks whether stored tokens exist and are still usable (i.e. the refresh
   * token has not expired beyond the safety buffer).
   *
   * This is used by handleLocalAuthentication to determine auth state at startup
   * without necessarily triggering a refresh.
   *
   * @returns Object with authentication status and location.
   */
  async checkAuthenticationStatus(): Promise<{
    isAuthenticated: boolean;
    userCardLocation?: CardLocation;
  }> {
    const tokenResult = await getCardBaanxToken();

    if (!tokenResult.success || !tokenResult.tokenData) {
      return { isAuthenticated: false };
    }

    const {
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      location,
    } = tokenResult.tokenData;

    // CASE 1: Access-only token (onboarding flow)
    if (!refreshToken) {
      if (Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS > accessTokenExpiresAt) {
        await removeCardBaanxToken();
        return { isAuthenticated: false };
      }
      return { isAuthenticated: true, userCardLocation: location };
    }

    // CASE 2: Full token pair
    // If refresh token is expired or expiring within the buffer, session is over
    if (
      refreshTokenExpiresAt &&
      Date.now() + REFRESH_TOKEN_EXPIRY_BUFFER_MS > refreshTokenExpiresAt
    ) {
      await removeCardBaanxToken();
      return { isAuthenticated: false };
    }

    // Access token expired or expiring soon — try to refresh proactively
    if (Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS >= accessTokenExpiresAt) {
      try {
        const newToken = await this.getValidAccessToken(true);
        if (newToken) {
          return { isAuthenticated: true, userCardLocation: location };
        }
        return { isAuthenticated: false };
      } catch {
        await removeCardBaanxToken();
        return { isAuthenticated: false };
      }
    }

    // Both tokens are still fresh
    return { isAuthenticated: true, userCardLocation: location };
  }

  /**
   * Performs the actual token refresh and stores the new tokens.
   *
   * @param tokenData - The current token data containing the refresh token.
   * @returns The new access token, or null if refresh failed.
   */
  private async performRefresh(
    tokenData: CardTokenData,
  ): Promise<string | null> {
    const { refreshToken, refreshTokenExpiresAt, location } = tokenData;

    if (!refreshToken) {
      return null;
    }

    // Don't attempt refresh if the refresh token itself is expired
    if (
      refreshTokenExpiresAt &&
      Date.now() + REFRESH_TOKEN_EXPIRY_BUFFER_MS > refreshTokenExpiresAt
    ) {
      await removeCardBaanxToken();
      return null;
    }

    try {
      const newTokens = await refreshCardToken(refreshToken, location);

      if (!newTokens?.accessToken || !newTokens?.refreshToken) {
        Logger.log('[TokenManager] Refresh returned incomplete token response');
        await removeCardBaanxToken();
        return null;
      }

      await storeCardBaanxToken({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        accessTokenExpiresAt: newTokens.expiresIn,
        refreshTokenExpiresAt: newTokens.refreshTokenExpiresIn,
        location,
      });

      return newTokens.accessToken;
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', operation: 'tokenRefresh' },
      });
      await removeCardBaanxToken();
      return null;
    }
  }
}

/**
 * Singleton instance of TokenManager.
 * Shared across the entire Card feature to ensure the refresh mutex works globally.
 */
export const tokenManager = new TokenManager();

// Export the class for testing
export { TokenManager };
