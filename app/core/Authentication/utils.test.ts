import { Platform } from 'react-native';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { UnlockWalletErrorType } from './types';
import { UNLOCK_WALLET_ERROR_MESSAGES } from './constants';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import {
  handlePasswordSubmissionError,
  checkPasswordRequirement,
  getAuthLabel,
  getAuthType,
  getAuthIcon,
  isAndroidKeychainBiometricLockout,
  isAndroidKeychainBiometricUserCancellation,
  isIosUserCancelledBiometricUnlock,
  isBiometricUnlockCancelledByUser,
} from './utils';
import { IconName } from '@metamask/design-system-react-native';
import { AuthenticationType } from 'expo-local-authentication';

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// TODO: Organize this by where errors are derived from. Ex: Seedless onboarding related errors vs Keyring related errors.
describe('handlePasswordSubmissionError', () => {
  it('throws error if seedless onboarding controller error is detected', () => {
    const error = new SeedlessOnboardingControllerError(
      SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(error);
  });

  it('throws error if wrong password error is detected', () => {
    const error = new Error(UNLOCK_WALLET_ERROR_MESSAGES.WRONG_PASSWORD);
    const expectedThrownError = new Error(
      `${UnlockWalletErrorType.INVALID_PASSWORD}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throws error if passcode not set error is detected', () => {
    const error = new Error(UNLOCK_WALLET_ERROR_MESSAGES.PASSCODE_NOT_SET);
    const expectedThrownError = new Error(
      `${UnlockWalletErrorType.PASSWORD_NOT_SET}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throws error if deny pin error is detected', () => {
    const error = new Error(UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_PIN_DENIED);
    const expectedThrownError = new Error(
      `${UnlockWalletErrorType.ANDROID_PIN_DENIED}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throws error if user cancelled biometrics error is detected', () => {
    const error = new Error(
      UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS,
    );
    const expectedThrownError = new Error(
      `${UnlockWalletErrorType.IOS_USER_CANCELLED_BIOMETRICS}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throws error if vault corruption error is detected', () => {
    const error = new Error(
      UNLOCK_WALLET_ERROR_MESSAGES.PREVIOUS_VAULT_NOT_FOUND,
    );
    const expectedThrownError = new Error(
      `${UnlockWalletErrorType.VAULT_CORRUPTION}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throws error if other password submission errors are detected', () => {
    const error = new Error('Unrecognized error!');
    const expectedThrownError = new Error(
      `${UnlockWalletErrorType.UNRECOGNIZED_ERROR}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });
});

describe('isAndroidKeychainBiometricLockout', () => {
  it.each([
    ['code: 7, msg: Too many attempts. Try again later.', true],
    ['code:7, msg: lockout', true],
    ['code: 10, msg: Fingerprint operation canceled by user', false],
  ])('returns %s -> %s', (message, expected) => {
    expect(isAndroidKeychainBiometricLockout(new Error(message))).toBe(
      expected,
    );
  });
});

describe('isAndroidKeychainBiometricUserCancellation', () => {
  it.each([
    ['code: 10, msg: Fingerprint operation canceled by user', true],
    ['code:5, msg: canceled', true],
    ['code: 13, msg: negative button', true],
    ['code: 7, msg: lockout', false],
    ['User canceled the operation', false],
  ])('returns %s -> %s', (message, expected) => {
    expect(isAndroidKeychainBiometricUserCancellation(new Error(message))).toBe(
      expected,
    );
  });
});

describe('isIosUserCancelledBiometricUnlock', () => {
  it('returns true for the iOS LocalAuthentication cancel message', () => {
    expect(
      isIosUserCancelledBiometricUnlock(
        new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
      ),
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isIosUserCancelledBiometricUnlock(new Error('Decrypt failed'))).toBe(
      false,
    );
  });
});

describe('isBiometricUnlockCancelledByUser', () => {
  it('returns true for Android keychain user-cancel shape', () => {
    expect(
      isBiometricUnlockCancelledByUser(
        new Error('code: 10, msg: Fingerprint operation canceled by user'),
      ),
    ).toBe(true);
  });

  it('returns true for iOS user cancel message', () => {
    expect(
      isBiometricUnlockCancelledByUser(
        new Error(UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS),
      ),
    ).toBe(true);
  });

  it('returns true for Android legacy Error: Cancel', () => {
    expect(
      isBiometricUnlockCancelledByUser(
        new Error(UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_PIN_DENIED),
      ),
    ).toBe(true);
  });
});

describe('getAuthType', () => {
  const baseParams = {
    allowLoginWithRememberMe: false,
    osAuthEnabled: false,
    legacyUserChoseBiometrics: false,
    legacyUserChosePasscode: false,
    isBiometricsAvailable: false,
    passcodeAvailable: false,
  };

  it('returns REMEMBER_ME when allowLoginWithRememberMe is true', () => {
    const result = getAuthType({
      ...baseParams,
      allowLoginWithRememberMe: true,
      osAuthEnabled: true,
      isBiometricsAvailable: true,
      passcodeAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('returns PASSWORD when osAuthEnabled is false', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: false,
      isBiometricsAvailable: true,
      passcodeAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('returns BIOMETRIC when legacyUserChoseBiometrics and isBiometricsAvailable', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      legacyUserChoseBiometrics: true,
      isBiometricsAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('returns PASSWORD when legacyUserChoseBiometrics but not isBiometricsAvailable', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      legacyUserChoseBiometrics: true,
      isBiometricsAvailable: false,
      passcodeAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('returns PASSCODE when legacyUserChosePasscode and passcodeAvailable', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      legacyUserChosePasscode: true,
      passcodeAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('returns PASSWORD when legacyUserChosePasscode but not passcodeAvailable', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      legacyUserChosePasscode: true,
      passcodeAvailable: false,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('returns BIOMETRIC when osAuthEnabled and isBiometricsAvailable (tiered fallback)', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      isBiometricsAvailable: true,
      passcodeAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('returns PASSCODE when osAuthEnabled, no biometrics, passcodeAvailable (tiered fallback)', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      isBiometricsAvailable: false,
      passcodeAvailable: true,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('returns PASSWORD when osAuthEnabled but neither biometrics nor passcode available', () => {
    const result = getAuthType({
      ...baseParams,
      osAuthEnabled: true,
      isBiometricsAvailable: false,
      passcodeAvailable: false,
    });
    expect(result).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });
});

describe('checkPasswordRequirement', () => {
  it('return true if password equals the minimum length requirement', () => {
    const password = 'password';
    expect(checkPasswordRequirement(password)).toBe(true);
  });

  it('return true if password exceeds the minimum length requirement', () => {
    const password = 'password9';
    expect(checkPasswordRequirement(password)).toBe(true);
  });

  it('return false if password does not meet the minimum length requirement', () => {
    const password = 'passwor';
    expect(checkPasswordRequirement(password)).toBe(false);
  });
});

describe('getAuthLabel', () => {
  const baseParams = {
    supportedBiometricTypes: [] as number[],
    allowLoginWithRememberMe: false,
    legacyUserChoseBiometrics: false,
    legacyUserChosePasscode: false,
    isBiometricsAvailable: false,
    passcodeAvailable: false,
  };

  describe('iOS', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'ios');
    });

    it('returns remember_me label key when allowLoginWithRememberMe is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        allowLoginWithRememberMe: true,
      });
      expect(result).toBe('authentication.labels.remember_me');
    });

    it('returns face_id label key when legacyUserChoseBiometrics and Face ID supported', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe('authentication.labels.face_id');
    });

    it('returns touch_id label key when legacyUserChoseBiometrics and Touch ID supported', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('authentication.labels.touch_id');
    });

    it('returns device_passcode label key when legacyUserChosePasscode is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChosePasscode: true,
      });
      expect(result).toBe('authentication.labels.device_passcode');
    });

    it('returns device_authentication label key when isBiometricsAvailable (modern path)', () => {
      const result = getAuthLabel({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe('authentication.labels.device_authentication');
    });

    it('returns device_authentication label key when passcodeAvailable (modern path)', () => {
      const result = getAuthLabel({
        ...baseParams,
        passcodeAvailable: true,
      });
      expect(result).toBe('authentication.labels.device_authentication');
    });

    it('returns password label key when nothing is available', () => {
      const result = getAuthLabel(baseParams);
      expect(result).toBe('login.password');
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('returns remember_me label key when allowLoginWithRememberMe is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        allowLoginWithRememberMe: true,
      });
      expect(result).toBe('authentication.labels.remember_me');
    });

    it('returns device_authentication label key when legacyUserChoseBiometrics (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('authentication.labels.device_authentication');
    });

    it('returns device_authentication label key when legacyUserChosePasscode (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChosePasscode: true,
      });
      expect(result).toBe('authentication.labels.device_authentication');
    });

    it('returns device_authentication label key when isBiometricsAvailable (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('authentication.labels.device_authentication');
    });

    it('returns device_authentication label key when passcodeAvailable (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        passcodeAvailable: true,
      });
      expect(result).toBe('authentication.labels.device_authentication');
    });

    it('returns password label key when nothing is available', () => {
      const result = getAuthLabel(baseParams);
      expect(result).toBe('login.password');
    });
  });
});

describe('getAuthIcon', () => {
  const baseParams = {
    supportedBiometricTypes: [] as number[],
    legacyUserChoseBiometrics: false,
    legacyUserChosePasscode: false,
    isBiometricsAvailable: false,
    passcodeAvailable: false,
  };

  describe('ios', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'ios');
    });

    it('returns FaceId when legacyUserChoseBiometrics and Face ID supported', () => {
      const result = getAuthIcon({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe(IconName.FaceId);
    });

    it('returns Fingerprint when legacyUserChoseBiometrics and Touch ID supported', () => {
      const result = getAuthIcon({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe(IconName.Fingerprint);
    });

    it('returns Lock when legacyUserChoseBiometrics and only IRIS supported', () => {
      const result = getAuthIcon({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.IRIS],
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns Lock when legacyUserChosePasscode is true', () => {
      const result = getAuthIcon({
        ...baseParams,
        legacyUserChosePasscode: true,
        passcodeAvailable: true,
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns FaceId when isBiometricsAvailable and Face ID supported (modern path)', () => {
      const result = getAuthIcon({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe(IconName.FaceId);
    });

    it('returns Fingerprint when isBiometricsAvailable and Fingerprint supported (modern path)', () => {
      const result = getAuthIcon({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe(IconName.Fingerprint);
    });

    it('returns Lock when passcodeAvailable only (modern path)', () => {
      const result = getAuthIcon({
        ...baseParams,
        passcodeAvailable: true,
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns Lock when neither biometrics nor passcode available', () => {
      const result = getAuthIcon(baseParams);
      expect(result).toBe(IconName.Lock);
    });
  });

  describe('android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('returns Lock when legacyUserChoseBiometrics (Android always uses Lock)', () => {
      const result = getAuthIcon({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns Lock when legacyUserChosePasscode', () => {
      const result = getAuthIcon({
        ...baseParams,
        legacyUserChosePasscode: true,
        passcodeAvailable: true,
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns Lock when isBiometricsAvailable', () => {
      const result = getAuthIcon({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns Lock when passcodeAvailable only', () => {
      const result = getAuthIcon({
        ...baseParams,
        passcodeAvailable: true,
      });
      expect(result).toBe(IconName.Lock);
    });

    it('returns Lock when nothing is available', () => {
      const result = getAuthIcon(baseParams);
      expect(result).toBe(IconName.Lock);
    });
  });
});
