import { containsErrorMessage } from '../../util/errorHandling';
import { UnlockWalletErrorType } from './types';
import { MIN_PASSWORD_LENGTH, UNLOCK_WALLET_ERROR_MESSAGES } from './constants';
import { SeedlessOnboardingControllerError } from '../Engine/controllers/seedless-onboarding-controller/error';
import { AuthenticationType } from 'expo-local-authentication';
import { Platform } from 'react-native';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import { IconName } from '@metamask/design-system-react-native';

/**
 * Handles password submission errors by throwing the appropriate error.
 *
 * @param error - The error to handle.
 * @returns - void
 */
export const handlePasswordSubmissionError = (error: Error) => {
  const loginErrorMessage = error.message || error.toString();

  if (error instanceof SeedlessOnboardingControllerError) {
    // Detected seedless onboarding controller error. Propogate error.
    throw error;
  } else if (
    containsErrorMessage(error, UNLOCK_WALLET_ERROR_MESSAGES.WRONG_PASSWORD) ||
    containsErrorMessage(
      error,
      UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_WRONG_PASSWORD,
    ) ||
    containsErrorMessage(
      error,
      UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_WRONG_PASSWORD_2,
    )
  ) {
    // Invalid password.
    throw new Error(
      `${UnlockWalletErrorType.INVALID_PASSWORD}: ${loginErrorMessage}`,
    );
  } else if (
    containsErrorMessage(error, UNLOCK_WALLET_ERROR_MESSAGES.PASSCODE_NOT_SET)
  ) {
    // Password is not set. Is this an empty password?
    throw new Error(
      `${UnlockWalletErrorType.PASSWORD_NOT_SET}: ${loginErrorMessage}`,
    );
  } else if (
    containsErrorMessage(
      error,
      UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS,
    )
  ) {
    // User cancelled biometrics.
    throw new Error(
      `${UnlockWalletErrorType.IOS_USER_CANCELLED_BIOMETRICS}: ${loginErrorMessage}`,
    );
  } else if (
    containsErrorMessage(error, UNLOCK_WALLET_ERROR_MESSAGES.ANDROID_PIN_DENIED)
  ) {
    // Pin code denied.
    throw new Error(
      `${UnlockWalletErrorType.ANDROID_PIN_DENIED}: ${loginErrorMessage}`,
    );
  } else if (
    containsErrorMessage(
      error,
      UNLOCK_WALLET_ERROR_MESSAGES.PREVIOUS_VAULT_NOT_FOUND,
    ) ||
    containsErrorMessage(error, UNLOCK_WALLET_ERROR_MESSAGES.JSON_PARSE_ERROR)
  ) {
    // Vault corruption detected.
    throw new Error(
      `${UnlockWalletErrorType.VAULT_CORRUPTION}: ${loginErrorMessage}`,
    );
  } else {
    // Other password submission errors.
    throw new Error(
      `${UnlockWalletErrorType.UNRECOGNIZED_ERROR}: ${loginErrorMessage}`,
    );
  }
};

/**
 * Derives the auth type for keychain storage (what the system actually uses).
 * Order: Remember Me > osAuthEnabled > legacy explicit choice > new tiered fallback (biometrics → passcode → password).
 *
 * @param params.allowLoginWithRememberMe - Legacy - Whether the user has enabled remember me
 * @param params.osAuthEnabled - Whether the user has enabled os auth
 * @param params.legacyUserChoseBiometrics - Legacy - Whether the user has chosen biometrics
 * @param params.legacyUserChosePasscode - Legacy - Whether the user has chosen passcode
 * @param params.isBiometricsAvailable - Whether the device has biometrics available
 * @param params.passcodeAvailable - Whether the device has passcode available
 * @returns The AUTHENTICATION_TYPE to use for keychain/auth
 */
export const getAuthType = ({
  allowLoginWithRememberMe,
  osAuthEnabled,
  legacyUserChoseBiometrics,
  legacyUserChosePasscode,
  isBiometricsAvailable,
  passcodeAvailable,
}: {
  allowLoginWithRememberMe: boolean;
  osAuthEnabled: boolean;
  legacyUserChoseBiometrics: boolean;
  legacyUserChosePasscode: boolean;
  isBiometricsAvailable: boolean;
  passcodeAvailable: boolean;
}): AUTHENTICATION_TYPE => {
  // Legacy condition
  if (allowLoginWithRememberMe) {
    return AUTHENTICATION_TYPE.REMEMBER_ME;
  }
  if (!osAuthEnabled) {
    return AUTHENTICATION_TYPE.PASSWORD;
  }
  // Legacy condition
  if (legacyUserChoseBiometrics) {
    return isBiometricsAvailable
      ? AUTHENTICATION_TYPE.BIOMETRIC
      : AUTHENTICATION_TYPE.PASSWORD;
  }
  // Legacy condition
  if (legacyUserChosePasscode) {
    return passcodeAvailable
      ? AUTHENTICATION_TYPE.PASSCODE
      : AUTHENTICATION_TYPE.PASSWORD;
  }
  if (isBiometricsAvailable) {
    return AUTHENTICATION_TYPE.BIOMETRIC;
  }
  if (passcodeAvailable) {
    return AUTHENTICATION_TYPE.PASSCODE;
  }
  return AUTHENTICATION_TYPE.PASSWORD;
};

/**
 * Gets a human-readable label based on the authentication and supported biometric types.
 *
 * iOS: "Remember Me" | "Face ID" | "Touch ID" | "Device Passcode" | "Password"
 * Android: "Remember Me" | "Device Authentication" | "Password"
 *
 * @param params.supportedBiometricTypes - The supported biometric types
 * @param params.allowLoginWithRememberMe - Legacy - Whether the user has enabled remember me
 * @param params.legacyUserChoseBiometrics - Legacy - Whether the user has chosen biometrics
 * @param params.legacyUserChosePasscode - Legacy - Whether the user has chosen passcode
 * @param params.isBiometricsAvailable - Whether the device has biometrics available
 * @param params.passcodeAvailable - Whether the device has passcode available
 * @returns The human-readable label for the authentication type
 */
export const getAuthLabel = ({
  supportedBiometricTypes,
  allowLoginWithRememberMe,
  legacyUserChoseBiometrics,
  legacyUserChosePasscode,
  isBiometricsAvailable,
  passcodeAvailable,
}: {
  supportedBiometricTypes: AuthenticationType[];
  allowLoginWithRememberMe: boolean;
  legacyUserChoseBiometrics: boolean;
  legacyUserChosePasscode: boolean;
  isBiometricsAvailable: boolean;
  passcodeAvailable: boolean;
}): string => {
  if (allowLoginWithRememberMe) {
    return 'Remember Me';
  }
  if (legacyUserChoseBiometrics) {
    // Show explicit authentication type for legacy biometrics
    if (Platform.OS === 'ios') {
      if (
        supportedBiometricTypes.includes(AuthenticationType.FACIAL_RECOGNITION)
      ) {
        return 'Face ID';
      }
      if (supportedBiometricTypes.includes(AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      }
    }
    return 'Device Authentication';
  }
  if (legacyUserChosePasscode) {
    // Show explicit authentication type for legacy passcode
    return Platform.OS === 'ios' ? 'Device Passcode' : 'Device Authentication';
  }
  if (isBiometricsAvailable || passcodeAvailable) {
    // Modernized authentication access allows for both biometrics and passcode
    // Here we return the generic "Device Authentication" label since the system will handle access control to use
    return 'Device Authentication';
  }
  return 'Password';
};

/**
 * Gets the icon name for the available device auth tier.
 *
 * @param params.supportedBiometricTypes - The supported biometric types
 * @param params.legacyUserChoseBiometrics - Legacy - Whether the user has chosen biometrics
 * @param params.legacyUserChosePasscode - Legacy - Whether the user has chosen passcode
 * @param params.isBiometricsAvailable - Whether the device has biometrics available
 * @param params.passcodeAvailable - Whether the device has passcode available
 * @returns The icon name for the available device auth tier
 */
export const getAuthIcon = ({
  supportedBiometricTypes,
  legacyUserChoseBiometrics,
  legacyUserChosePasscode,
  isBiometricsAvailable,
  passcodeAvailable,
}: {
  supportedBiometricTypes: AuthenticationType[];
  legacyUserChoseBiometrics: boolean;
  legacyUserChosePasscode: boolean;
  isBiometricsAvailable: boolean;
  passcodeAvailable: boolean;
}): IconName => {
  const getIosBiometricIcon = (): IconName => {
    if (
      supportedBiometricTypes.includes(AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return IconName.FaceId;
    }
    if (supportedBiometricTypes.includes(AuthenticationType.FINGERPRINT)) {
      return IconName.Fingerprint;
    }
    return IconName.Lock;
  };

  if (Platform.OS === 'ios') {
    if (legacyUserChoseBiometrics) {
      // Show explicit authentication type for legacy biometrics
      return getIosBiometricIcon();
    }
    if (legacyUserChosePasscode) {
      // Show explicit authentication type for legacy passcode
      return IconName.Lock;
    }
    if (isBiometricsAvailable) {
      // Modernized authentication access allows for both biometrics and passcode
      return getIosBiometricIcon();
    }
    if (passcodeAvailable) {
      return IconName.Lock;
    }
  }

  // Android and iOS fallback shows "Lock" icon
  return IconName.Lock;
};

/**
 * Checks if the password meets the minimum length requirement
 *
 * @param password - The password to check
 * @returns - boolean indicating if the password meets the requirements
 */
export const checkPasswordRequirement = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH;
