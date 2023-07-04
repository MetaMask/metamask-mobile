import { backupVault } from './backupVault';
import { VAULT_BACKUP_FAILED_UNDEFINED } from '../../constants/error';

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
    const keyringState = {
      vault: undefined,
      keyrings: [],
    };
    const response = await backupVault(keyringState);
    expect(response.success).toBe(false);
    expect(response.error).toBe(VAULT_BACKUP_FAILED_UNDEFINED);
  });
});
