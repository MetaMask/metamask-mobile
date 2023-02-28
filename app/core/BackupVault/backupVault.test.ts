import { KeyringState } from '@metamask/keyring-controller';
import {
  backupVault,
  getVaultFromBackup,
  resetVaultBackup,
} from './backupVault';
import {
  VAULT_BACKUP_FAILED,
  VAULT_BACKUP_FAILED_UNDEFINED,
  VAULT_FAILED_TO_GET_VAULT_FROM_BACKUP,
} from '../../constants/error';

describe('backupVault', () => {
  it('should return a success response when the vault is backed up', async () => {
    const keyringState: KeyringState = {
      vault: 'vault',
      keyrings: [],
    };
    const response = await backupVault(keyringState);
    expect(response.success).toBe(true);
    expect(response.vault).toBe('vault');
  });

  it('should return an error response when the vault is undefined', async () => {
    const keyringState = {
      vault: undefined,
      keyrings: [],
    };
    const response = await backupVault(keyringState);
    expect(response.success).toBe(false);
    expect(response.error).toBe(VAULT_BACKUP_FAILED_UNDEFINED);
  });
  it('should return an error response when the vault is not backed up', async () => {
    const keyringState = {
      vault: 'vault',
      keyrings: [],
    };
    const response = await backupVault(keyringState);
    expect(response.success).toBe(false);
    expect(response.error).toBe(VAULT_BACKUP_FAILED);
  });
});

describe('getVaultFromBackup', () => {
  it('should return a success response when the vault is retrieved from backup', async () => {
    const mockResult = {
      password: 'mockVault',
    };
    jest.mock('react-native-keychain', () => ({
      getInternetCredentials: jest.fn().mockResolvedValue(mockResult),
    }));
    const response = await getVaultFromBackup();
    expect(response.success).toBe(true);
    expect(response.vault).toBe('vault');
  });
});
