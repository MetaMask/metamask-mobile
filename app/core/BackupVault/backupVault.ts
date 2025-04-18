import { KeyringControllerState } from '@metamask/keyring-controller';
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
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
} from '../../constants/error';

const VAULT_BACKUP_KEY = 'VAULT_BACKUP';

const options: Options = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface KeyringBackupResponse {
  success: boolean;
  vault?: string;
  error?: string;
}

/**
 * removes the vault backup from react-native-keychain
 */
export const resetVaultBackup = async (): Promise<void> => {
  await resetInternetCredentials(VAULT_BACKUP_KEY);
};

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
  const keyringVault = keyringState.vault as string;

  try {
    // Clear any existing vault backup first to prevent "item already exists" errors
    await resetVaultBackup();

    // Backup vault
    const backupResult = await setInternetCredentials(
      VAULT_BACKUP_KEY,
      VAULT_BACKUP_KEY,
      keyringVault,
      options,
    );

    // Vault backup failed, throw error
    if (!backupResult) {
      throw new Error(VAULT_BACKUP_FAILED);
    }

    return {
      success: true,
      vault: keyringState.vault,
    };
  } catch (error) {
    Logger.error(error as Error, 'Vault backup failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : VAULT_BACKUP_FAILED,
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
  const credentials = await getInternetCredentials(VAULT_BACKUP_KEY);
  if (credentials) {
    return { success: true, vault: credentials.password };
  }
  const vaultFetchError = new Error(VAULT_BACKUP_KEY);
  Logger.error(vaultFetchError, VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP);
  return { success: false, error: VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP };
}
