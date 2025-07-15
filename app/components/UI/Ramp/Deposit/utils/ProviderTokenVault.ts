import SecureKeychain from '../../../../../core/SecureKeychain';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';
import { Authentication } from '../../../../../core/Authentication/Authentication';
import AUTHENTICATION_TYPE from '../../../../../constants/userProperties';

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

    // Get the user's current authentication type to match their security preference
    const authData = await Authentication.getType();

    // Map the authentication type to SecureKeychain types
    let secureKeychainType;
    switch (authData.currentAuthType) {
      case AUTHENTICATION_TYPE.BIOMETRIC:
        secureKeychainType = SecureKeychain.TYPES.BIOMETRICS;
        break;
      case AUTHENTICATION_TYPE.PASSCODE:
        secureKeychainType = SecureKeychain.TYPES.PASSCODE;
        break;
      case AUTHENTICATION_TYPE.REMEMBER_ME:
        secureKeychainType = SecureKeychain.TYPES.REMEMBER_ME;
        break;
      default:
        // Default to password (no additional authentication)
        secureKeychainType = SecureKeychain.TYPES.REMEMBER_ME;
    }

    // Use SecureKeychain to store the token with the same authentication type as the main password
    // This ensures consistent security behavior across the app
    await SecureKeychain.setDepositProviderKey(
      stringifiedToken,
      secureKeychainType,
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
    const storedTokenString = await SecureKeychain.getDepositProviderKey();

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
  await SecureKeychain.resetDepositProviderKey();
}
