import { KeyringControllerState } from '@metamask/keyring-controller';
import Logger from '../../util/Logger';
import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
  Options,
  ACCESSIBLE,
} from 'react-native-keychain';
import { Platform } from 'react-native';
import { VaultErrorType, createVaultError } from '../../constants/vaultErrors';

const VAULT_BACKUP_KEY = 'VAULT_BACKUP';

const options: Options = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface KeyringBackupResponse {
  success: boolean;
  vault?: string;
  error?: {
    type: VaultErrorType;
    message: string;
  };
}

/**
 * places the vault in react-native-keychain for backup
 * @returns Promise<KeyringBackupResponse>
  interface KeyringBackupResponse {
    success: boolean;
    error?: string;
    vault?: string;
  }
 */
export async function backupVault(
  keyringState: KeyringControllerState,
): Promise<KeyringBackupResponse> {
  try {
    const keyringVault = keyringState.vault as string;

    if (!keyringVault) {
      Logger.error(new Error('Invalid vault data in backup attempt'), {
        timestamp: Date.now(),
        deviceInfo: {
          platform: Platform.OS,
          osVersion: Platform.Version.toString(),
          appVersion: '1.0.0'
        },
        debugInfo: {
          hasKeyringState: !!keyringState,
          hasVault: !!keyringState.vault
        }
      });
      return {
        success: false,
        error: {
          type: VaultErrorType.INVALID_VAULT_DATA,
          message: 'Invalid vault data provided'
        }
      };
    }

    const backupResult = await setInternetCredentials(
      VAULT_BACKUP_KEY,
      VAULT_BACKUP_KEY,
      keyringVault,
      options
    );

    if (!backupResult) {
      Logger.error(new Error('Failed to store vault in keychain'), {
        timestamp: Date.now(),
        deviceInfo: {
          platform: Platform.OS,
          osVersion: Platform.Version.toString(),
          appVersion: '1.0.0'
        },
        debugInfo: {
          vaultLength: keyringVault.length,
          hasKeychainAccess: true
        }
      });
      return {
        success: false,
        error: {
          type: VaultErrorType.KEYCHAIN_ACCESS_ERROR,
          message: 'Failed to store vault in keychain'
        }
      };
    }

    return { 
      success: true, 
      vault: keyringState.vault 
    };
  } catch (error) {
    const vaultError = createVaultError(
      VaultErrorType.KEYCHAIN_ACCESS_ERROR,
      error as Error,
      {
        errorType: error instanceof Error ? error.message : 'Unknown error type',
        hasKeychainAccess: true
      }
    );

    Logger.error(new Error('Vault backup failed'), {
      originalError: vaultError,
      timestamp: Date.now(),
      debugInfo: {
        errorType: vaultError.type,
        hasKeyringState: !!keyringState,
        hasVault: !!keyringState?.vault,
        hasKeychainAccess: true
      }
    });

    return {
      success: false,
      error: {
        type: vaultError.type,
        message: error instanceof Error ? error.message : 'Unknown backup error'
      }
    };
  }
}

/**
 * retrieves the vault backup from react-native-keychain
 * @returns Promise<KeyringBackupResponse>
  interface KeyringBackupResponse {
    success: boolean;
    error?: string;
    vault?: string;
  }
 */
export async function getVaultFromBackup(): Promise<KeyringBackupResponse> {
  try {
    const credentials = await getInternetCredentials(VAULT_BACKUP_KEY);
    
    if (!credentials) {
      return {
        success: false,
        error: {
          type: VaultErrorType.VAULT_BACKUP_NOT_FOUND,
          message: 'No backup found in keychain'
        }
      };
    }

    return { 
      success: true, 
      vault: credentials.password 
    };
  } catch (error) {
    const vaultError = createVaultError(
      VaultErrorType.KEYCHAIN_ACCESS_ERROR,
      error as Error,
      {
        errorType: error instanceof Error ? error.message : 'Unknown error type',
        hasKeychainAccess: true
      }
    );

    Logger.error(new Error('Failed to get vault from backup'), vaultError);

    return {
      success: false,
      error: {
        type: vaultError.type,
        message: error instanceof Error ? error.message : 'Unknown keychain error'
      }
    };
  }
}

/**
 * removes the vault backup from react-native-keychain
 */
export const resetVaultBackup = async (): Promise<void> => {
  await resetInternetCredentials(VAULT_BACKUP_KEY);
};
