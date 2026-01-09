import { toLowerCaseEquals } from '../../util/general';
import { containsErrorMessage } from '../../util/errorHandling';
import { UnlockErrorType, PasswordSubmissionErrorType } from './types';
import { MIN_PASSWORD_LENGTH } from './constants';
import { SeedlessOnboardingControllerError } from '../Engine/controllers/seedless-onboarding-controller/error';

/**
 * Handles password submission errors by throwing the appropriate error.
 *
 * @param error - The error to handle.
 * @returns - void
 */
export const handlePasswordSubmissionError = (error: unknown) => {
  const loginError = error as Error;
  const loginErrorMessage = loginError.toString();

  if (error instanceof SeedlessOnboardingControllerError) {
    // Detected seedless onboarding controller error. Propogate error.
    throw error;
  } else if (
    toLowerCaseEquals(
      loginErrorMessage,
      PasswordSubmissionErrorType.WRONG_PASSWORD_ERROR,
    ) ||
    toLowerCaseEquals(
      loginErrorMessage,
      PasswordSubmissionErrorType.WRONG_PASSWORD_ERROR_ANDROID,
    ) ||
    toLowerCaseEquals(
      loginErrorMessage,
      PasswordSubmissionErrorType.WRONG_PASSWORD_ERROR_ANDROID_2,
    ) ||
    loginErrorMessage.includes(
      PasswordSubmissionErrorType.PASSWORD_REQUIREMENTS_NOT_MET,
    )
  ) {
    // Invalid password.
    throw new Error(
      `${UnlockErrorType.INVALID_PASSWORD}: ${loginErrorMessage}`,
    );
  } else if (
    loginErrorMessage === PasswordSubmissionErrorType.PASSCODE_NOT_SET_ERROR
  ) {
    // Password is not set. Is this an empty password?
    throw new Error(
      `${UnlockErrorType.PASSWORD_NOT_SET}: ${loginErrorMessage}`,
    );
  } else if (
    toLowerCaseEquals(
      loginErrorMessage,
      PasswordSubmissionErrorType.DENY_PIN_ERROR_ANDROID,
    )
  ) {
    // Pin code denied.
    throw new Error(
      `${UnlockErrorType.ANDROID_PIN_DENIED}: ${loginErrorMessage}`,
    );
  } else if (
    containsErrorMessage(loginError, PasswordSubmissionErrorType.VAULT_ERROR) ||
    containsErrorMessage(
      loginError,
      PasswordSubmissionErrorType.JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
    )
  ) {
    // Vault corruption detected.
    throw new Error(
      `${UnlockErrorType.VAULT_CORRUPTION}: ${loginErrorMessage}`,
    );
  } else {
    // Other password submission errors.
    throw new Error(
      `${UnlockErrorType.UNRECOGNIZED_ERROR}: ${loginErrorMessage}`,
    );
  }
};

/**
 * Checks if the password meets the minimum length requirement
 *
 * @param password - The password to check
 * @returns - boolean indicating if the password meets the requirements
 */
export const checkPasswordRequirement = (password: string) =>
  password.length >= MIN_PASSWORD_LENGTH;
