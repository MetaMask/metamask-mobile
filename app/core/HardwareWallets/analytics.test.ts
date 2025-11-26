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

  it('returns the total count of all hardware wallets', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.resolve([{ type: 'ledger', accounts: ['0x123'] }]);
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr', accounts: ['0x456'] }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(2);
  });

  it('returns 0 when all keyring types have no devices', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockResolvedValue(
      [],
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(0);
  });

  it('handles rejected promises gracefully and counts only successful ones', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.reject(new Error('Ledger not available'));
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr', accounts: ['0x456'] }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(1);
  });

  it('handles all promises being rejected', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockRejectedValue(
      new Error('Keyring error'),
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(0);
  });

  it('returns 0 when keyrings have no accounts', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.resolve([{ type: 'ledger', accounts: [] }]);
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr', accounts: [] }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(0);
  });

  it('returns 0 when keyrings do not have accounts property', async () => {
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

    expect(result).toBe(0);
  });

  it('counts all hardware wallet types with accounts', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.resolve([
              { type: 'ledger', accounts: ['0x123'] },
              { type: 'ledger', accounts: ['0x789'] },
            ]);
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr', accounts: ['0x456'] }]);
          case KeyringTypes.lattice:
            return Promise.resolve([{ type: 'lattice', accounts: ['0xabc'] }]);
          case KeyringTypes.trezor:
            return Promise.resolve([{ type: 'trezor', accounts: ['0xdef'] }]);
          case KeyringTypes.oneKey:
            return Promise.resolve([{ type: 'oneKey', accounts: ['0x111'] }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(6);
  });

  it('filters out keyrings with null accounts', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.resolve([
              { type: 'ledger', accounts: ['0x123'] },
              { type: 'ledger', accounts: null },
            ]);
          case KeyringTypes.qr:
            return Promise.resolve([{ type: 'qr', accounts: ['0x456'] }]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(2);
  });

  it('filters out keyrings with undefined accounts', async () => {
    (mockKeyringController.getKeyringsByType as jest.Mock).mockImplementation(
      (type: KeyringTypes) => {
        switch (type) {
          case KeyringTypes.ledger:
            return Promise.resolve([
              { type: 'ledger', accounts: ['0x123'] },
              { type: 'ledger', accounts: undefined },
            ]);
          default:
            return Promise.resolve([]);
        }
      },
    );

    const result = await getConnectedDevicesCount();

    expect(result).toBe(1);
  });
});
