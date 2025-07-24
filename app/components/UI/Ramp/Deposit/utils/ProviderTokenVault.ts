import SecureKeychain from '../../../../../core/SecureKeychain';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';

const PROVIDER_TOKEN_KEY = 'TRANSAK_ACCESS_TOKEN';

const consumerOptions = {
  service: `com.metamask.${PROVIDER_TOKEN_KEY}`,
  accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

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

    const storeResult = await SecureKeychain.setConsumerGenericPassword(
      PROVIDER_TOKEN_KEY,
      stringifiedToken,
      consumerOptions,
    );

    if (storeResult === false) {
      return {
        success: false,
        error: 'Failed to store Provider token',
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

export async function getProviderToken(): Promise<ProviderTokenResponse> {
  try {
    const credentials = await SecureKeychain.getConsumerGenericPassword(
      consumerOptions,
    );

    if (credentials) {
      const storedToken: ProviderToken = JSON.parse(credentials.password);

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
  await SecureKeychain.resetConsumerGenericPassword(consumerOptions);
}
