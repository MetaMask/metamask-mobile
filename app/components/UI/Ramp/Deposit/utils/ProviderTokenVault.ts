import SecureKeychain from '../../../../../core/SecureKeychain';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';

interface ProviderTokenResponse {
  success: boolean;
  token?: NativeTransakAccessToken;
  error?: string;
}

interface ProviderToken {
  token: NativeTransakAccessToken;
  expiresAt: number;
}

export async function storeProviderToken(
  token: NativeTransakAccessToken,
): Promise<ProviderTokenResponse> {
  try {
    const expiresAt = Date.now() + token.ttl * 1000;
    const storedToken: ProviderToken = {
      token,
      expiresAt,
    };

    const stringifiedToken = JSON.stringify(storedToken);

    // Always use REMEMBER_ME for provider tokens (no re-authentication needed)
    await SecureKeychain.setEncryptedValue(
      'deposit',
      stringifiedToken,
      SecureKeychain.TYPES.REMEMBER_ME,
    );

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

export async function getProviderToken(): Promise<ProviderTokenResponse> {
  try {
    const storedTokenString = await SecureKeychain.getEncryptedValue('deposit');

    if (storedTokenString) {
      const storedToken: ProviderToken = JSON.parse(storedTokenString);

      if (Date.now() > storedToken.expiresAt) {
        await resetProviderToken();
        return {
          success: false,
          error: 'Token has expired',
        };
      }

      return {
        success: true,
        token: storedToken.token,
      };
    }
    return {
      success: false,
      error: 'No token found',
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function resetProviderToken(): Promise<void> {
  await SecureKeychain.resetEncryptedValue('deposit');
}
