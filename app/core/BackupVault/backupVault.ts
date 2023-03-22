import { KeyringState } from '@metamask/keyring-controller';
import Logger from '../../util/Logger';
import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
  Options,
  ACCESSIBLE,
} from 'react-native-keychain';
import {
  VAULT_BACKUP_FAILED,
  VAULT_BACKUP_FAILED_UNDEFINED,
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
} from '../../constants/error';

const VAULT_BACKUP_KEY = 'VAULT_BACKUP';

const options: Options = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED,
};

interface KeyringBackupResponse {
  success: boolean;
  vault?: string;
  error?: string;
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
  keyringState: KeyringState,
): Promise<KeyringBackupResponse> {
  if (keyringState.vault) {
    const backupResult = await setInternetCredentials(
      VAULT_BACKUP_KEY,
      VAULT_BACKUP_KEY,
      keyringState.vault,
      options,
    );
    if (backupResult === false) {
      Logger.error(VAULT_BACKUP_KEY, VAULT_BACKUP_FAILED);
      const response: KeyringBackupResponse = {
        success: false,
        error: VAULT_BACKUP_FAILED,
      };
      return response;
    }
    const response: KeyringBackupResponse = {
      success: true,
      vault: keyringState.vault,
    };
    return response;
  }
  Logger.error(VAULT_BACKUP_KEY, VAULT_BACKUP_FAILED_UNDEFINED);
  const response: KeyringBackupResponse = {
    success: false,
    error: VAULT_BACKUP_FAILED_UNDEFINED,
  };
  return response;
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
  const credentials = await getInternetCredentials(VAULT_BACKUP_KEY);
  if (credentials) {
    return { success: true, vault: credentials.password };
  }
  Logger.error(VAULT_BACKUP_KEY, VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP);
  return { success: false, error: VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP };
}

/**
 * removes the vault backup from react-native-keychain
 */
export const resetVaultBackup = async (): Promise<void> => {
  await resetInternetCredentials(VAULT_BACKUP_KEY);
};
