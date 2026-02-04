import AUTHENTICATION_TYPE from '../../constants/userProperties';

/**
 * Verbose error types for unlocking the wallet.
 */
export enum UnlockWalletErrorType {
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PASSWORD_NOT_SET = 'PASSWORD_NOT_SET',
  ANDROID_PIN_DENIED = 'ANDROID_PIN_DENIED',
  VAULT_CORRUPTION = 'VAULT_CORRUPTION',
  UNRECOGNIZED_ERROR = 'UNRECOGNIZED_ERROR',
  IOS_USER_CANCELLED_BIOMETRICS = 'IOS_USER_CANCELLED_BIOMETRICS',
}

/**
 * Verbose error types for reauthenticating the wallet.
 */
export enum ReauthenticateErrorType {
  PASSWORD_NOT_SET_WITH_BIOMETRICS = 'PASSWORD_NOT_SET_WITH_BIOMETRICS',
  BIOMETRIC_ERROR = 'BIOMETRIC_ERROR',
}

/**
 * Detailed information about available authentication capabilities.
 */
export interface AuthCapabilities {
  /** Whether biometrics are enrolled and available to this app */
  isBiometricsAvailable: boolean;
  /** If device supports biometrics but they're not available to the app (iOS: permission denied, Android: not enrolled) */
  biometricsDisabledOnOS: boolean;
  /** Whether the authentication toggle is visible (based on biometric-first priority) */
  isAuthToggleVisible: boolean;
  /** Human-readable label for the toggle (e.g., "Face ID", "Biometrics", "Device Passcode") */
  authToggleLabel: string;
  /** Whether the OS-level authentication is enabled (from user preference in Redux) */
  osAuthEnabled: boolean;
  /** The derived AUTHENTICATION_TYPE for keychain storage based on capabilities + user preference */
  authStorageType: AUTHENTICATION_TYPE;
}
