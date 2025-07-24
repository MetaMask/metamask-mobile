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
import QuickCrypto from 'react-native-quick-crypto';

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

describe('SecureKeychain - Consumer Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SecureKeychain.init('test_salt');
  });

  describe('setConsumerGenericPassword', () => {
    it('encrypts password and stores parameters correctly', async () => {
      const username = 'test-username';
      const password = 'plain-text-password';
      const consumerOptions = {
        service: 'com.metamask.test-service',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      await SecureKeychain.setConsumerGenericPassword(
        username,
        password,
        consumerOptions,
      );

      const storedUsername = (Keychain.setGenericPassword as jest.Mock).mock
        .calls[0][0];
      const storedPassword = (Keychain.setGenericPassword as jest.Mock).mock
        .calls[0][1];
      const storedConsumerOptions = (Keychain.setGenericPassword as jest.Mock)
        .mock.calls[0][2];

      expect(storedUsername).toBe(username);

      expect(typeof storedPassword).toBe('string');
      expect(storedPassword).toMatch(/^{"cipher":/);

      expect(storedConsumerOptions).toEqual(consumerOptions);
    });
  });

  describe('getConsumerGenericPassword', () => {
    it('retrieves and decrypts password successfully', async () => {
      const username = 'test-username';
      const originalPassword = 'plain-text-password';
      const consumerOptions = {
        service: 'com.metamask.test-service',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      jest.spyOn(QuickCrypto.subtle, 'decrypt').mockImplementation(() => {
        const jsonString = JSON.stringify({ password: originalPassword });
        const encoder = new TextEncoder();
        return Promise.resolve(encoder.encode(jsonString));
      });

      await SecureKeychain.setConsumerGenericPassword(
        username,
        originalPassword,
        consumerOptions,
      );

      const storedEncryptedPassword = (Keychain.setGenericPassword as jest.Mock)
        .mock.calls[0][1];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username,
        password: storedEncryptedPassword,
        service: consumerOptions.service,
      });

      const result = await SecureKeychain.getConsumerGenericPassword(
        consumerOptions,
      );

      expect(result).toEqual({
        username,
        password: originalPassword,
        service: consumerOptions.service,
      });

      expect(Keychain.getGenericPassword).toHaveBeenCalledWith(consumerOptions);
    });

    it('returns null when no credentials are found', async () => {
      const consumerOptions = { service: 'test-service' };
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await SecureKeychain.getConsumerGenericPassword(
        consumerOptions,
      );

      expect(result).toBeNull();
    });

    it('returns null when password field is missing', async () => {
      const consumerOptions = { service: 'test-service' };
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'test-user',
      });

      const result = await SecureKeychain.getConsumerGenericPassword(
        consumerOptions,
      );

      expect(result).toBeNull();
    });

    it('throws error when decryption fails', async () => {
      const consumerOptions = { service: 'test-service' };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'test-user',
        password: 'invalid-encrypted-data',
      });

      await expect(
        SecureKeychain.getConsumerGenericPassword(consumerOptions),
      ).rejects.toThrow();
    });
  });

  describe('resetConsumerGenericPassword', () => {
    it('resets password using consumer options', async () => {
      const consumerOptions = {
        service: 'com.metamask.test-service',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      const result = await SecureKeychain.resetConsumerGenericPassword(
        consumerOptions,
      );

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(
        consumerOptions,
      );
      expect(result).toBe(true);
    });
  });
});
