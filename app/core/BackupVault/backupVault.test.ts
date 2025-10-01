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
  type SetOptions,
  type Result,
  STORAGE_TYPE,
} from 'react-native-keychain';

let mockKeychainState: Record<string, { username: string; password: string }> =
  {};

// Mock the react-native-keychain module
jest.mock('react-native-keychain', () => ({
  ...jest.requireActual('react-native-keychain'),
  setInternetCredentials: jest.fn(
    async (
      server: string,
      username: string,
      password: string,
      _?: SetOptions,
    ): Promise<Result> => {
      mockKeychainState[server] = { username, password };
      return {
        service: 'service',
        storage: 'storage' as STORAGE_TYPE,
      };
    },
  ),
  getInternetCredentials: jest.fn(
    async (server: string) => mockKeychainState[server],
  ),
  resetInternetCredentials: jest.fn(
    async (serverOrOptions: { server: string }, _?: SetOptions) => {
      const server = serverOrOptions.server;
      delete mockKeychainState[server];
    },
  ),
}));

//TODO Mock the react-native-keychain module test the other functions inside backupVault
/*
 These tests are extremely limited since we are unable to mock the react-native-keychain module
 Despite the fact that they are mocked in the jest setup file, they do not appear to be working.
 Therefore the best we can do for now is to test the error case that does not hit the keychain.

 Documentation for the testing react-native-keychain can be found here: https://github.com/oblador/react-native-keychain#unit-testing-with-jest
 More information on the issue can be found here: https://github.com/oblador/react-native-keychain/issues/460
*/
describe('backupVault file', () => {
  const dummyPassword = 'dummy-password';

  beforeEach(() => {
    jest.clearAllMocks();
    mockKeychainState = {};
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

      const primaryVaultCredentials = await getInternetCredentials(
        VAULT_BACKUP_KEY,
      );

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

      const primaryVaultCredentialsAfterReset = await getInternetCredentials(
        VAULT_BACKUP_KEY,
      );

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

    it('should reset vault before backup', async () => {
      const mockedSuccessResponse = { success: true };

      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
      );

      const internetCredentialsBeforeReset = await getInternetCredentials(
        VAULT_BACKUP_KEY,
      );

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
