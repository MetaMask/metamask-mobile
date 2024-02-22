import Engine from './Engine';
import Logger from '../util/Logger';
import { KeyringTypes } from '@metamask/keyring-controller';

import { restoreQRKeyring } from './Vault';

jest.mock('./Engine', () => ({
  context: {
    KeyringController: {
      getKeyringsByType: jest.fn(),
      restoreQRKeyring: jest.fn(),
    },
  },
}));

jest.mock('../util/Logger', () => ({
  error: jest.fn(),
}));

describe('restoreQRKeyring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should restore QR keyring if it exists', async () => {
    const { KeyringController } = Engine.context;
    const mockQRKeyring = {
      serialize: jest.fn().mockResolvedValue('serialized-keyring-data'),
    };
    KeyringController.getKeyringsByType.mockResolvedValue([mockQRKeyring]);
    await restoreQRKeyring();
    expect(KeyringController.getKeyringsByType).toHaveBeenCalledWith(
      KeyringTypes.qr,
    );
    expect(mockQRKeyring.serialize).toHaveBeenCalled();
    expect(KeyringController.restoreQRKeyring).toHaveBeenCalledWith(
      'serialized-keyring-data',
    );
  });

  it('should not restore QR keyring if it does not exist', async () => {
    const { KeyringController } = Engine.context;
    KeyringController.getKeyringsByType.mockResolvedValue([]);
    await restoreQRKeyring();
    expect(KeyringController.getKeyringsByType).toHaveBeenCalledWith(
      KeyringTypes.qr,
    );
    expect(KeyringController.restoreQRKeyring).not.toHaveBeenCalled();
  });

  it('should log error if an exception is thrown', async () => {
    const { KeyringController } = Engine.context;
    const error = new Error('Test error');
    const mockKeyring = { serialize: jest.fn().mockRejectedValue(error) };
    KeyringController.getKeyringsByType.mockResolvedValue([mockKeyring]);
    await restoreQRKeyring();
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'error while trying to get qr accounts on recreate vault',
    );
  });
});
