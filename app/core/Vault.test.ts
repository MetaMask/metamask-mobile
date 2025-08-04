import { EthAccountType, SolAccountType } from '@metamask/keyring-api';
import Engine from './Engine';

import { recreateVaultsWithNewPassword } from './Vault';
import { KeyringSelector, KeyringTypes } from '@metamask/keyring-controller';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../util/test/accountsControllerTestUtils';
import ReduxService, { ReduxStore } from './redux';
import { RootState } from '../reducers';
import { RecursivePartial } from './Authentication/Authentication.test';
import { SeedlessOnboardingControllerErrorMessage } from '@metamask/seedless-onboarding-controller';

const mockAddNewKeyring = jest.fn();
const mockWithKeyring = jest.fn();
const mockExportSeedPhrase = jest.fn();
const mockListMultichainAccounts = jest.fn();
const mockCreateNewVaultAndRestore = jest.fn();
const mockAddNewAccount = jest.fn();
const mockExportAccount = jest.fn();
const mockImportAccountWithStrategy = jest.fn();

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
      submitPassword: jest.fn(),
      changePassword: jest.fn(),
      // Using any to mock any callback.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      withKeyring: (selectedKeyring: KeyringSelector, callback: any) =>
        mockWithKeyring(selectedKeyring, callback),
      addNewKeyring: (type: KeyringTypes, options: { mnemonic?: string }) =>
        mockAddNewKeyring(type, options),
      exportSeedPhrase: (password: string, keyringId: string) =>
        mockExportSeedPhrase(password, keyringId),
      createNewVaultAndRestore: (password: string, seedPhrase: string) =>
        mockCreateNewVaultAndRestore(password, seedPhrase),
      addNewAccount: () => mockAddNewAccount(),
      exportAccount: (password: string, account: string) =>
        mockExportAccount(password, account),
      importAccountWithStrategy: (strategy: string, accounts: string[]) =>
        mockImportAccountWithStrategy(strategy, accounts),
      exportEncryptionKey: jest.fn(),
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
    AccountsController: {
      listMultichainAccounts: () => mockListMultichainAccounts(),
    },
    SeedlessOnboardingController: {
      changePassword: jest.fn(),
      storeKeyringEncryptionKey: jest.fn(),
      loadKeyringEncryptionKey: jest.fn(),
      submitGlobalPassword: jest.fn(),
      checkIsPasswordOutdated: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));
const mockEngine = jest.mocked(Engine);

jest.mock('./Ledger/Ledger', () => ({
  withLedgerKeyring: jest.fn(),
}));

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../util/trace', () => ({
  ...jest.requireActual('../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockMultichainWalletSnapClient = {
  createAccount: jest.fn(),
};

jest.mock('./SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('./SnapKeyring/MultichainWalletSnapClient'),
  MultichainWalletSnapFactory: {
    createClient: jest
      .fn()
      .mockImplementation(() => mockMultichainWalletSnapClient),
  },
}));

describe('Vault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recreateVaultWithNewPassword', () => {
    it('should submit old password, change password, and set selected address', async () => {
      // mock redux state
      const mockReduxState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: undefined,
              socialBackupsMetadata: [],
            },
          },
        },
      };

      // mock Redux store
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockReduxState),
      } as unknown as ReduxStore);

      await recreateVaultsWithNewPassword(
        'old-password',
        'new-password',
        '0x123',
      );

      expect(
        mockEngine.context.KeyringController.changePassword,
      ).toHaveBeenCalledWith('new-password');
      expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith('0x123');
    });

    it('should call seedlessChangePassword and syncKeyringEncryptionKey if seedless onboarding flow is active', async () => {
      // mock redux state
      const mockReduxState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'valid vault data',
              socialBackupsMetadata: [],
            },
          },
        },
      };

      // mock Redux store
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockReduxState),
      } as unknown as ReduxStore);

      await recreateVaultsWithNewPassword(
        'old-password',
        'new-password',
        '0x123',
      );

      expect(
        mockEngine.context.KeyringController.changePassword,
      ).toHaveBeenCalledWith('new-password');
      expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith('0x123');

      expect(
        mockEngine.context.SeedlessOnboardingController.changePassword,
      ).toHaveBeenCalled();

      expect(
        mockEngine.context.SeedlessOnboardingController
          .storeKeyringEncryptionKey,
      ).toHaveBeenCalled();
    });

    it('should restore when seedless change password failed if seedless onboarding flow is active', async () => {
      // mock redux state
      const mockReduxState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'valid vault data',
              socialBackupsMetadata: [],
            },
          },
        },
      };

      // mock Redux store
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockReduxState),
      } as unknown as ReduxStore);

      mockEngine.context.SeedlessOnboardingController.changePassword.mockRejectedValue(
        new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
      );

      await expect(
        recreateVaultsWithNewPassword('old-password', 'new-password', '0x123'),
      ).rejects.toThrow(
        new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
      );

      expect(
        mockEngine.context.KeyringController.changePassword,
      ).not.toHaveBeenCalledWith('new-password');
      expect(
        mockEngine.context.SeedlessOnboardingController.changePassword,
      ).toHaveBeenCalled();

      expect(mockEngine.setSelectedAddress).not.toHaveBeenCalledWith('0x123');
    });
  });
});
