import {
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
  VAULT_BACKUP_KEY,
  VAULT_BACKUP_TEMP_KEY,
} from './constants';
import {
  backupVault,
  getVaultFromBackup,
  clearAllVaultBackups,
  scheduleVaultBackup,
  resetVaultBackupDedupState,
} from './backupVault';
import { KeyringControllerState } from '@metamask/keyring-controller';
import {
  getInternetCredentials,
  resetInternetCredentials,
  setInternetCredentials,
  type Result,
  STORAGE_TYPE,
} from 'react-native-keychain';

let mockKeychainState: Record<string, { username: string; password: string }> =
  {};

const mockStorageType = STORAGE_TYPE.AES_GCM;

// Mock the react-native-keychain module
jest.mock('react-native-keychain', () => ({
  ...jest.requireActual('react-native-keychain'),
  STORAGE_TYPE: {
    AES_CBC: 'KeystoreAESCBC',
    AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth',
    AES_GCM: 'KeystoreAESGCM',
    RSA: 'KeystoreRSAECB',
  },
  setInternetCredentials: jest.fn(
    async (
      server: string,
      username: string,
      password: string,
      _?,
    ): Promise<Result> => {
      mockKeychainState[server] = { username, password };
      return {
        service: 'service',
        storage: mockStorageType,
      };
    },
  ),
  getInternetCredentials: jest.fn(
    async (server: string) => mockKeychainState[server],
  ),
  resetInternetCredentials: jest.fn(async (options: { server: string }) => {
    delete mockKeychainState[options.server];
  }),
}));

describe('backupVault file', () => {
  const dummyPassword = 'dummy-password';

  beforeEach(() => {
    jest.clearAllMocks();
    mockKeychainState = {};
    resetVaultBackupDedupState();
  });

  describe('clearAllVaultBackups', () => {
    it('should clear all vault backups', async () => {
      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      await setInternetCredentials(
        VAULT_BACKUP_TEMP_KEY,
        VAULT_BACKUP_TEMP_KEY,
        dummyPassword,
      );

      const primaryVaultCredentials =
        await getInternetCredentials(VAULT_BACKUP_KEY);

      const temporaryVaultCredentials = await getInternetCredentials(
        VAULT_BACKUP_TEMP_KEY,
      );

      expect(primaryVaultCredentials).toEqual({
        username: VAULT_BACKUP_KEY,
        password: dummyPassword,
      });

      expect(temporaryVaultCredentials).toEqual({
        username: VAULT_BACKUP_TEMP_KEY,
        password: dummyPassword,
      });

      await clearAllVaultBackups();

      const primaryVaultCredentialsAfterReset =
        await getInternetCredentials(VAULT_BACKUP_KEY);

      const temporaryVaultCredentialsAfterReset = await getInternetCredentials(
        VAULT_BACKUP_TEMP_KEY,
      );

      expect(primaryVaultCredentialsAfterReset).toBeUndefined();
      expect(temporaryVaultCredentialsAfterReset).toBeUndefined();
    });
  });

  describe('backupVault', () => {
    it('should throw error and skip primary backup if failed to backup temporary vault', async () => {
      const mockedFailedResponse = {
        error: 'Failed to backup temporary vault',
        success: false,
      };

      // Populate primary vault backup
      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      // Mock the setInternetCredentials function to return false, which simulates a failed vault backup
      (setInternetCredentials as jest.Mock).mockImplementationOnce(() => false);

      const keyringState: KeyringControllerState = {
        vault: undefined,
        keyrings: [],
        isUnlocked: false,
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual(mockedFailedResponse);
    });

    it('should throw error when primary vault backup fails', async () => {
      const mockedFailedResponse = {
        error: 'Vault backup failed',
        success: false,
      };

      // Mock the setInternetCredentials function to return false, which simulates a failed vault backup
      (setInternetCredentials as jest.Mock).mockImplementationOnce(() => false);

      const keyringState: KeyringControllerState = {
        vault: undefined,
        keyrings: [],
        isUnlocked: false,
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual(mockedFailedResponse);
    });

    it('should successfully backup primary vault', async () => {
      const mockedSuccessResponse = { success: true };

      // Populate primary vault backup
      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      const keyringState: KeyringControllerState = {
        vault: undefined,
        keyrings: [],
        isUnlocked: false,
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual(mockedSuccessResponse);
    });

    it('skips keychain rewrite when existing backup already matches vault', async () => {
      const vault = 'already-backed-up-vault';

      await setInternetCredentials(VAULT_BACKUP_KEY, VAULT_BACKUP_KEY, vault);

      (setInternetCredentials as jest.Mock).mockClear();
      (resetInternetCredentials as jest.Mock).mockClear();

      const response = await backupVault({
        vault,
        keyrings: [],
        isUnlocked: true,
      });

      expect(response).toEqual({
        success: true,
        vault,
        skipped: true,
        skipReason: 'identical_keychain',
      });
      expect(setInternetCredentials).not.toHaveBeenCalled();
      expect(resetInternetCredentials).not.toHaveBeenCalled();
    });

    it('skips keychain I/O when vault was already confirmed in-process', async () => {
      const vault = 'confirmed-vault';

      await setInternetCredentials(VAULT_BACKUP_KEY, VAULT_BACKUP_KEY, vault);
      await backupVault({ vault, keyrings: [], isUnlocked: true });

      (getInternetCredentials as jest.Mock).mockClear();
      (setInternetCredentials as jest.Mock).mockClear();

      const response = await backupVault({
        vault,
        keyrings: [],
        isUnlocked: true,
      });

      expect(response).toEqual({
        success: true,
        vault,
        skipped: true,
        skipReason: 'unchanged_since_last_confirm',
      });
      expect(getInternetCredentials).not.toHaveBeenCalled();
      expect(setInternetCredentials).not.toHaveBeenCalled();
    });

    it('should still succeed if reading the existing backup throws (e.g. Android Keystore key invalidation)', async () => {
      const newVault = 'new-vault';

      // Simulate a stale entry already in the keychain
      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      // Simulate Android Keystore throwing on the read
      (getInternetCredentials as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Android Keystore key permanently invalidated');
      });

      const keyringState: KeyringControllerState = {
        vault: newVault,
        keyrings: [],
        isUnlocked: false,
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual({ success: true, vault: newVault });
    });

    it('should reset vault before backup', async () => {
      const mockedSuccessResponse = { success: true };

      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      const internetCredentialsBeforeReset =
        await getInternetCredentials(VAULT_BACKUP_KEY);

      expect(internetCredentialsBeforeReset).toEqual({
        username: VAULT_BACKUP_KEY,
        password: dummyPassword,
      });

      const keyringState: KeyringControllerState = {
        vault: undefined,
        keyrings: [],
        isUnlocked: false,
      };

      const response = await backupVault(keyringState);

      // First reset temporary, then primary, then temporary again
      expect(resetInternetCredentials).toHaveBeenCalledTimes(3);

      expect(response).toEqual(mockedSuccessResponse);
    });
  });

  describe('scheduleVaultBackup', () => {
    it('does not start a second backup when vault is unchanged', async () => {
      const vault = 'same-vault';
      await setInternetCredentials(VAULT_BACKUP_KEY, VAULT_BACKUP_KEY, vault);
      (setInternetCredentials as jest.Mock).mockClear();
      (getInternetCredentials as jest.Mock).mockClear();

      scheduleVaultBackup({
        vault,
        keyrings: [],
        isUnlocked: false,
      });
      scheduleVaultBackup({
        vault,
        keyrings: [],
        isUnlocked: true,
      });

      // Flush the serialized backup chain
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      // One getPrimary for the first schedule; second schedule skipped entirely
      expect(getInternetCredentials).toHaveBeenCalledTimes(1);
      expect(setInternetCredentials).not.toHaveBeenCalled();
    });
  });

  describe('getVaultFromBackup', () => {
    it('should successfully get primary vault from backup', async () => {
      const mockedSuccessResponse = { success: true, vault: dummyPassword };

      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      const response = await getVaultFromBackup();

      expect(response).toEqual(mockedSuccessResponse);
    });

    it('should successfully get temporary vault from backup if primary vault does not exist', async () => {
      const tempDummyPassword = 'temp-dummy-password';

      const mockedSuccessResponse = { success: true, vault: tempDummyPassword };

      await setInternetCredentials(
        VAULT_BACKUP_TEMP_KEY,
        VAULT_BACKUP_TEMP_KEY,
        tempDummyPassword,
      );

      const response = await getVaultFromBackup();

      expect(response).toEqual(mockedSuccessResponse);
    });

    it('should return error when vault backup fails', async () => {
      const mockedFailedResponse = {
        error: VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
        success: false,
      };

      (getInternetCredentials as jest.Mock).mockImplementationOnce(
        () => undefined,
      );

      const response = await getVaultFromBackup();

      expect(response).toEqual(mockedFailedResponse);
    });
  });
});
