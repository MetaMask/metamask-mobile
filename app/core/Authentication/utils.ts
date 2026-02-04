import { containsErrorMessage } from '../../util/errorHandling';
import { UnlockWalletErrorType } from './types';
import { MIN_PASSWORD_LENGTH, UNLOCK_WALLET_ERROR_MESSAGES } from './constants';
import { SeedlessOnboardingControllerError } from '../Engine/controllers/seedless-onboarding-controller/error';
import { AuthenticationType } from 'expo-local-authentication';
import { Platform } from 'react-native';

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
 * Gets a human-readable label for the authentication toggle based on device capabilities.
 * Prioritizes biometrics first, then device passcode, with platform-specific labels.
 *
 * iOS: "Face ID" | "Touch ID" | "Device Passcode" | ""
 * Android: "Biometrics" | "Device PIN/Pattern" | ""
 */
export const getAuthToggleLabel = ({
  isBiometricsAvailable,
  supportedOSAuthenticationTypes,
  passcodeAvailable,
}: {
  isBiometricsAvailable: boolean;
  supportedOSAuthenticationTypes: AuthenticationType[];
  passcodeAvailable: boolean;
}): string => {
  // Priority 1: Biometrics (if available)
  if (isBiometricsAvailable && supportedOSAuthenticationTypes.length > 0) {
    if (Platform.OS === 'ios') {
      if (
        supportedOSAuthenticationTypes.includes(
          AuthenticationType.FACIAL_RECOGNITION,
        )
      ) {
        return 'Face ID';
      }
      if (
        supportedOSAuthenticationTypes.includes(AuthenticationType.FINGERPRINT)
      ) {
        return 'Touch ID';
      }
    } else {
      // Android uses generic "Biometrics" label
      return 'Biometrics';
    }
  }

  // Priority 2: Device passcode (if available)
  if (passcodeAvailable) {
    return Platform.OS === 'ios' ? 'Device Passcode' : 'Device PIN/Pattern';
  }

  // Priority 3: No OS authentication available
  return '';
};

/**
 * Checks if the password meets the minimum length requirement
 *
 * @param password - The password to check
 * @returns - boolean indicating if the password meets the requirements
 */
export const checkPasswordRequirement = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH;
