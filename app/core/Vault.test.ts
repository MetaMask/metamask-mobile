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
      updateIdentities: jest.fn(),
      getAccounts: jest.fn().mockReturnValue(['account']),
    },
  },
}));

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
      const { KeyringController } = Engine.context;
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
      const { KeyringController } = Engine.context;

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
      const { KeyringController } = Engine.context;
      (getLedgerKeyring as jest.Mock).mockResolvedValue('foo');
      await restoreLedgerKeyring();
      expect(getLedgerKeyring).toHaveBeenCalled();
      expect(KeyringController.persistAllKeyrings).toHaveBeenCalled();
      expect(KeyringController.updateIdentities).toHaveBeenCalled();
      expect(KeyringController.getAccounts).toHaveBeenCalled();
    });

    it('should not restore ledger keyring if it does not exist', async () => {
      const { KeyringController } = Engine.context;
      (getLedgerKeyring as jest.Mock).mockResolvedValue('');
      await restoreLedgerKeyring();
      expect(KeyringController.persistAllKeyrings).not.toHaveBeenCalled();
      expect(KeyringController.updateIdentities).not.toHaveBeenCalled();
      expect(KeyringController.getAccounts).not.toHaveBeenCalled();
    });

    it('should log error if an exception is thrown', async () => {
      const { KeyringController } = Engine.context;
      (getLedgerKeyring as jest.Mock).mockResolvedValue('foo');
      const error = new Error('Test error');
      KeyringController.persistAllKeyrings.mockRejectedValue(error);
      await restoreLedgerKeyring();
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'error while trying to restore Ledger accounts on recreate vault',
      );
    });
  });
});
