import Logger from '../util/Logger';
import Engine from './Engine';

import { getLedgerKeyring } from './Ledger/Ledger';
import { restoreLedgerKeyring, restoreQRKeyring } from './Vault';

jest.mock('./Engine', () => ({
  context: {
    KeyringController: {
      getKeyringsByType: jest.fn(),
      restoreQRKeyring: jest.fn(),
      addNewKeyring: jest.fn(),
      persistAllKeyrings: jest.fn(),
      getAccounts: jest.fn().mockReturnValue(['account']),
    },
  },
}));
const MockEngine = jest.mocked(Engine);

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./Ledger/Ledger', () => ({
  getLedgerKeyring: jest.fn(),
}));

describe('Vault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('restoreQRKeyring', () => {
    it('should restore QR keyring if it exists', async () => {
      const { KeyringController } = MockEngine.context;
      const mockQRKeyring = {
        serialize: jest.fn().mockResolvedValue('serialized-keyring-data'),
      };

      await restoreQRKeyring(mockQRKeyring);

      expect(mockQRKeyring.serialize).toHaveBeenCalled();
      expect(KeyringController.restoreQRKeyring).toHaveBeenCalledWith(
        'serialized-keyring-data',
      );
    });

    it('should not restore QR keyring if it does not exist', async () => {
      const { KeyringController } = MockEngine.context;

      await restoreQRKeyring([]);

      expect(KeyringController.restoreQRKeyring).not.toHaveBeenCalled();
    });

    it('should log error if an exception is thrown', async () => {
      const error = new Error('Test error');
      const mockKeyring = { serialize: jest.fn().mockRejectedValue(error) };

      await restoreQRKeyring(mockKeyring);
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to get qr accounts on recreate vault',
      );
    });
  });

  describe('restoreLedgerKeyring', () => {
    it('should restore ledger keyring if it exists', async () => {
      const { KeyringController } = MockEngine.context;

      const mockSerialisedKeyring = jest.fn();
      const mockDeserializedKeyring = jest.fn();
      (getLedgerKeyring as jest.Mock).mockResolvedValue({
        deserialize: mockDeserializedKeyring,
      });
      await restoreLedgerKeyring({ serialize: mockSerialisedKeyring });

      expect(mockSerialisedKeyring).toHaveBeenCalled();
      expect(getLedgerKeyring).toHaveBeenCalled();
      expect(mockDeserializedKeyring).toHaveBeenCalled();
      expect(KeyringController.persistAllKeyrings).toHaveBeenCalled();
    });

    it('should not restore ledger keyring if it does not exist', async () => {
      const { KeyringController } = MockEngine.context;

      await restoreLedgerKeyring();
      expect(KeyringController.persistAllKeyrings).not.toHaveBeenCalled();
    });

    it('should log error if an exception is thrown', async () => {
      const { KeyringController } = MockEngine.context;

      (getLedgerKeyring as jest.Mock).mockResolvedValue({
        deserialize: jest.fn(),
      });

      const error = new Error('Test error');
      KeyringController.persistAllKeyrings.mockRejectedValue(error);

      await restoreLedgerKeyring({ serialize: jest.fn() });

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to restore Ledger accounts on recreate vault',
      );
    });
  });
});
