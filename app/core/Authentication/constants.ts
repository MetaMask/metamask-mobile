/**
 * Error messages that can be thrown when calling the unlockWallet method.
 */
export const UNLOCK_WALLET_ERROR_MESSAGES = {
  // Android specific error messages.
  ANDROID_WRONG_PASSWORD:
    'Error: error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT',
  ANDROID_WRONG_PASSWORD_2: 'Error: error in DoCipher, status: 2',
  ANDROID_PIN_DENIED: 'Error: Error: Cancel',
  // iOS specific error messages.
  IOS_USER_CANCELLED_BIOMETRICS: 'User canceled the operation',
  // General error messages.
  PASSCODE_NOT_SET: 'Error: Passcode not set.',
  WRONG_PASSWORD: 'Error: Decrypt failed',
  PREVIOUS_VAULT_NOT_FOUND: 'Cannot unlock without a previous vault.',
  JSON_PARSE_ERROR: 'Error: JSON Parse error',
  PASSWORD_REQUIREMENTS_NOT_MET: 'Password requirements not met',
};

/**
 * Minimum password length.
 */
export const MIN_PASSWORD_LENGTH = 8;
