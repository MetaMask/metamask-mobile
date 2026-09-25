import Engine from '../Engine';
import { WatchOnlyKeyring } from './WatchOnlyKeyring';
import { WatchOnlySession } from './WatchOnlySession';

jest.mock('../Engine', () => ({
  context: {
    KeyringController: {
      state: { keyrings: [] },
      addNewKeyring: jest.fn(),
      removeAccount: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

const mockAddNewKeyring = Engine.context.KeyringController
  .addNewKeyring as jest.Mock;
const mockRemoveAccount = Engine.context.KeyringController
  .removeAccount as jest.Mock;
const mockSetSelectedAddress = Engine.setSelectedAddress as jest.Mock;

describe('WatchOnlySession', () => {
  // __DEV__ is a bare global injected by RN/Jest — not typed on globalThis.
  const devGlobal = global as unknown as { __DEV__: boolean };
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    devGlobal.__DEV__ = true;
    Engine.context.KeyringController.state.keyrings = [];
  });

  afterEach(() => {
    devGlobal.__DEV__ = originalDev;
  });

  describe('start', () => {
    it('throws outside of development builds', async () => {
      devGlobal.__DEV__ = false;

      await expect(WatchOnlySession.start(VALID_ADDRESS)).rejects.toThrow(
        'Watch-only sessions are only available in development',
      );
    });

    it('rejects an invalid EVM address', async () => {
      await expect(WatchOnlySession.start('not-an-address')).rejects.toThrow(
        'Invalid EVM address: not-an-address',
      );
      expect(mockAddNewKeyring).not.toHaveBeenCalled();
    });

    it('stops any previous session before adding the new keyring', async () => {
      Engine.context.KeyringController.state.keyrings = [
        {
          type: WatchOnlyKeyring.type,
          accounts: [OTHER_ADDRESS],
          metadata: { id: 'watch-only-keyring', name: '' },
        },
      ];

      await WatchOnlySession.start(VALID_ADDRESS);

      expect(mockRemoveAccount).toHaveBeenCalledWith(OTHER_ADDRESS);
      expect(mockAddNewKeyring).toHaveBeenCalledWith(WatchOnlyKeyring.type, {
        addresses: [VALID_ADDRESS],
      });
    });

    it('selects the newly watched address', async () => {
      await WatchOnlySession.start(VALID_ADDRESS);

      expect(mockSetSelectedAddress).toHaveBeenCalledWith(VALID_ADDRESS);
    });
  });

  describe('stop', () => {
    it('throws outside of development builds', async () => {
      devGlobal.__DEV__ = false;

      await expect(WatchOnlySession.stop()).rejects.toThrow(
        'Watch-only sessions are only available in development',
      );
    });

    it('removes every watched address', async () => {
      Engine.context.KeyringController.state.keyrings = [
        {
          type: WatchOnlyKeyring.type,
          accounts: [VALID_ADDRESS],
          metadata: { id: 'watch-only-keyring', name: '' },
        },
      ];

      await WatchOnlySession.stop();

      expect(mockRemoveAccount).toHaveBeenCalledWith(VALID_ADDRESS);
    });

    it('does not call removeAccount when no watch-only keyring exists', async () => {
      await WatchOnlySession.stop();

      expect(mockRemoveAccount).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('reports inactive when there is no watch-only keyring', () => {
      const status = WatchOnlySession.getStatus();

      expect(status).toEqual({ active: false, address: null });
    });

    it('reports the active watched address', () => {
      Engine.context.KeyringController.state.keyrings = [
        {
          type: WatchOnlyKeyring.type,
          accounts: [VALID_ADDRESS],
          metadata: { id: 'watch-only-keyring', name: '' },
        },
      ];

      const status = WatchOnlySession.getStatus();

      expect(status).toEqual({ active: true, address: VALID_ADDRESS });
    });
  });
});
