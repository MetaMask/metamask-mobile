import {
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
  VAULT_BACKUP_KEY,
  VAULT_BACKUP_TEMP_KEY,
} from './constants';
import {
  backupVault,
  getVaultFromBackup,
  clearAllVaultBackups,
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

      const keyringState: KeyringControllerState = {
        vault,
        keyrings: [],
        isUnlocked: false,
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual({
        success: true,
        vault,
        skipped: true,
        skipReason: 'identical_keychain',
      });
      expect(setInternetCredentials).not.toHaveBeenCalled();
      expect(resetInternetCredentials).not.toHaveBeenCalled();
    });

    it('re-reads keychain on a later call even for a previously confirmed vault, to self-heal keystore invalidation', async () => {
      const vault = 'confirmed-vault';
      const keyringState: KeyringControllerState = {
        vault,
        keyrings: [],
        isUnlocked: false,
      };

      await setInternetCredentials(VAULT_BACKUP_KEY, VAULT_BACKUP_KEY, vault);
      await backupVault(keyringState);

      // Simulate the keychain entry becoming unreadable in between calls
      // (e.g. Android Keystore key invalidated by a biometric enrollment
      // change). A later call for the *same* vault string must still detect
      // and repair this instead of trusting an in-memory "already confirmed"
      // flag.
      (getInternetCredentials as jest.Mock).mockClear();
      (getInternetCredentials as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Android Keystore key permanently invalidated');
      });

      const response = await backupVault(keyringState);

      expect(getInternetCredentials).toHaveBeenCalledTimes(1);
      expect(response).toEqual({ success: true, vault });
      expect(mockKeychainState[VAULT_BACKUP_KEY]?.password).toBe(vault);
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
