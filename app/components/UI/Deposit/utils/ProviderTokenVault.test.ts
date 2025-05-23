import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
  ACCESS_CONTROL,
} from 'react-native-keychain';
import { Authentication } from '../../../../core/Authentication/Authentication';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import {
  getProviderToken,
  resetProviderToken,
  storeProviderToken,
} from './ProviderTokenVault';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';

const PROVIDER_TOKEN_KEY = 'TRANSAK_ACCESS_TOKEN';

jest.mock('react-native-keychain', () => ({
  getInternetCredentials: jest.fn(),
  setInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
    DEVICE_PASSCODE: 'DevicePasscode',
  },
}));

jest.mock('../../../../core/Authentication/Authentication', () => ({
  Authentication: {
    getType: jest.fn(),
  },
}));

describe('ProviderTokenVault', () => {
  const mockToken = {
    accessToken: 'test-access-token',
    expiresIn: 3600,
    refreshToken: 'test-refresh-token',
    scope: 'test-scope',
    tokenType: 'Bearer',
  } as unknown as NativeTransakAccessToken;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeProviderToken', () => {
    it('should store token successfully with biometric authentication', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      });

      (setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const result = await storeProviderToken(mockToken);

      expect(setInternetCredentials).toHaveBeenCalledWith(
        PROVIDER_TOKEN_KEY,
        PROVIDER_TOKEN_KEY,
        JSON.stringify(mockToken),
        expect.objectContaining({
          accessControl: ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        }),
      );

      expect(result).toEqual({
        success: true,
      });
    });

    it('should store token successfully with passcode authentication', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
      });

      (setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const result = await storeProviderToken(mockToken);

      expect(setInternetCredentials).toHaveBeenCalledWith(
        PROVIDER_TOKEN_KEY,
        PROVIDER_TOKEN_KEY,
        JSON.stringify(mockToken),
        expect.objectContaining({
          accessControl: ACCESS_CONTROL.DEVICE_PASSCODE,
        }),
      );

      expect(result).toEqual({
        success: true,
      });
    });

    it('should store token successfully with no authentication', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      });

      (setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const result = await storeProviderToken(mockToken);

      expect(setInternetCredentials).toHaveBeenCalledWith(
        PROVIDER_TOKEN_KEY,
        PROVIDER_TOKEN_KEY,
        JSON.stringify(mockToken),
        expect.objectContaining({
          accessControl: undefined,
        }),
      );

      expect(result).toEqual({
        success: true,
      });
    });

    it('should return an error when storing token fails', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      });

      (setInternetCredentials as jest.Mock).mockResolvedValue(false);

      const result = await storeProviderToken(mockToken);

      expect(result).toEqual({
        success: false,
        error: 'Failed to store Provider token',
      });
    });

    it('should return an error when an exception occurs', async () => {
      (Authentication.getType as jest.Mock).mockResolvedValue({
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      });

      const errorMessage = 'Test error';
      (setInternetCredentials as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      const result = await storeProviderToken(mockToken);

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });
  });

  describe('getProviderToken', () => {
    it('should retrieve token successfully', async () => {
      (getInternetCredentials as jest.Mock).mockResolvedValue({
        username: PROVIDER_TOKEN_KEY,
        password: JSON.stringify(mockToken),
      });

      const result = await getProviderToken();

      expect(getInternetCredentials).toHaveBeenCalledWith(PROVIDER_TOKEN_KEY);

      expect(result).toEqual({
        success: true,
        token: mockToken,
      });
    });

    it('should return an error when no token is found', async () => {
      (getInternetCredentials as jest.Mock).mockResolvedValue(null);

      const result = await getProviderToken();

      expect(result).toEqual({
        success: false,
        error: 'No token found',
      });
    });

    it('should return an error when an exception occurs', async () => {
      const errorMessage = 'Test error';
      (getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      const result = await getProviderToken();

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });
  });

  describe('resetProviderToken', () => {
    it('should reset token successfully', async () => {
      (resetInternetCredentials as jest.Mock).mockResolvedValue(undefined);

      await resetProviderToken();

      expect(resetInternetCredentials).toHaveBeenCalledWith(PROVIDER_TOKEN_KEY);
    });
  });
});
