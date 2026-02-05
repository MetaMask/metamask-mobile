import { Platform } from 'react-native';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { UnlockWalletErrorType } from './types';
import { UNLOCK_WALLET_ERROR_MESSAGES } from './constants';
import {
  handlePasswordSubmissionError,
  checkPasswordRequirement,
  getAuthToggleLabel,
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

describe('getAuthToggleLabel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('iOS', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'ios');
    });

    it('returns "Face ID" when facial recognition is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [AuthenticationType.FACIAL_RECOGNITION],
        passcodeAvailable: true,
      });
      expect(result).toBe('Face ID');
    });

    it('returns "Touch ID" when fingerprint is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [AuthenticationType.FINGERPRINT],
        passcodeAvailable: true,
      });
      expect(result).toBe('Touch ID');
    });

    it('returns "Face ID" when both facial recognition and fingerprint are available (Face ID priority)', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [
          AuthenticationType.FACIAL_RECOGNITION,
          AuthenticationType.FINGERPRINT,
        ],
        passcodeAvailable: true,
      });
      expect(result).toBe('Face ID');
    });

    it('returns "Device Passcode" when no biometrics but passcode is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: false,
        supportedOSAuthenticationTypes: [],
        passcodeAvailable: true,
      });
      expect(result).toBe('Device Passcode');
    });

    it('returns empty string when nothing is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: false,
        supportedOSAuthenticationTypes: [],
        passcodeAvailable: false,
      });
      expect(result).toBe('');
    });

    it('returns "Device Passcode" when biometrics hardware exists but is disabled', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: false,
        supportedOSAuthenticationTypes: [AuthenticationType.FACIAL_RECOGNITION],
        passcodeAvailable: true,
      });
      expect(result).toBe('Device Passcode');
    });

    it('returns empty string when isBiometricsAvailable is true but supportedOSAuthenticationTypes is empty', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [],
        passcodeAvailable: false,
      });
      expect(result).toBe('');
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('returns "Biometrics" when fingerprint is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [AuthenticationType.FINGERPRINT],
        passcodeAvailable: true,
      });
      expect(result).toBe('Biometrics');
    });

    it('returns "Biometrics" when facial recognition is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [AuthenticationType.FACIAL_RECOGNITION],
        passcodeAvailable: true,
      });
      expect(result).toBe('Biometrics');
    });

    it('returns "Biometrics" when iris is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: true,
        supportedOSAuthenticationTypes: [AuthenticationType.IRIS],
        passcodeAvailable: true,
      });
      expect(result).toBe('Biometrics');
    });

    it('returns "Device PIN/Pattern" when no biometrics but passcode is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: false,
        supportedOSAuthenticationTypes: [],
        passcodeAvailable: true,
      });
      expect(result).toBe('Device PIN/Pattern');
    });

    it('returns empty string when nothing is available', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: false,
        supportedOSAuthenticationTypes: [],
        passcodeAvailable: false,
      });
      expect(result).toBe('');
    });

    it('returns "Device PIN/Pattern" when biometrics hardware exists but is not enrolled', () => {
      const result = getAuthToggleLabel({
        isBiometricsAvailable: false,
        supportedOSAuthenticationTypes: [AuthenticationType.FINGERPRINT],
        passcodeAvailable: true,
      });
      expect(result).toBe('Device PIN/Pattern');
    });
  });
});
