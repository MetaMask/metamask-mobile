import SecureKeychain from './SecureKeychain';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import StorageWrapper from '../store/storage-wrapper';
import { Platform } from 'react-native';
import {
  BIOMETRY_CHOICE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_CHOICE,
  PASSCODE_DISABLED,
  TRUE,
} from '../constants/storage';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import AUTHENTICATION_TYPE from '../constants/userProperties';

jest.mock('../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'BIOMETRY_CURRENT_SET',
    DEVICE_PASSCODE: 'DEVICE_PASSCODE',
  },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockAddTraitsToUser = jest.fn();
jest.mock('../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({
      addTraitsToUser: mockAddTraitsToUser,
      trackEvent: jest.fn(),
    })),
  },
}));

describe('SecureKeychain - setGenericPassword', () => {
  const mockPassword = 'test_password';

  beforeEach(() => {
    jest.clearAllMocks();
    SecureKeychain.init('test_salt');
  });

  it('should set biometric authentication correctly', async () => {
    await SecureKeychain.setGenericPassword(
      mockPassword,
      SecureKeychain.TYPES.BIOMETRICS,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      expect.any(String),
      expect.objectContaining({
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      }),
    );
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(BIOMETRY_CHOICE, TRUE);
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PASSCODE_DISABLED,
      TRUE,
    );
    expect(mockAddTraitsToUser).toHaveBeenCalledWith(
      expect.objectContaining({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.BIOMETRIC,
      }),
    );
  });

  it('should set passcode authentication correctly', async () => {
    await SecureKeychain.setGenericPassword(
      mockPassword,
      SecureKeychain.TYPES.PASSCODE,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      expect.any(String),
      expect.objectContaining({
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
      }),
    );
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(PASSCODE_CHOICE, TRUE);
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      BIOMETRY_CHOICE_DISABLED,
      TRUE,
    );
  });

  it('should set remember me correctly', async () => {
    await SecureKeychain.setGenericPassword(
      mockPassword,
      SecureKeychain.TYPES.REMEMBER_ME,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      expect.any(String),
      expect.not.objectContaining({
        accessControl: expect.anything(),
      }),
    );
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      PASSCODE_DISABLED,
      TRUE,
    );
    expect(StorageWrapper.setItem).toHaveBeenCalledWith(
      BIOMETRY_CHOICE_DISABLED,
      TRUE,
    );
  });

  it('should reset password when no type is provided', async () => {
    const resetSpy = jest.spyOn(SecureKeychain, 'resetGenericPassword');
    await SecureKeychain.setGenericPassword(mockPassword);

    expect(resetSpy).toHaveBeenCalled();
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  describe('iOS Biometric Handling', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should handle user cancellation of biometric prompt', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error('User canceled the operation.'),
      );

      await SecureKeychain.setGenericPassword(
        mockPassword,
        SecureKeychain.TYPES.BIOMETRICS,
      );

      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(BIOMETRY_CHOICE);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        BIOMETRY_CHOICE_DISABLED,
        TRUE,
      );
      expect(mockAddTraitsToUser).toHaveBeenLastCalledWith(
        expect.objectContaining({
          [UserProfileProperty.AUTHENTICATION_TYPE]:
            AUTHENTICATION_TYPE.PASSWORD,
        }),
      );
    });

    it('should successfully set up biometric authentication', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        password: 'encrypted_password',
      });

      await SecureKeychain.setGenericPassword(
        mockPassword,
        SecureKeychain.TYPES.BIOMETRICS,
      );

      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        BIOMETRY_CHOICE,
        TRUE,
      );
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        PASSCODE_DISABLED,
        TRUE,
      );
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(PASSCODE_CHOICE);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
        BIOMETRY_CHOICE_DISABLED,
      );
      expect(mockAddTraitsToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          [UserProfileProperty.AUTHENTICATION_TYPE]:
            AUTHENTICATION_TYPE.BIOMETRIC,
        }),
      );
    });
  });
});

describe('SecureKeychain - Deposit Provider Key', () => {
  const mockProviderKey = 'test-provider-token';

  beforeEach(() => {
    jest.clearAllMocks();
    SecureKeychain.init('test_salt');
  });

  describe('setDepositProviderKey', () => {
    it('should store provider key with basic device security', async () => {
      await SecureKeychain.setDepositProviderKey(mockProviderKey);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-deposit-provider',
        mockProviderKey,
        expect.objectContaining({
          service: 'com.metamask.deposit-provider',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
    });

    it('should not add any access control for re-authentication', async () => {
      await SecureKeychain.setDepositProviderKey(mockProviderKey);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-deposit-provider',
        mockProviderKey,
        expect.not.objectContaining({
          accessControl: expect.anything(),
        }),
      );
    });

    it('should handle storage errors', async () => {
      const errorMessage = 'Storage failed';
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage),
      );

      await expect(
        SecureKeychain.setDepositProviderKey(mockProviderKey),
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getDepositProviderKey', () => {
    it('should retrieve provider key successfully', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        password: mockProviderKey,
      });

      const result = await SecureKeychain.getDepositProviderKey();

      expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
        service: 'com.metamask.deposit-provider',
      });
      expect(result).toBe(mockProviderKey);
    });

    it('should return null when no provider key is found', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(null);

      const result = await SecureKeychain.getDepositProviderKey();

      expect(result).toBeNull();
    });

    it('should return null when keychain object has no password', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        username: 'metamask-deposit-provider',
        // password is undefined
      });

      const result = await SecureKeychain.getDepositProviderKey();

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      const errorMessage = 'Retrieval failed';
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage),
      );

      await expect(SecureKeychain.getDepositProviderKey()).rejects.toThrow(
        errorMessage,
      );
    });

    it('should return null when instance is not initialized', async () => {
      // Reset the instance
      (SecureKeychain as any).instance = null;

      const result = await SecureKeychain.getDepositProviderKey();

      expect(result).toBeNull();
    });
  });

  describe('resetDepositProviderKey', () => {
    it('should reset provider key successfully', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValueOnce(
        undefined,
      );

      await SecureKeychain.resetDepositProviderKey();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'com.metamask.deposit-provider',
      });
    });

    it('should handle reset errors', async () => {
      const errorMessage = 'Reset failed';
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage),
      );

      await expect(SecureKeychain.resetDepositProviderKey()).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('Service Configuration', () => {
    it('should use correct service identifier for deposit provider', async () => {
      await SecureKeychain.setDepositProviderKey(mockProviderKey);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-deposit-provider',
        mockProviderKey,
        expect.objectContaining({
          service: 'com.metamask.deposit-provider',
        }),
      );
    });

    it('should be separate from main wallet password service', async () => {
      await SecureKeychain.setDepositProviderKey(mockProviderKey);
      await SecureKeychain.setGenericPassword(
        'wallet-password',
        SecureKeychain.TYPES.BIOMETRICS,
      );

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-deposit-provider',
        mockProviderKey,
        expect.objectContaining({
          service: 'com.metamask.deposit-provider',
        }),
      );

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-user',
        expect.any(String),
        expect.objectContaining({
          service: 'com.metamask',
        }),
      );
    });
  });
});
