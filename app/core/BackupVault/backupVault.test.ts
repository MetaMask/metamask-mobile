import {
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
  VAULT_BACKUP_KEY,
} from './constants';
import {
  backupVault,
  getVaultFromBackup,
  resetVaultBackup,
} from './backupVault';
import { KeyringControllerState } from '@metamask/keyring-controller';
import {
  getInternetCredentials,
  Options,
  resetInternetCredentials,
  Result,
  setInternetCredentials,
} from 'react-native-keychain';

const mockKeychainState: Record<
  string,
  { username: string; password: string }
> = {};

// Mock the react-native-keychain module
jest.mock('react-native-keychain', () => ({
  ...jest.requireActual('react-native-keychain'),
  setInternetCredentials: jest.fn(
    async (
      server: string,
      username: string,
      password: string,
      _?: Options,
    ): Promise<Result> => {
      mockKeychainState[server] = { username, password };
      return {
        service: 'service',
        storage: 'storage',
      };
    },
  ),
  getInternetCredentials: jest.fn(
    async (server: string) => mockKeychainState[server],
  ),
  resetInternetCredentials: jest.fn(
    async (server: string, _?: Options) => delete mockKeychainState[server],
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resetVaultBackup', () => {
    it('should reset vault backup', async () => {
      const dummyPassword = 'dummy-password';

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

      await resetVaultBackup();

      const internetCredentialsAfterReset = await getInternetCredentials(
        VAULT_BACKUP_KEY,
      );

      expect(internetCredentialsAfterReset).toBeUndefined();
    });
  });

  describe('backupVault', () => {
    it('should throw when vault backup fails', async () => {
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
        keyringsMetadata: [],
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual(mockedFailedResponse);
    });

    it('should return success response when vault backup succeeds', async () => {
      const mockedSuccessResponse = { success: true };

      // Mock the setInternetCredentials function to return a success response, which simulates a successful vault backup
      (setInternetCredentials as jest.Mock).mockImplementationOnce(
        () => mockedSuccessResponse,
      );

      const keyringState: KeyringControllerState = {
        vault: undefined,
        keyrings: [],
        isUnlocked: false,
        keyringsMetadata: [],
      };

      const response = await backupVault(keyringState);

      expect(response).toEqual(mockedSuccessResponse);
    });

    it('should reset vault before backup', async () => {
      const dummyPassword = 'dummy-password';
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
        keyringsMetadata: [],
      };

      const response = await backupVault(keyringState);

      expect(resetInternetCredentials).toHaveBeenCalledTimes(1);

      expect(response).toEqual(mockedSuccessResponse);
    });
  });

  describe('getVaultFromBackup', () => {
    it('should successfully get vault from backup', async () => {
      const dummyPassword = 'dummy-password';
      const mockedSuccessResponse = { success: true, vault: dummyPassword };

      await setInternetCredentials(
        VAULT_BACKUP_KEY,
        VAULT_BACKUP_KEY,
        dummyPassword,
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
