import { EthAccountType } from '@metamask/keyring-api';
import Engine from './Engine';

import { KeyringTypes } from '@metamask/keyring-controller';
import { createMockInternalAccount } from '../util/test/accountsControllerTestUtils';
import { recreateVaultWithNewPassword } from './Vault';
import ReduxService, { ReduxStore } from './redux';

const mockVerifyPassword = jest.fn().mockResolvedValue(undefined);
const mockChangePassword = jest.fn();
const mockExportSeedPhrase = jest.fn();
const mockCreateNewVaultAndRestore = jest.fn();

const mockHdAccount1 = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Hd Account 1',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);

jest.mock('./Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: (password: string) => mockVerifyPassword(password),
      changePassword: (password: string, newPassword: string) =>
        mockChangePassword(password, newPassword),
      exportSeedPhrase: (password: string) => mockExportSeedPhrase(password),
      createNewVaultAndRestore: (password: string, seedPhrases: string[]) =>
        mockCreateNewVaultAndRestore(password, seedPhrases),
    },
    SeedlessOnboardingController: {
      changePassword: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));
jest.mocked(Engine);

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

describe('Vault', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockChangePassword.mockResolvedValue(undefined);
    mockExportSeedPhrase.mockResolvedValue([]);
    mockCreateNewVaultAndRestore.mockResolvedValue(null);

    // Mock ReduxService store
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: jest.fn().mockReturnValue({
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: undefined,
            },
          },
        },
      }),
      dispatch: jest.fn(),
    } as unknown as ReduxStore);
  });
  describe('recreateVaultWithNewPassword', () => {
    it('should recreate vault with new password', async () => {
      const newPassword = 'new-password';

      await recreateVaultWithNewPassword(
        'password',
        newPassword,
        mockHdAccount1.address,
      );

      expect(mockChangePassword).toHaveBeenCalledWith('password', newPassword);

      // Selected address should be restored since it exists in recreated keyrings
      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
        mockHdAccount1.address,
      );
    });

    it('SeedlessOnboardingController.changePassword is called when vault exists', async () => {
      const newPassword = 'new-password';
      const primarySeedPhrase = 'seed-phrase';
      mockExportSeedPhrase.mockResolvedValue([primarySeedPhrase]);
      mockChangePassword.mockResolvedValue(undefined);

      // Mock ReduxService to return a vault
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: jest.fn().mockReturnValue({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing-vault',
              },
            },
          },
        }),
        dispatch: jest.fn(),
      } as unknown as ReduxStore);

      // Use the existing SeedlessOnboardingController mock from Engine.context
      const mockChangePasswordSpy = jest
        .spyOn(Engine.context.SeedlessOnboardingController, 'changePassword')
        .mockImplementation(mockChangePassword);

      await recreateVaultWithNewPassword(
        'password',
        newPassword,
        mockHdAccount1.address,
      );

      // Verify that changePassword was called with the correct parameters
      expect(mockChangePasswordSpy).toHaveBeenCalledWith(
        newPassword,
        'password',
      );
    });
  });
});
