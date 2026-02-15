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
} from './utils';
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

    it('returns "Remember Me" when allowLoginWithRememberMe is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        allowLoginWithRememberMe: true,
      });
      expect(result).toBe('Remember Me');
    });

    it('returns "Face ID" when legacyUserChoseBiometrics and Face ID supported', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe('Face ID');
    });

    it('returns "Touch ID" when legacyUserChoseBiometrics and Touch ID supported', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('Touch ID');
    });

    it('returns "Device Passcode" when legacyUserChosePasscode is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChosePasscode: true,
      });
      expect(result).toBe('Device Passcode');
    });

    it('returns "Face ID" when isBiometricsAvailable and Face ID supported', () => {
      const result = getAuthLabel({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe('Face ID');
    });

    it('returns "Device Passcode" when passcodeAvailable is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        passcodeAvailable: true,
      });
      expect(result).toBe('Device Passcode');
    });

    it('returns "Password" when nothing is available', () => {
      const result = getAuthLabel(baseParams);
      expect(result).toBe('Password');
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('returns "Remember Me" when allowLoginWithRememberMe is true', () => {
      const result = getAuthLabel({
        ...baseParams,
        allowLoginWithRememberMe: true,
      });
      expect(result).toBe('Remember Me');
    });

    it('returns "Device Authentication" when legacyUserChoseBiometrics (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('Device Authentication');
    });

    it('returns "Device Authentication" when legacyUserChosePasscode (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        legacyUserChosePasscode: true,
      });
      expect(result).toBe('Device Authentication');
    });

    it('returns "Device Authentication" when isBiometricsAvailable (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('Device Authentication');
    });

    it('returns "Device Authentication" when passcodeAvailable (Android)', () => {
      const result = getAuthLabel({
        ...baseParams,
        passcodeAvailable: true,
      });
      expect(result).toBe('Device Authentication');
    });

    it('returns "Password" when nothing is available', () => {
      const result = getAuthLabel(baseParams);
      expect(result).toBe('Password');
    });
  });
});
