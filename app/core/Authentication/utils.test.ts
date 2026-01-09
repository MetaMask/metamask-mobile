import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { PasswordSubmissionErrorType, UnlockErrorType } from './types';
import {
  handlePasswordSubmissionError,
  checkPasswordRequirement,
} from './utils';

// TODO: Organize this by where errors are derived from. Ex: Seedless onboarding related errors vs Keyring related errors.
describe('handlePasswordSubmissionError', () => {
  it('throw error if seedless onboarding controller error is detected', () => {
    const error = new SeedlessOnboardingControllerError(
      SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(error);
  });

  it('throw error if wrong password error is detected', () => {
    const error = new Error(PasswordSubmissionErrorType.WRONG_PASSWORD_ERROR);
    const expectedThrownError = new Error(
      `${UnlockErrorType.INVALID_PASSWORD}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throw error if passcode not set error is detected', () => {
    const error = new Error(PasswordSubmissionErrorType.PASSCODE_NOT_SET_ERROR);
    const expectedThrownError = new Error(
      `${UnlockErrorType.PASSWORD_NOT_SET}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throw error if deny pin error is detected', () => {
    const error = new Error(PasswordSubmissionErrorType.DENY_PIN_ERROR_ANDROID);
    const expectedThrownError = new Error(
      `${UnlockErrorType.ANDROID_PIN_DENIED}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throw error if vault corruption error is detected', () => {
    const error = new Error(PasswordSubmissionErrorType.VAULT_ERROR);
    const expectedThrownError = new Error(
      `${UnlockErrorType.VAULT_CORRUPTION}: ${error.message}`,
    );
    expect(() => handlePasswordSubmissionError(error)).toThrow(
      expectedThrownError,
    );
  });

  it('throw error if other password submission errors are detected', () => {
    const error = new Error('Unrecognized error!');
    const expectedThrownError = new Error(
      `${UnlockErrorType.UNRECOGNIZED_ERROR}: ${error.message}`,
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
