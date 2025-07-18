import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import Engine from './Engine';

import { KeyringTypes } from '@metamask/keyring-controller';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../util/test/accountsControllerTestUtils';
import { recreateVaultWithNewPassword } from './Vault';
import ReduxService, { ReduxStore } from './redux';
import { captureException } from '@sentry/react-native';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from './Engine/controllers/seedless-onboarding-controller/error';

const mockVerifyPassword = jest.fn().mockResolvedValue(undefined);
const mockChangePassword = jest.fn();
const mockExportSeedPhrase = jest.fn();
const mockCreateNewVaultAndRestore = jest.fn();

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn().mockResolvedValue(undefined),
}));

const mockHdAccount1 = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Hd Account 1',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);
const mockHdAccount2 = createMockInternalAccount(
  '0xf57E323fD8C7Bb908A13557b1cE4441c8213824c',
  'Hd Account 2',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);
const mockHdAccount3 = createMockInternalAccount(
  '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
  'Hd Account 3',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);
const mockHdAccount4 = createMockInternalAccount(
  '0xf57E323fD8C7Bb908A13557b1cE4441c8213824c',
  'Hd Account 4',
  KeyringTypes.hd,
  EthAccountType.Eoa,
);
const mockQrAccount = createMockInternalAccount(
  '0xB6ce536fe74d9d5a25356B249424E1D3BDaADC57',
  'Qr Account',
  KeyringTypes.qr,
  EthAccountType.Eoa,
);
const mockLedgerAccount = createMockInternalAccount(
  '0xE3D19DCfE5255C3448CB80299906ac15Dee2cF29',
  'Ledger Account',
  KeyringTypes.ledger,
  EthAccountType.Eoa,
);
const mockSolanaAccount = createMockSnapInternalAccount(
  '',
  'Solana Account 1',
  SolAccountType.DataAccount,
  'hd-keyring-id-2',
);
const mockThirdPartySnapAccount = createMockSnapInternalAccount(
  '0x571CE5f203f93662301D43A5020aDB895f842cC9',
  'Third Party Snap Account',
  EthAccountType.Eoa,
);

const mockPrivateKeyAccount = createMockInternalAccount(
  '0x15fB9d189aEa6233bE7487294702A431a7656810',
  'Private Key Account',
  KeyringTypes.simple,
  EthAccountType.Eoa,
);
const mockHdKeyringMetadata = {
  id: 'hd-keyring-id',
  name: '',
};

const mockHdKeyringMetadata2 = {
  id: 'hd-keyring-id-2',
  name: '',
};

const mockQrKeyringMetadata = {
  id: 'qr-keyring-id',
  name: '',
};

const mockLedgerKeyringMetadata = {
  id: 'ledger-keyring-id',
  name: '',
};

const mockSnapKeyringMetadata = {
  id: 'snap-keyring-id',
  name: '',
};

const mockSimpleKeyringMetadata = {
  id: 'simple-keyring-id',
  name: '',
};

const mockHdKeyring = {
  type: KeyringTypes.hd,
  accounts: [mockHdAccount1.address, mockHdAccount2.address],
  metadata: mockHdKeyringMetadata,
};

const mockHdKeyring2 = {
  type: KeyringTypes.hd,
  accounts: [mockHdAccount3.address, mockHdAccount4.address],
  metadata: mockHdKeyringMetadata2,
};

const mockQrKeyring = {
  type: KeyringTypes.qr,
  accounts: [mockQrAccount.address],
  metadata: mockQrKeyringMetadata,
};

const mockLedgerKeyring = {
  type: KeyringTypes.ledger,
  accounts: [mockLedgerAccount.address],
  metadata: mockLedgerKeyringMetadata,
};

const mockSnapKeyring = {
  type: KeyringTypes.snap,
  accounts: [mockSolanaAccount.address, mockThirdPartySnapAccount.address],
  metadata: mockSnapKeyringMetadata,
};

const mockSimpleKeyring = {
  type: KeyringTypes.simple,
  accounts: [mockPrivateKeyAccount.address],
  metadata: mockSimpleKeyringMetadata,
};

jest.mock('./Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: (password: string) => mockVerifyPassword(password),
      changePassword: (password: string) => mockChangePassword(password),
      exportSeedPhrase: (password: string) => mockExportSeedPhrase(password),
      createNewVaultAndRestore: (password: string, seedPhrases: string[]) =>
        mockCreateNewVaultAndRestore(password, seedPhrases),
      state: {
        get keyrings() {
          return [
            mockHdKeyring,
            mockHdKeyring2,
            mockQrKeyring,
            mockLedgerKeyring,
            mockSnapKeyring,
            mockSimpleKeyring,
          ];
        },
      },
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
    mockVerifyPassword.mockResolvedValue(undefined);

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

      expect(mockChangePassword).toHaveBeenCalledWith(newPassword);

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
      mockVerifyPassword.mockResolvedValue(undefined);

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

    it('will revert to the old password if SeedlessOnboardingController.changePassword fails', async () => {
      const newPassword = 'new-password';
      const primarySeedPhrase = 'seed-phrase';
      const expectedError = new Error('test error');
      mockExportSeedPhrase.mockResolvedValue([primarySeedPhrase]);
      mockChangePassword.mockResolvedValue(undefined);
      mockVerifyPassword.mockResolvedValue(undefined);

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
      jest
        .spyOn(Engine.context.SeedlessOnboardingController, 'changePassword')
        .mockImplementation(() => {
          throw expectedError;
        });

      await expect(
        recreateVaultWithNewPassword(
          'password',
          newPassword,
          mockHdAccount1.address,
        ),
      ).rejects.toThrow('Change password error - Error: test error');

      // Expect change password on the keyring controller to be called twice
      // The second call should be to revert to the old password
      expect(mockChangePassword).toHaveBeenNthCalledWith(1, newPassword);
      expect(mockChangePassword).toHaveBeenNthCalledWith(2, 'password');

      expect(captureException).toHaveBeenCalledWith(
        new SeedlessOnboardingControllerError(
          expectedError,
          SeedlessOnboardingControllerErrorType.ChangePasswordError,
        ),
      );
    });
  });
});
