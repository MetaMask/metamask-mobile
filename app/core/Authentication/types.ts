/**
 * Error types that can be thrown when unlocking the wallet.
 */
export enum UnlockErrorType {
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PASSWORD_NOT_SET = 'PASSWORD_NOT_SET',
  ANDROID_PIN_DENIED = 'ANDROID_PIN_DENIED',
  VAULT_CORRUPTION = 'VAULT_CORRUPTION',
  UNRECOGNIZED_ERROR = 'UNRECOGNIZED_ERROR',
}

/**
 * Error types that can be thrown when submitting a password.
 */
export enum PasswordSubmissionErrorType {
  PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.',
  WRONG_PASSWORD_ERROR = 'Error: Decrypt failed',
  WRONG_PASSWORD_ERROR_ANDROID = 'Error: error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT',
  WRONG_PASSWORD_ERROR_ANDROID_2 = 'Error: error in DoCipher, status: 2',
  VAULT_ERROR = 'Cannot unlock without a previous vault.',
  DENY_PIN_ERROR_ANDROID = 'Error: Error: Cancel',
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN = 'Error: JSON Parse error',
  PASSWORD_REQUIREMENTS_NOT_MET = 'Password requirements not met',
}

export enum ReauthenticateErrorType {
  PASSWORD_NOT_SET_WITH_BIOMETRICS = 'PASSWORD_NOT_SET_WITH_BIOMETRICS',
  BIOMETRIC_ERROR = 'BIOMETRIC_ERROR',
}
