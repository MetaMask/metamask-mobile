import { VAULT_BACKUP_FAILED } from '../../constants/error';
import { backupVault } from './backupVault';
import { KeyringControllerState } from '@metamask/keyring-controller';
import { setInternetCredentials } from 'react-native-keychain';

// Mock the setInternetCredentials function to return false, which simulates a failed vault backup
(setInternetCredentials as jest.Mock).mockResolvedValue(false);

//TODO Mock the react-native-keychain module test the other functions inside backupVault
/*
 These tests are extremely limited since we are unable to mock the react-native-keychain module
 Despite the fact that they are mocked in the jest setup file, they do not appear to be working.
 Therefore the best we can do for now is to test the error case that does not hit the keychain.

 Documentation for the testing react-native-keychain can be found here: https://github.com/oblador/react-native-keychain#unit-testing-with-jest
 More information on the issue can be found here: https://github.com/oblador/react-native-keychain/issues/460
*/
describe('backupVault', () => {
  it('should return an error response when the vault is undefined', async () => {
    const keyringState: KeyringControllerState = {
      vault: undefined,
      keyrings: [],
      isUnlocked: false,
      keyringsMetadata: [],
    };
    expect(async () => await backupVault(keyringState)).rejects.toThrow(
      VAULT_BACKUP_FAILED,
    );
  });
});
