import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
  ACCESSIBLE,
  ACCESS_CONTROL,
} from 'react-native-keychain';
import { Authentication } from '../../../../../core/Authentication/Authentication';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';
import { NativeTransakAccessToken } from '@consensys/on-ramp-sdk/dist/NativeRampService';

const TRANSAK_TOKEN_KEY = 'TRANSAK_ACCESS_TOKEN';

interface TransakTokenResponse {
  success: boolean;
  token?: NativeTransakAccessToken;
  error?: string;
}

const options = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function storeTransakToken(
  token: NativeTransakAccessToken,
): Promise<TransakTokenResponse> {
  try {
    // Get current auth type to match user's security preference
    const authData = await Authentication.getType();

    const authOptions = {
      ...options,
      accessControl:
        authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC
          ? ACCESS_CONTROL.BIOMETRY_CURRENT_SET
          : authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE
          ? ACCESS_CONTROL.DEVICE_PASSCODE
          : undefined,
    };

    const stringifiedToken = JSON.stringify(token);

    const storeResult = await setInternetCredentials(
      TRANSAK_TOKEN_KEY,
      TRANSAK_TOKEN_KEY,
      stringifiedToken,
      authOptions,
    );

    if (storeResult === false) {
      return {
        success: false,
        error: 'Failed to store Transak token',
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

export async function getTransakToken(): Promise<TransakTokenResponse> {
  try {
    const credentials = await getInternetCredentials(TRANSAK_TOKEN_KEY);
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

export async function resetTransakToken(): Promise<void> {
  await resetInternetCredentials(TRANSAK_TOKEN_KEY);
}
