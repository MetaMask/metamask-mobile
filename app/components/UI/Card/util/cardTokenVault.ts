import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';
import { CardTokenData } from '../types';

const CARD_BAANX_TOKENS_KEY = 'CARD_BAANX_TOKENS';

const scopeOptions = {
  service: `com.metamask.${CARD_BAANX_TOKENS_KEY}`,
  accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface TokenResponse {
  success: boolean;
  accessToken?: string;
  error?: string;
}

/**
 * Store a card baanx token. Automatically converts token expiration dates from seconds to milliseconds.
 * Supports both full token pairs (access + refresh) and access-only tokens from onboarding.
 */
export async function storeCardBaanxToken(
  params: CardTokenData,
): Promise<TokenResponse> {
  try {
    const accessTokenExpiresAt =
      Date.now() + params.accessTokenExpiresAt * 1000;

    // Handle optional refresh token (for onboarding flow)
    const refreshTokenExpiresAt = params.refreshTokenExpiresAt
      ? Date.now() + params.refreshTokenExpiresAt * 1000
      : undefined;

    const stringifiedTokens = JSON.stringify({
      ...params,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    });

    const storeResult = await SecureKeychain.setSecureItem(
      CARD_BAANX_TOKENS_KEY,
      stringifiedTokens,
      scopeOptions,
    );

    if (storeResult === false) {
      return {
        success: false,
        error: 'Token not stored',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    Logger.log('Error storing card baanx token:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Validate the token data
 * @param tokenData The token data to validate
 * @returns True if the token data is valid, false otherwise
 *
 * Note: Supports both full token pairs and access-only tokens from onboarding.
 * For full authentication, both access and refresh tokens are required.
 * For onboarding flow, only access token is required.
 */
const validateTokenData = (tokenData: Partial<CardTokenData>): boolean => {
  // Always require access token, expiration, and location
  const hasRequiredFields = Boolean(
    tokenData.accessToken &&
      tokenData.accessTokenExpiresAt &&
      tokenData.location,
  );

  if (!hasRequiredFields) {
    return false;
  }

  // If refresh token is present, refresh token expiration must also be present
  if (tokenData.refreshToken && !tokenData.refreshTokenExpiresAt) {
    return false;
  }

  return true;
};

/**
 * Get a card baanx token
 */
export async function getCardBaanxToken(): Promise<{
  success: boolean;
  tokenData: CardTokenData | null;
  error?: string;
}> {
  try {
    const secureItem = await SecureKeychain.getSecureItem(scopeOptions);

    if (!secureItem) {
      return {
        success: true,
        tokenData: null,
      };
    }

    const tokenData: Partial<CardTokenData> = JSON.parse(secureItem.value);

    if (!validateTokenData(tokenData)) {
      return {
        success: false,
        tokenData: null,
        error: 'Invalid token data',
      };
    }

    return {
      success: true,
      tokenData: tokenData as CardTokenData,
    };
  } catch (error) {
    return {
      success: false,
      tokenData: null,
      error: (error as Error).message,
    };
  }
}

/**
 * Remove a card baanx token
 */
export async function removeCardBaanxToken(): Promise<TokenResponse> {
  try {
    // Directly clear the scope without checking if tokens exist
    // to avoid circular dependency with getCardBaanxToken
    const storeResult = await SecureKeychain.clearSecureScope(scopeOptions);

    if (storeResult === false) {
      return {
        success: false,
        error: 'Failed to remove card baanx token',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    Logger.log('Error removing card baanx token:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
