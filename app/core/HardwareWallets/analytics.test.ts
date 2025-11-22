import { KeyringTypes } from '@metamask/keyring-controller';
import { getConnectedDevicesCount } from './analytics';

jest.mock('../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        getKeyringsByType: jest.fn(),
      },
    },
  },
}));

import Engine from '../Engine';

describe('getConnectedDevicesCount', () => {
  const mockKeyringController = Engine.context.KeyringController;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the total count of all hardware wallets', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.resolve([{ type: 'ledger' }]);
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr' }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(2); // 1 ledger + 1 qr = 2
  });

  it('should return 0 when all keyring types have no devices', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(0);
  });

  it('should handle rejected promises gracefully and count only successful ones', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.reject(new Error('Ledger not available'));
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr' }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(1); // 0 ledger (rejected) + 1 qr = 1
  });

  it('should handle all promises being rejected', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockRejectedValue(
      new Error('Keyring error'),
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(0);
  });
});
