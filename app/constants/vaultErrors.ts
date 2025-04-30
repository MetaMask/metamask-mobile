export enum VaultErrorType {
  // Keychain/Storage related errors
  KEYCHAIN_ACCESS_ERROR = 'KEYCHAIN_ACCESS_ERROR',
  VAULT_BACKUP_NOT_FOUND = 'VAULT_BACKUP_NOT_FOUND',
  VAULT_CORRUPTION = 'VAULT_CORRUPTION',
  INVALID_VAULT_DATA = 'INVALID_VAULT_DATA',

  // Authentication related errors
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  BIOMETRIC_CHANGED = 'BIOMETRIC_CHANGED',
  DEVICE_SECURITY_CHANGED = 'DEVICE_SECURITY_CHANGED',

  // Recovery related errors
  RECOVERY_FAILED = 'RECOVERY_FAILED',
  BACKUP_VERIFICATION_FAILED = 'BACKUP_VERIFICATION_FAILED',
  NO_RECOVERY_OPTIONS = 'NO_RECOVERY_OPTIONS',
}

export interface VaultError {
  type: VaultErrorType;
  originalError?: Error;
  timestamp: number;
  debugInfo?: {
    errorType: string;
    hasKeyringState?: boolean;
    hasVault?: boolean;
    vaultLength?: number;
    hasKeychainAccess?: boolean;
    hasBackup?: boolean;
    passwordLength?: number;
    authType?: string;
    hasBiometry?: boolean;
    rememberMe?: boolean;
  };
}

export function createVaultError(
  type: VaultErrorType,
  originalError?: Error,
  debugInfo?: VaultError['debugInfo']
): VaultError {
  return {
    type,
    originalError,
    timestamp: Date.now(),
    debugInfo
  };
}
