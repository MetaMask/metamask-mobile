import { KeyringTypes } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import {
  importNewSecretRecoveryPhrase,
  createNewSecretRecoveryPhrase,
} from './';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

jest.mock('../../util/Logger');

const mockSetSelectedAddress = jest.fn();
const mockAddNewKeyring = jest.fn();
const mockGetKeyringsByType = jest.fn();
const mockGetAccounts = jest.fn();

const hdKeyring = {
  getAccounts: () => {
    mockGetAccounts();
    return ['0x123'];
  },
};

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      addNewKeyring: (keyringType: ExtendedKeyringTypes, args: unknown) =>
        mockAddNewKeyring(keyringType, args),
      getKeyringsByType: () => mockGetKeyringsByType(),
      withKeyring: (_selector: unknown, operation: (args: unknown) => void) =>
        operation({ keyring: hdKeyring, metadata: { id: '1234' } }),
    },
  },
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
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
    it('imports new SRP', async () => {
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({ getAccounts: () => [testAddress] });

      await importNewSecretRecoveryPhrase(testMnemonic);

      expect(mockAddNewKeyring).toHaveBeenCalledWith(ExtendedKeyringTypes.hd, {
        mnemonic: testMnemonic,
        numberOfAccounts: 1,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
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
});
