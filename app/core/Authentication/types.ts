import { IconName } from '@metamask/design-system-react-native';
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
  /** Whether passcode is available to the app */
  passcodeAvailable: boolean;
  /** Human-readable label for the available device auth tier (e.g. "Face ID", "Device Passcode"). Reflects what the device supports, not the current authType, so the toggle can show the right label when osAuthEnabled is false. */
  authLabel: string;
  /** Description for the available authentication type */
  authDescription: string;
  /** Icon name for the available device auth tier (e.g. "Face ID", "Device Passcode"). Reflects what the app will use to authentication */
  authIcon: IconName;
  /** Whether the OS-level authentication is enabled (from user preference in Redux) */
  osAuthEnabled: boolean;
  /** Whether Remember Me is enabled (from user preference in Redux) */
  allowLoginWithRememberMe: boolean;
  /** The derived AUTHENTICATION_TYPE for keychain storage based on capabilities + user preference. Priority: REMEMBER_ME > BIOMETRIC > PASSCODE > PASSWORD */
  authType: AUTHENTICATION_TYPE;
  /** True when device auth cannot be used until the user changes device settings */
  deviceAuthRequiresSettings: boolean;
}
