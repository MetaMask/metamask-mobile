import {
  EthAccountType,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import Logger from '../util/Logger';
import Engine from './Engine';
import { withLedgerKeyring } from './Ledger/Ledger';

import {
  restoreLedgerKeyring,
  restoreQRKeyring,
  restoreSnapAccounts,
  restoreImportedSrp,
  recreateVaultWithNewPassword,
} from './Vault';
import { KeyringSelector, KeyringTypes } from '@metamask/keyring-controller';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../util/test/accountsControllerTestUtils';
import ReduxService, { ReduxStore } from './redux';
import { RootState } from '../reducers';
import { RecursivePartial } from './Authentication/Authentication.test';

const mockAddNewKeyring = jest.fn();
const mockWithKeyring = jest.fn();
const mockExportSeedPhrase = jest.fn();
const mockListMultichainAccounts = jest.fn();
const mockCreateNewVaultAndRestore = jest.fn();
const mockAddNewAccount = jest.fn();
const mockRestoreQRKeyring = jest.fn();
const mockRestoreLedgerKeyring = jest.fn();
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
      restoreQRKeyring: (serializedKeyring: string) =>
        mockRestoreQRKeyring(serializedKeyring),
      restoreLedgerKeyring: (serializedKeyring: string) =>
        mockRestoreLedgerKeyring(serializedKeyring),
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
const mockWithLedgerKeyring = jest.mocked(withLedgerKeyring);

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
  describe('restoreQRKeyring', () => {
    it('should restore QR keyring if it exists', async () => {
      const mockSerializedQrKeyring = 'serialized-keyring';

      await restoreQRKeyring(mockSerializedQrKeyring);

      expect(mockRestoreQRKeyring).toHaveBeenCalled();
      expect(mockRestoreQRKeyring).toHaveBeenCalledWith(
        mockSerializedQrKeyring,
      );
    });

    it('should log error if an exception is thrown', async () => {
      const error = new Error('Test error');
      mockRestoreQRKeyring.mockRejectedValue(error);
      const mockSerializedQrKeyring = 'serialized-keyring';

      await restoreQRKeyring(mockSerializedQrKeyring);

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to get qr accounts on recreate vault',
      );
    });
  });

  describe('restoreLedgerKeyring', () => {
    it('should restore ledger keyring if it exists', async () => {
      const mockLedgerKeyringInstance = {
        deserialize: jest.fn(),
      };
      mockWithLedgerKeyring.mockImplementation(
        // @ts-expect-error The Ledger keyring is not compatible with our keyring type yet
        (operation) => operation(mockLedgerKeyringInstance),
      );
      const mockSerializedLedgerKeyring = 'serialized-keyring';

      await restoreLedgerKeyring(mockSerializedLedgerKeyring);

      expect(mockLedgerKeyringInstance.deserialize).toHaveBeenCalledWith(
        mockSerializedLedgerKeyring,
      );
    });

    it('should log error if the Ledger keyring throws an error', async () => {
      const error = new Error('Test error');
      const mockLedgerKeyringInstance = {
        deserialize: jest.fn().mockRejectedValue(error),
      };
      mockWithLedgerKeyring.mockImplementation(
        // @ts-expect-error The Ledger keyring is not compatible with our keyring type yet
        (operation) => operation(mockLedgerKeyringInstance),
      );
      const mockSerializedLedgerKeyring = 'serialized-keyring';

      await restoreLedgerKeyring(mockSerializedLedgerKeyring);

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to restore Ledger accounts on recreate vault',
      );
    });

    it('should log error if the KeyringController throws an error', async () => {
      const error = new Error('Test error');
      mockWithLedgerKeyring.mockRejectedValue(error);
      const mockSerializedLedgerKeyring = 'serialized-keyring';

      await restoreLedgerKeyring(mockSerializedLedgerKeyring);

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to restore Ledger accounts on recreate vault',
      );
    });
  });

  describe('restoreSnapAccounts', () => {
    it('creates a snap account if it exists', async () => {
      await restoreSnapAccounts(SolAccountType.DataAccount, 'entropy-source');

      expect(mockMultichainWalletSnapClient.createAccount).toHaveBeenCalledWith(
        {
          entropySource: 'entropy-source',
          scope: SolScope.Mainnet,
        },
      );
    });

    it('logs error if snap account creation fails', async () => {
      const error = new Error('Test error');
      mockMultichainWalletSnapClient.createAccount.mockRejectedValue(error);

      await restoreSnapAccounts(SolAccountType.DataAccount, 'entropy-source');

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to restore snap accounts on recreate vault',
      );
    });
  });
  describe('restoreImportedSrp', () => {
    it('restore imported srp accounts if they exist', async () => {
      mockAddNewKeyring.mockResolvedValue({ id: 'keyring-id' });
      mockWithKeyring.mockResolvedValue(null);
      await restoreImportedSrp('seed-phrase', 5);

      expect(mockAddNewKeyring).toHaveBeenCalledWith(KeyringTypes.hd, {
        mnemonic: 'seed-phrase',
      });

      expect(mockWithKeyring).toHaveBeenCalledTimes(5);
      expect(mockWithKeyring).toHaveBeenCalledWith(
        { id: 'keyring-id' },
        expect.any(Function),
      );
    });

    it('logs error if srp account creation fails', async () => {
      const error = new Error('Test error');
      mockAddNewKeyring.mockRejectedValue(error);

      await restoreImportedSrp('seed-phrase', 5);

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to restore imported srp accounts on recreate vault',
      );
    });
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

      await recreateVaultWithNewPassword(
        'old-password',
        'new-password',
        '0x123',
      );

      expect(
        mockEngine.context.KeyringController.submitPassword,
      ).toHaveBeenCalledWith('old-password');
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

      await recreateVaultWithNewPassword(
        'old-password',
        'new-password',
        '0x123',
      );

      expect(
        mockEngine.context.KeyringController.submitPassword,
      ).toHaveBeenCalledWith('old-password');
      expect(
        mockEngine.context.KeyringController.changePassword,
      ).toHaveBeenCalledWith('new-password');
      expect(mockEngine.setSelectedAddress).toHaveBeenCalledWith('0x123');
    });
  });
});
