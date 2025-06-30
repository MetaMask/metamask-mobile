import { KeyringTypes } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import {
  importNewSecretRecoveryPhrase,
  createNewSecretRecoveryPhrase,
  addNewHdAccount,
} from './';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';

const testAddress = '0x123';
const mockExpectedAccount = createMockInternalAccount(
  testAddress,
  'Account 1',
  KeyringTypes.hd,
);

const mockSetSelectedAddress = jest.fn();
const mockAddNewKeyring = jest.fn();
const mockGetKeyringsByType = jest.fn();
const mockGetAccounts = jest.fn();
const mockAddAccounts = jest.fn();
const mockSetAccountLabel = jest.fn();
const mockControllerMessenger = jest.fn();
const mockAddDiscoveredAccounts = jest.fn();
const mockGetAccountByAddress = jest.fn().mockReturnValue(mockExpectedAccount);

const hdKeyring = {
  getAccounts: () => {
    mockGetAccounts();
    return ['0x123'];
  },
  addAccounts: (n: number) => {
    mockAddAccounts(n);
    return ['0x123'];
  },
};

const mockSnapClient = {
  addDiscoveredAccounts: mockAddDiscoveredAccounts,
};

jest.mock('../../core/redux/ReduxService', () => ({
  store: {
    getState: () => ({}),
  },
}));

jest.mock('../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('../../core/SnapKeyring/MultichainWalletSnapClient'),
  MultichainWalletSnapFactory: {
    createClient: () => mockSnapClient,
  },
}));

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      addNewKeyring: (keyringType: ExtendedKeyringTypes, args: unknown) =>
        mockAddNewKeyring(keyringType, args),
      getKeyringsByType: () => mockGetKeyringsByType(),
      withKeyring: (_selector: unknown, operation: (args: unknown) => void) =>
        operation({ keyring: hdKeyring, metadata: { id: '1234' } }),
    },
    AccountsController: {
      getNextAvailableAccountName: jest.fn().mockReturnValue('Snap Account 1'),
      getAccountByAddress: () => mockGetAccountByAddress(),
    },
  },
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
  setAccountLabel: (address: string, label: string) =>
    mockSetAccountLabel(address, label),
  controllerMessenger: mockControllerMessenger,
}));

jest.mocked(Engine);

const testMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

describe('MultiSRP Actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('importNewSecretRecoveryPhrase', () => {
    it('imports new SRP', async () => {
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({ getAccounts: () => [testAddress] });

      await importNewSecretRecoveryPhrase(testMnemonic);

      expect(mockAddNewKeyring).toHaveBeenCalledWith(ExtendedKeyringTypes.hd, {
        mnemonic: testMnemonic,
        numberOfAccounts: 1,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockAddDiscoveredAccounts).toHaveBeenCalled();
    });

    it('throws error if SRP already imported', async () => {
      mockGetKeyringsByType.mockResolvedValue([
        {
          mnemonic: new Uint16Array(
            testMnemonic.split(' ').map((word) => wordlist.indexOf(word)),
          ).buffer,
        },
      ]);

      await expect(
        async () => await importNewSecretRecoveryPhrase(testMnemonic),
      ).rejects.toThrow('This mnemonic has already been imported.');

      expect(mockAddNewKeyring).not.toHaveBeenCalled();
    });
  });

  describe('createNewSecretRecoveryPhrase', () => {
    it('creates new SRP', async () => {
      mockAddNewKeyring.mockResolvedValue({
        getAccounts: () => Promise.resolve([testAddress]),
      });

      await createNewSecretRecoveryPhrase();

      expect(mockAddNewKeyring).toHaveBeenCalledWith(
        KeyringTypes.hd,
        undefined,
      );
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
    });

    it('Does not set selected address or gets accounts on errors', async () => {
      mockAddNewKeyring.mockRejectedValue(new Error('Test error'));

      await expect(
        async () => await createNewSecretRecoveryPhrase(),
      ).rejects.toThrow('Test error');

      expect(mockGetAccounts).not.toHaveBeenCalled();
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
    });
  });

  describe('addNewHdAccount', () => {
    it('adds a new HD account, sets the selected address and returns the account', async () => {
      mockAddAccounts.mockReturnValue([testAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      const account = await addNewHdAccount();

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(account).toEqual(mockExpectedAccount);
    });

    it('adds a new HD account with a specific keyring ID and sets the selected address', async () => {
      const keyringId = 'test-keyring-id';
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);
      mockAddAccounts.mockReturnValue([testAddress]);

      await addNewHdAccount(keyringId);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
    });

    it('adds a new HD account and sets the account label if a name is provided', async () => {
      const accountName = 'Test Account';
      mockAddAccounts.mockReturnValue([testAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      await addNewHdAccount(undefined, accountName);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        testAddress,
        accountName,
      );
    });

    it('adds a new HD account with a specific keyring ID and sets the account label if a name is provided', async () => {
      const keyringId = 'test-keyring-id';
      const accountName = 'Test Account';
      mockAddAccounts.mockReturnValue([testAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      await addNewHdAccount(keyringId, accountName);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        testAddress,
        accountName,
      );
    });

    it('throws if the newly added account is not found', async () => {
      mockGetAccountByAddress.mockReturnValue(undefined);

      await expect(async () => await addNewHdAccount()).rejects.toThrow(
        'Account not found',
      );
    });
  });
});
