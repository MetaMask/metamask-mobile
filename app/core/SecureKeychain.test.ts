import SecureKeychain from './SecureKeychain';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import AUTHENTICATION_TYPE from '../constants/userProperties';
import QuickCrypto from 'react-native-quick-crypto';
import { analytics } from '../util/analytics/analytics';

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
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BIOMETRY_ANY_OR_DEVICE_PASSCODE',
    BIOMETRY_CURRENT_SET: 'BIOMETRY_CURRENT_SET',
    DEVICE_PASSCODE: 'DEVICE_PASSCODE',
  },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  STORAGE_TYPE: {
    AES_GCM: 'AES_GCM',
  },
}));

jest.mock('../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../util/analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

jest.mock('../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  },
}));

describe('SecureKeychain - setGenericPassword', () => {
  const mockPassword = 'test_password';

  beforeEach(() => {
    jest.clearAllMocks();
    SecureKeychain.init('test_salt');
  });

  it('should set device authentication correctly when type is BIOMETRIC', async () => {
    await SecureKeychain.setGenericPassword(
      mockPassword,
      AUTHENTICATION_TYPE.BIOMETRIC,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      expect.any(String),
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      }),
    );

    expect(analytics.identify).toHaveBeenCalledWith(
      expect.objectContaining({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      }),
    );
  });

  it('should set device authentication correctly when type is PASSCODE', async () => {
    await SecureKeychain.setGenericPassword(
      mockPassword,
      AUTHENTICATION_TYPE.PASSCODE,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      expect.any(String),
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      }),
    );

    expect(analytics.identify).toHaveBeenCalledWith(
      expect.objectContaining({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      }),
    );
  });

  it('should set device authentication correctly when type is DEVICE_AUTHENTICATION', async () => {
    await SecureKeychain.setGenericPassword(
      mockPassword,
      AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'metamask-user',
      expect.any(String),
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      }),
    );

    expect(analytics.identify).toHaveBeenCalledWith(
      expect.objectContaining({
        [UserProfileProperty.AUTHENTICATION_TYPE]:
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
      }),
    );
  });

  it('should reset password when type is PASSWORD', async () => {
    const resetSpy = jest.spyOn(SecureKeychain, 'resetGenericPassword');
    await SecureKeychain.setGenericPassword(
      mockPassword,
      AUTHENTICATION_TYPE.PASSWORD,
    );

    expect(resetSpy).toHaveBeenCalled();
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  it('should reset password when no type is provided', async () => {
    const resetSpy = jest.spyOn(SecureKeychain, 'resetGenericPassword');
    await SecureKeychain.setGenericPassword(mockPassword);

    expect(resetSpy).toHaveBeenCalled();
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });
});

describe('SecureKeychain - Secure Item Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SecureKeychain.init('test_salt');
  });

  describe('setSecureItem', () => {
    it('encrypts value and stores parameters correctly', async () => {
      const key = 'test-key';
      const value = 'plain-text-value';
      const scopeOptions = {
        service: 'com.metamask.test-service',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      await SecureKeychain.setSecureItem(key, value, scopeOptions);

      const storedKey = (Keychain.setGenericPassword as jest.Mock).mock
        .calls[0][0];
      const storedValue = (Keychain.setGenericPassword as jest.Mock).mock
        .calls[0][1];
      const storedScopeOptions = (Keychain.setGenericPassword as jest.Mock).mock
        .calls[0][2];

      expect(storedKey).toBe(key);

      expect(typeof storedValue).toBe('string');
      expect(storedValue).toMatch(/^{"cipher":/);

      expect(storedScopeOptions).toEqual(scopeOptions);
    });
  });

  describe('getSecureItem', () => {
    it('retrieves and decrypts item successfully', async () => {
      const key = 'test-key';
      const originalValue = 'plain-text-value';
      const scopeOptions = {
        service: 'com.metamask.test-service',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      jest.spyOn(QuickCrypto.subtle, 'decrypt').mockImplementation(() => {
        const jsonString = JSON.stringify({ password: originalValue });
        const encoder = new TextEncoder();
        return Promise.resolve(encoder.encode(jsonString));
      });

      await SecureKeychain.setSecureItem(key, originalValue, scopeOptions);

      const storedEncryptedValue = (Keychain.setGenericPassword as jest.Mock)
        .mock.calls[0][1];

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: key,
        password: storedEncryptedValue,
        service: scopeOptions.service,
      });

      const result = await SecureKeychain.getSecureItem(scopeOptions);

      expect(result).toEqual({
        key,
        value: originalValue,
      });

      expect(Keychain.getGenericPassword).toHaveBeenCalledWith(scopeOptions);
    });

    it('returns null when no item is found', async () => {
      const scopeOptions = { service: 'test-service' };
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await SecureKeychain.getSecureItem(scopeOptions);

      expect(result).toBeNull();
    });

    it('returns null when value field is missing', async () => {
      const scopeOptions = { service: 'test-service' };
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'test-key',
      });

      const result = await SecureKeychain.getSecureItem(scopeOptions);

      expect(result).toBeNull();
    });

    it('throws error when decryption fails', async () => {
      const scopeOptions = { service: 'test-service' };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'test-key',
        password: 'invalid-encrypted-data',
      });

      await expect(
        SecureKeychain.getSecureItem(scopeOptions),
      ).rejects.toThrow();
    });
  });

  describe('clearSecureScope', () => {
    it('clears scope using scope options', async () => {
      const scopeOptions = {
        service: 'com.metamask.test-service',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      const result = await SecureKeychain.clearSecureScope(scopeOptions);

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(scopeOptions);
      expect(result).toBe(true);
    });
  });
});
