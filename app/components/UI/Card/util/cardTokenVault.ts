import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';

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
 * Store a card baanx token
 */
export async function storeCardBaanxToken(params: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}): Promise<TokenResponse> {
  try {
    const stringifiedTokens = JSON.stringify(params);

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
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Get a card baanx token
 */
export async function getCardBaanxToken(): Promise<{
  success: boolean;
  tokenData?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  error?: string;
}> {
  try {
    const secureItem = await SecureKeychain.getSecureItem(scopeOptions);
    Logger.log('getCardBaanxToken secureItem', secureItem);

    if (!secureItem) {
      Logger.log('getCardBaanxToken no token found');
      return {
        success: true,
        tokenData: undefined,
      };
    }

    const tokenData: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    } = JSON.parse(secureItem.value);

    if (Date.now() >= tokenData.expiresAt) {
      Logger.log('getCardBaanxToken tokenData expired, removing token...');
      await removeCardBaanxToken();
      return {
        success: false,
        error: 'Token expired',
      };
    }

    Logger.log('getCardBaanxToken tokenData valid');
    return {
      success: true,
      tokenData,
    };
  } catch (error) {
    Logger.log('Error getting card baanx token:', error);
    return {
      success: false,
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

    Logger.log('Card Baanx token removed successfully');
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
