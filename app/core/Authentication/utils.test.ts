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
  getAuthType,
  getAuthLabel,
} from './utils';
import { AuthenticationType } from 'expo-local-authentication';
import AUTHENTICATION_TYPE from '../../constants/userProperties';

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

const baseAuthUtilParams = {
  allowLoginWithRememberMe: false,
  legacyUserChoseBiometrics: false,
  legacyUserChosePasscode: false,
  isBiometricsAvailable: false,
  passcodeAvailable: false,
  supportedBiometricTypes: [] as number[],
};

describe('getAuthType', () => {
  it('returns REMEMBER_ME when allowLoginWithRememberMe is true', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: true,
        osAuthEnabled: false,
        isBiometricsAvailable: true,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('returns BIOMETRIC when legacyUserChoseBiometrics is true and isBiometricsAvailable is true', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        legacyUserChoseBiometrics: true,
        isBiometricsAvailable: true,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('returns PASSWORD when legacyUserChoseBiometrics is true and isBiometricsAvailable is false', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        legacyUserChoseBiometrics: true,
        isBiometricsAvailable: false,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('returns PASSCODE when legacyUserChosePasscode is true and passcodeAvailable is true', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        legacyUserChosePasscode: true,
        isBiometricsAvailable: true,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('returns PASSWORD when legacyUserChosePasscode is true and passcodeAvailable is false', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        legacyUserChosePasscode: true,
        isBiometricsAvailable: false,
        passcodeAvailable: false,
      }),
    ).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('returns PASSWORD when osAuthEnabled is false', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: false,
        isBiometricsAvailable: true,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('returns BIOMETRIC when isBiometricsAvailable is true and passcodeAvailable is true', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        isBiometricsAvailable: true,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('returns PASSCODE when isBiometricsAvailable is false and passcodeAvailable is true', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        isBiometricsAvailable: false,
        passcodeAvailable: true,
      }),
    ).toBe(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('returns PASSWORD when isBiometricsAvailable is false and passcodeAvailable is false', () => {
    expect(
      getAuthType({
        ...baseAuthUtilParams,
        allowLoginWithRememberMe: false,
        osAuthEnabled: true,
        isBiometricsAvailable: false,
        passcodeAvailable: false,
      }),
    ).toBe(AUTHENTICATION_TYPE.PASSWORD);
  });
});

describe('getAuthLabel', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns "Remember Me" when allowLoginWithRememberMe is true', () => {
    const result = getAuthLabel({
      ...baseAuthUtilParams,
      allowLoginWithRememberMe: true,
    });
    expect(result).toBe('Remember Me');
  });

  it('returns "Password" when isBiometricsAvailable is false and passcodeAvailable is false', () => {
    const result = getAuthLabel({
      ...baseAuthUtilParams,
      isBiometricsAvailable: false,
      passcodeAvailable: false,
    });
    expect(result).toBe('Password');
  });

  describe('ios', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'ios');
    });

    it('returns "Face ID" when legacyUserChoseBiometrics is true and facial recognition is supported', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe('Face ID');
    });

    it('returns "Touch ID" when legacyUserChoseBiometrics is true and fingerprint is supported', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        legacyUserChoseBiometrics: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('Touch ID');
    });

    it('returns "Device Passcode" when legacyUserChosePasscode is true', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        legacyUserChosePasscode: true,
      });
      expect(result).toBe('Device Passcode');
    });

    it('returns "Face ID" when isBiometricsAvailable is true and facial recognition is supported', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FACIAL_RECOGNITION],
      });
      expect(result).toBe('Face ID');
    });

    it('returns "Touch ID" when isBiometricsAvailable is true and fingerprint is supported', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        isBiometricsAvailable: true,
        supportedBiometricTypes: [AuthenticationType.FINGERPRINT],
      });
      expect(result).toBe('Touch ID');
    });

    it('returns "Device Passcode" when isBiometricsAvailable is false and passcodeAvailable is true', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        isBiometricsAvailable: false,
        passcodeAvailable: true,
      });
      expect(result).toBe('Device Passcode');
    });
  });

  describe('android', () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, 'OS', 'android');
    });

    it('returns "Biometrics" when legacyUserChoseBiometrics is true', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        legacyUserChoseBiometrics: true,
      });
      expect(result).toBe('Biometrics');
    });

    it("returns 'Device PIN/Pattern' when legacyUserChosePasscode is true", () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        legacyUserChosePasscode: true,
      });
      expect(result).toBe('Device PIN/Pattern');
    });

    it('returns "Biometrics" when isBiometricsAvailable is true', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        isBiometricsAvailable: true,
      });
      expect(result).toBe('Biometrics');
    });

    it('returns "Device PIN/Pattern" when isBiometricsAvailable is false and passcodeAvailable is true', () => {
      const result = getAuthLabel({
        ...baseAuthUtilParams,
        isBiometricsAvailable: false,
        passcodeAvailable: true,
      });
      expect(result).toBe('Device PIN/Pattern');
    });
  });
});
