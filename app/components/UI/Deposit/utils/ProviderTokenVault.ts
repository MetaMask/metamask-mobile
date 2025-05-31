import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
  ACCESSIBLE,
  ACCESS_CONTROL,
} from 'react-native-keychain';
import { Authentication } from '../../../../core/Authentication/Authentication';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';

const PROVIDER_TOKEN_KEY = 'TRANSAK_ACCESS_TOKEN';

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
    // Get current auth type to match user's security preference
    const authData = await Authentication.getType();

    const authOptions = {
      accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl:
        authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC
          ? ACCESS_CONTROL.BIOMETRY_CURRENT_SET
          : authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE
          ? ACCESS_CONTROL.DEVICE_PASSCODE
          : undefined,
    };

    const expiresAt = Date.now() + token.ttl * 1000;
    const storedToken: ProviderToken = {
      token,
      expiresAt,
    };

    const stringifiedToken = JSON.stringify(storedToken);

    const storeResult = await setInternetCredentials(
      PROVIDER_TOKEN_KEY,
      PROVIDER_TOKEN_KEY,
      stringifiedToken,
      authOptions,
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
    const credentials = await getInternetCredentials(PROVIDER_TOKEN_KEY);
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
  await resetInternetCredentials(PROVIDER_TOKEN_KEY);
}
