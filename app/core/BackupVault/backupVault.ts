import { KeyringControllerState } from '@metamask/keyring-controller';
import {
  getInternetCredentials,
  setInternetCredentials,
  resetInternetCredentials,
  ACCESSIBLE,
  type SetOptions,
} from 'react-native-keychain';
import {
  VAULT_BACKUP_FAILED,
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
  VAULT_BACKUP_KEY,
  VAULT_BACKUP_TEMP_KEY,
  TEMP_VAULT_BACKUP_FAILED,
} from './constants';
import Logger from '../../util/Logger';

const options: SetOptions = {
  accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// Vault encryption is only re-run by KeyringController when its content
// actually changes (new password, new account, etc.); a plain unlock does
// not re-encrypt. So an exact string match against the last known-good
// vault reliably means "nothing to back up" — no hashing or diffing needed.

/** Vault string already backed up, or confirmed identical to keychain. */
let lastConfirmedVault: string | undefined;
/** Vault string currently claimed by an in-flight/queued backup attempt. */
let pendingVault: string | undefined;
/** Serializes attempts so overlapping stateChanges can't race on keychain I/O. */
let backupQueue: Promise<void> = Promise.resolve();

interface KeyringBackupResponse {
  success: boolean;
  vault?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: 'identical_keychain' | 'unchanged_since_last_confirm';
}

/**
 * Clears in-memory dedupe so the next backup must re-read keychain.
 * Called from {@link clearAllVaultBackups}.
 */
export function resetVaultBackupDedupState(): void {
  lastConfirmedVault = undefined;
  pendingVault = undefined;
}

/**
 * Removes the primary vault backup from react-native-keychain
 */
const _resetVaultBackup = async (): Promise<void> => {
  // Clear existing backup
  await resetInternetCredentials({ server: VAULT_BACKUP_KEY });
};

/**
 * Removes the temporary vault backup from react-native-keychain
 */
const _resetTemporaryVaultBackup = async (): Promise<void> => {
  // Clear temporary backup
  await resetInternetCredentials({ server: VAULT_BACKUP_TEMP_KEY });
};

/**
 * Clears all vault backups from react-native-keychain
 */
export async function clearAllVaultBackups() {
  resetVaultBackupDedupState();
  await _resetVaultBackup();
  await _resetTemporaryVaultBackup();
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
  const keyringVault = keyringState.vault as string;

  try {
    // Fast path: we already confirmed this exact vault blob in-process.
    if (keyringVault && lastConfirmedVault === keyringVault) {
      return {
        success: true,
        vault: keyringVault,
        skipped: true,
        skipReason: 'unchanged_since_last_confirm',
      };
    }

    // Does a primary backup exist?
    // Wrapped in its own try/catch because Android Keystore key invalidation
    // (e.g. biometric enrollment change, Android 16 behavioural change) causes
    // getInternetCredentials to throw rather than return false/undefined.
    // If the read fails we treat it as "no existing backup" so the fresh
    // backup can still be written below.
    let existingBackup;
    try {
      existingBackup = await getInternetCredentials(VAULT_BACKUP_KEY);
    } catch (readError) {
      Logger.log(
        readError,
        'backupVault: failed to read existing backup, proceeding with fresh backup',
      );
    }

    // Keychain already holds this exact vault — nothing changed, skip the rewrite.
    if (
      keyringVault &&
      existingBackup &&
      existingBackup.password === keyringVault
    ) {
      lastConfirmedVault = keyringVault;
      return {
        success: true,
        vault: keyringVault,
        skipped: true,
        skipReason: 'identical_keychain',
      };
    }

    // An existing backup exists, backup it to the temp key
    if (existingBackup && existingBackup.password) {
      const existingVault = existingBackup.password;

      // Clear any existing temporary backup
      await _resetTemporaryVaultBackup();

      // Then back up a secondary copy of the vault
      const tempBackupResult = await setInternetCredentials(
        VAULT_BACKUP_TEMP_KEY,
        VAULT_BACKUP_TEMP_KEY,
        existingVault,
        options,
      );

      // Temporary vault backup failed, throw error
      if (!tempBackupResult) {
        throw new Error(TEMP_VAULT_BACKUP_FAILED);
      }
    }

    // Clear any existing vault backup first to prevent "item already exists" errors
    await _resetVaultBackup();

    // Backup primary vault
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

    // Clear the temporary backup
    await _resetTemporaryVaultBackup();

    if (keyringVault) {
      lastConfirmedVault = keyringVault;
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
 * Deduped + serialized entry point for KeyringController:stateChange.
 *
 * KeyringController emits multiple stateChange events carrying the same
 * vault around unlock; this coalesces those into a single backupVault() call.
 */
export function scheduleVaultBackup(state: KeyringControllerState): void {
  const vault = state.vault;
  if (!vault || vault === lastConfirmedVault || vault === pendingVault) {
    return;
  }

  pendingVault = vault;

  backupQueue = backupQueue
    .then(() => backupVault(state))
    .then((result) => {
      if (pendingVault === vault) {
        pendingVault = undefined;
      }
      if (!result.success) {
        throw new Error(result.error ?? VAULT_BACKUP_FAILED);
      }
      Logger.log(
        'Engine',
        result.skipped
          ? `Vault back up skipped (${result.skipReason})`
          : 'Vault back up successful',
      );
    })
    .catch((error) => {
      if (pendingVault === vault) {
        pendingVault = undefined;
      }
      Logger.error(error as Error, 'Engine Vault backup failed');
    });
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
  const primaryVaultCredentials =
    await getInternetCredentials(VAULT_BACKUP_KEY);
  if (primaryVaultCredentials) {
    return { success: true, vault: primaryVaultCredentials.password };
  }
  const temporaryVaultCredentials = await getInternetCredentials(
    VAULT_BACKUP_TEMP_KEY,
  );
  if (temporaryVaultCredentials) {
    return { success: true, vault: temporaryVaultCredentials.password };
  }
  return { success: false, error: VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP };
}
