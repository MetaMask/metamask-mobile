import { KeyringTypes } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import {
  importNewSecretRecoveryPhrase,
  createNewSecretRecoveryPhrase,
  addNewHdAccount,
} from './';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { address } from '@solana/addresses';

const mockSetSelectedAddress = jest.fn();
const mockAddNewKeyring = jest.fn();
const mockGetKeyringsByType = jest.fn();
const mockWithKeyring = jest.fn();
const mockGetAccounts = jest.fn();
const mockSetAccountLabel = jest.fn();
jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      addNewKeyring: (keyringType: ExtendedKeyringTypes, args: unknown) =>
        mockAddNewKeyring(keyringType, args),
      getKeyringsByType: () => mockGetKeyringsByType(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      withKeyring: (args: any) => mockWithKeyring(args),
      getAccounts: () => mockGetAccounts(),
    },
  },
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
  setAccountLabel: (address: string, label: string) =>
    mockSetAccountLabel(address, label),
}));

jest.mocked(Engine);

const testAddress = '0x123';
const testMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

describe('MultiSRP Actions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('importNewSecretRecoveryPhrase', () => {
    it('should import new SRP successfully', async () => {
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({ getAccounts: () => [testAddress] });

      await importNewSecretRecoveryPhrase(testMnemonic);

      expect(mockAddNewKeyring).toHaveBeenCalledWith(ExtendedKeyringTypes.hd, {
        mnemonic: testMnemonic,
        numberOfAccounts: 1,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
    });

    it('should throw error if SRP already imported', async () => {
      mockGetKeyringsByType.mockResolvedValue([
        {
          mnemonic: new Uint16Array(
            testMnemonic.split(' ').map((word) => wordlist.indexOf(word)),
          ).buffer,
        },
      ]);

      await importNewSecretRecoveryPhrase(testMnemonic);

      expect(mockAddNewKeyring).not.toHaveBeenCalled();
    });
  });

  describe('createNewSecretRecoveryPhrase', () => {
    it('should create new SRP successfully', async () => {
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

    it('should handle errors gracefully', async () => {
      mockAddNewKeyring.mockRejectedValue(new Error('Test error'));

      await createNewSecretRecoveryPhrase();

      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
    });
  });

  describe('addNewHdAccount', () => {
    it('should add new HD account successfully with name', async () => {
      mockWithKeyring.mockResolvedValue(Promise.resolve([testAddress]));

      await addNewHdAccount('Test Account');

      expect(mockWithKeyring).toHaveBeenCalledWith({
        type: ExtendedKeyringTypes.hd,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        testAddress,
        'Test Account',
      );
    });

    it('should add new HD account successfully without name', async () => {
      mockWithKeyring.mockResolvedValue([testAddress]);

      await addNewHdAccount();

      expect(mockWithKeyring).toHaveBeenCalledWith({
        type: ExtendedKeyringTypes.hd,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSetAccountLabel).not.toHaveBeenCalled();
    });

    it('should use keyringId when provided', async () => {
      const keyringId = 'test-keyring-id';
      mockWithKeyring.mockResolvedValue([testAddress]);

      await addNewHdAccount('Test Account', keyringId);

      expect(mockWithKeyring).toHaveBeenCalledWith({ id: keyringId });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
    });

    it('should handle errors gracefully', async () => {
      mockWithKeyring.mockRejectedValue(new Error('Test error'));

      await addNewHdAccount('Test Account');

      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
      expect(mockSetAccountLabel).not.toHaveBeenCalled();
    });
  });
});
