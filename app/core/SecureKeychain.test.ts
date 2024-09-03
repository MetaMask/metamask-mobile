import * as Keychain from 'react-native-keychain';
import SecureKeychain from './SecureKeychain';
import StorageWrapper from '../store/storage-wrapper';
import Device from '../util/device';
import { MetaMetrics, MetaMetricsEvents } from '../core/Analytics';
import { IMetaMetrics } from '../core/Analytics/MetaMetrics.types';
import {
  BIOMETRY_CHOICE,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_CHOICE,
  PASSCODE_DISABLED,
  TRUE,
} from '../constants/storage';
import { UserProfileProperty } from '../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import AUTHENTICATION_TYPE from '../constants/userProperties';

jest.mock('react-native-keychain', () => ({
  SECURITY_LEVEL: {
    SECURE_HARDWARE: 'SECURE_HARDWARE',
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    ANY: 'ANY',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'BIOMETRY_CURRENT_SET',
    DEVICE_PASSCODE: 'DEVICE_PASSCODE',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'DEVICE_PASSCODE_OR_BIOMETRICS',
  },
  getSupportedBiometryType: jest.fn(),
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('./Encryptor', () => {
  const mockEncrypt = jest.fn().mockResolvedValue('mockEncryptedPassword');
  const mockDecrypt = jest.fn().mockResolvedValue({ password: 'mockDecryptedPassword' });
  const mockKeyFromPassword = jest.fn().mockResolvedValue({
    key: 'mockKey',
    keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 10000 } },
    exportable: false,
    lib: 'original',
  });
  const mockGenerateSalt = jest.fn().mockReturnValue('mockSalt');

  const MockEncryptor = jest.fn().mockImplementation(() => ({
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
    keyFromPassword: mockKeyFromPassword,
    generateSalt: mockGenerateSalt,
  }));

  return {
    Encryptor: MockEncryptor,
    LEGACY_DERIVATION_OPTIONS: {},
    mockEncrypt,
    mockDecrypt,
    mockKeyFromPassword,
    mockGenerateSalt,
  };
});

// These lines are no longer needed as the mock is now implemented in the Encryptor mock
// const mockEncrypt = jest.fn().mockResolvedValue('mockEncryptedPassword');
// const mockDecrypt = jest.fn().mockResolvedValue({ password: 'mockDecryptedPassword' });
// jest.spyOn(Encryptor.prototype, 'encrypt').mockImplementation(mockEncrypt);
// jest.spyOn(Encryptor.prototype, 'decrypt').mockImplementation(mockDecrypt);

jest.mock('../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getItem: jest.fn(),
  },
}));

jest.mock('../util/device', () => ({
  isAndroid: jest.fn().mockReturnValue(false),
}));

jest.mock('../core/Analytics');

jest.mock('../core/Analytics');

const mockMetaMetricsInstance: jest.Mocked<IMetaMetrics> = {
  trackEvent: jest.fn(),
  addTraitsToUser: jest.fn().mockResolvedValue(undefined),
  isEnabled: jest.fn().mockReturnValue(true),
  enable: jest.fn().mockResolvedValue(undefined),
  group: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  flush: jest.fn().mockResolvedValue(undefined),
  createDataDeletionTask: jest.fn().mockResolvedValue({ status: 'ok' }),
  checkDataDeleteStatus: jest.fn().mockResolvedValue({ status: 'ok', dataDeleteStatus: 'FINISHED' }),
  getDeleteRegulationCreationDate: jest.fn().mockReturnValue(undefined),
  getDeleteRegulationId: jest.fn().mockReturnValue(undefined),
  isDataRecorded: jest.fn().mockReturnValue(false),
  configure: jest.fn().mockResolvedValue(true),
  getMetaMetricsId: jest.fn().mockResolvedValue('mock-id'),
};

jest.spyOn(MetaMetrics, 'getInstance').mockReturnValue(mockMetaMetricsInstance);

// Mock MetaMetricsEvents
jest.mock('../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn().mockReturnValue({
      trackEvent: jest.fn(),
    }),
  },
  MetaMetricsEvents: {
    ANDROID_HARDWARE_KEYSTORE: 'Android Hardware Keystore',
    AUTHENTICATION_TYPE: 'Authentication Type',
    BIOMETRIC_AUTHENTICATION_FAILED: 'Biometric Authentication Failed',
    BIOMETRIC_AUTHENTICATION_APPROVED: 'Biometric Authentication Approved',
  },
}));



describe('SecureKeychain', () => {
  const mockSalt = 'mockSalt';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(MetaMetrics, 'getInstance').mockClear();
    SecureKeychain.init(mockSalt);

    // Mock the MetaMetrics instance
    const mockMetaMetricsInstance = {
      addTraitsToUser: jest.fn().mockResolvedValue(undefined),
    };
    (MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetaMetricsInstance);
  });

  describe('init', () => {
    it('should initialize SecureKeychain and track event for Android hardware keystore', () => {
      jest.spyOn(Device, 'isAndroid').mockReturnValue(true);
      Object.defineProperty(Keychain, 'SECURITY_LEVEL', {
        get: jest.fn().mockReturnValue({
          SECURE_HARDWARE: 'SECURE_HARDWARE',
          SECURE_SOFTWARE: 'SECURE_SOFTWARE',
          ANY: 'ANY',
        }),
      });

      const mockTrackEvent = jest.fn();
      const mockMetaMetricsInstance: Partial<IMetaMetrics> = {
        trackEvent: mockTrackEvent,
        addTraitsToUser: jest.fn(),
      };
      jest.spyOn(MetaMetrics, 'getInstance').mockReturnValue(mockMetaMetricsInstance as IMetaMetrics);

      SecureKeychain.init(mockSalt);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.ANDROID_HARDWARE_KEYSTORE
      );
    });

    it('should not track event for non-Android devices', () => {
      jest.spyOn(Device, 'isAndroid').mockReturnValue(false);
      const mockTrackEvent = jest.fn();
      jest.spyOn(MetaMetrics, 'getInstance').mockReturnValue({ trackEvent: mockTrackEvent } as unknown as IMetaMetrics);

      SecureKeychain.init(mockSalt);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('getSupportedBiometryType', () => {
    it('should call Keychain.getSupportedBiometryType', async () => {
      await SecureKeychain.getSupportedBiometryType();
      expect(Keychain.getSupportedBiometryType).toHaveBeenCalled();
    });
  });

  describe('resetGenericPassword', () => {
    it('should reset generic password and remove related items when successful', async () => {
      const mockAddTraitsToUser = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(MetaMetrics, 'getInstance').mockReturnValue({
        addTraitsToUser: mockAddTraitsToUser,
      } as unknown as IMetaMetrics);
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      const result = await SecureKeychain.resetGenericPassword();

      expect(result).toBe(true);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(BIOMETRY_CHOICE);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(PASSCODE_CHOICE);
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSWORD,
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'com.metamask',
      });
    });

    it('should throw an error when Keychain reset is unsuccessful', async () => {
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn();
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(false);

      await expect(SecureKeychain.resetGenericPassword()).rejects.toThrow('Keychain reset operation failed');

      expect(console.warn).toHaveBeenCalledWith('Keychain reset operation returned false');

      console.warn = originalConsoleWarn;
    });

    it('should handle errors when resetting generic password', async () => {
      const mockError = new Error('Reset failed');
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValue(mockError);

      await expect(SecureKeychain.resetGenericPassword()).rejects.toThrow('Failed to reset generic password: Reset failed');
    });
  });

  describe('getGenericPassword', () => {

  describe('getGenericPassword', () => {
    it('should get and decrypt generic password', async () => {
      const mockEncryptedPassword = 'encryptedPassword';
      const mockDecryptedPassword = { password: 'decryptedPassword' };

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        password: mockEncryptedPassword,
        username: 'metamask-user',
      });
      const { mockDecrypt } = jest.requireMock('./Encryptor');
      mockDecrypt.mockResolvedValue(mockDecryptedPassword);

      const result = await SecureKeychain.getGenericPassword();

      expect(result).toEqual({
        password: 'decryptedPassword',
        username: 'metamask-user',
      });
      expect(mockDecrypt).toHaveBeenCalledWith(mockSalt, mockEncryptedPassword);
    });

    it('should return null if no password is found', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await SecureKeychain.getGenericPassword();

      expect(result).toBeNull();
    });

    it('should throw an error if getGenericPassword fails', async () => {
      const mockError = new Error('Failed to get password');
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(mockError);

      await expect(SecureKeychain.getGenericPassword()).rejects.toThrow('Failed to get password');
    });

    it('should set isAuthenticating to false after successful retrieval', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        password: 'encryptedPassword',
        username: 'metamask-user',
      });

      await SecureKeychain.getGenericPassword();

      expect(SecureKeychain.getInstance()?.isAuthenticating).toBe(false);
    });

    it('should set isAuthenticating to false after failed retrieval', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('Failed'));

      await expect(SecureKeychain.getGenericPassword()).rejects.toThrow();

      expect(SecureKeychain.getInstance()?.isAuthenticating).toBe(false);
    });
  });

  describe('setGenericPassword', () => {
    const mockPassword = 'password123';
    const mockEncryptedPassword = 'encryptedPassword123';

    beforeEach(() => {
      const { mockEncrypt } = jest.requireMock('./Encryptor');
      mockEncrypt.mockResolvedValue(mockEncryptedPassword);
    });

    it('should set biometric password', async () => {
      const { mockEncrypt } = jest.requireMock('./Encryptor');
      await SecureKeychain.setGenericPassword(mockPassword, SecureKeychain.TYPES.BIOMETRICS);

      expect(mockEncrypt).toHaveBeenCalledWith(mockSalt, { password: mockPassword });
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-user',
        mockEncryptedPassword,
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(BIOMETRY_CHOICE, TRUE);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(PASSCODE_CHOICE);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED);
      expect(MetaMetrics.getInstance().addTraitsToUser).toHaveBeenCalledWith({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.BIOMETRIC,
      });
    });

    it('should set passcode', async () => {
      const { mockEncrypt } = jest.requireMock('./Encryptor');
      await SecureKeychain.setGenericPassword(mockPassword, SecureKeychain.TYPES.PASSCODE);

      expect(mockEncrypt).toHaveBeenCalledWith(mockSalt, { password: mockPassword });
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-user',
        mockEncryptedPassword,
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(BIOMETRY_CHOICE);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(PASSCODE_DISABLED);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(PASSCODE_CHOICE, TRUE);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(MetaMetrics.getInstance().addTraitsToUser).toHaveBeenCalledWith({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSCODE,
      });
    });

    it('should set remember me', async () => {
      const { mockEncrypt } = jest.requireMock('./Encryptor');
      await SecureKeychain.setGenericPassword(mockPassword, SecureKeychain.TYPES.REMEMBER_ME);

      expect(mockEncrypt).toHaveBeenCalledWith(mockSalt, { password: mockPassword });
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'metamask-user',
        mockEncryptedPassword,
        expect.not.objectContaining({
          accessControl: expect.anything(),
        })
      );
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(BIOMETRY_CHOICE);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(StorageWrapper.removeItem).toHaveBeenCalledWith(PASSCODE_CHOICE);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(MetaMetrics.getInstance().addTraitsToUser).toHaveBeenCalledWith({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.REMEMBER_ME,
      });
    });

    it('should reset generic password if no type is provided', async () => {
      const resetGenericPasswordMock = jest.spyOn(SecureKeychain, 'resetGenericPassword').mockResolvedValue(true);
      await SecureKeychain.setGenericPassword(mockPassword);

      expect(resetGenericPasswordMock).toHaveBeenCalled();
      expect(MetaMetrics.getInstance().addTraitsToUser).toHaveBeenCalledWith({
        [UserProfileProperty.AUTHENTICATION_TYPE]: AUTHENTICATION_TYPE.PASSWORD,
      });
    });

    it('should throw an error if resetting generic password fails', async () => {
      jest.spyOn(SecureKeychain, 'resetGenericPassword').mockRejectedValue(new Error('Reset failed'));

      await expect(SecureKeychain.setGenericPassword(mockPassword))
        .rejects.toThrow('Failed to reset generic password: Reset failed');
    });

    it('should throw an error if biometric password setting fails', async () => {
      const mockError = new Error('Failed to set biometric password');
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(mockError);

      await expect(SecureKeychain.setGenericPassword(mockPassword, SecureKeychain.TYPES.BIOMETRICS))
        .rejects.toThrow('Failed to set biometric password: Failed to set biometric password');
    });

    it('should throw an error if passcode setting fails', async () => {
      const mockError = new Error('Failed to set passcode');
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(mockError);

      await expect(SecureKeychain.setGenericPassword(mockPassword, SecureKeychain.TYPES.PASSCODE))
        .rejects.toThrow('Failed to set generic password: Failed to set passcode');
    });

    it('should throw an error if remember me setting fails', async () => {
      const mockError = new Error('Failed to set remember me');
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(mockError);

      await expect(SecureKeychain.setGenericPassword(mockPassword, SecureKeychain.TYPES.REMEMBER_ME))
        .rejects.toThrow('Failed to set generic password: Failed to set remember me');
    });

    it('should throw an error for invalid authentication type', async () => {
      await expect(SecureKeychain.setGenericPassword(mockPassword, 'INVALID_TYPE' as any))
        .rejects.toThrow('Invalid authentication type: INVALID_TYPE');
    });

    it('should throw an error if resetting generic password fails', async () => {
      const mockError = new Error('Reset failed');
      jest.spyOn(SecureKeychain, 'resetGenericPassword').mockRejectedValue(mockError);

      await expect(SecureKeychain.setGenericPassword(mockPassword))
        .rejects.toThrow('Failed to reset generic password: Reset failed');
    });
  });
});
});
