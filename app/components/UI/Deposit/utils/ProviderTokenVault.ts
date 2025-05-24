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

    const stringifiedToken = JSON.stringify(token);

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
      return {
        success: true,
        token: JSON.parse(credentials.password),
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
