import { connectLedgerDmkHardware } from './LedgerDmk';
import Engine from '../../core/Engine';
import type { RestrictedController } from '@metamask/keyring-controller';
import {
  LedgerKeyring as LegacyLedgerKeyring,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'Ledger Hardware',
            accounts: [],
            metadata: { id: 'ledger', name: 'Ledger Hardware' },
          },
        ],
      },
      addNewKeyring: jest.fn(),
      withController: jest.fn(),
      withKeyringV2: jest.fn(),
    },
  },
}));
const MockEngine = jest.mocked(Engine);
const mockRestrictedAddNewLedgerKeyring = jest.fn();

const mockBridge = {
  getAppNameAndVersion: jest.fn(),
  updateSessionId: jest.fn(),
};

const legacyLedgerKeyring = new LegacyLedgerKeyring({
  bridge: mockBridge as unknown as LedgerMobileBridge,
});

const ledgerKeyring = new LedgerKeyring({
  legacyKeyring: legacyLedgerKeyring,
  entropySource: 'test-entropy-source',
});

function createRestrictedControllerMock(
  keyringController: typeof MockEngine.context.KeyringController,
): RestrictedController {
  const restrictedKeyrings = keyringController.state.keyrings.map(
    ({ type }) => ({
      keyring: { type },
      metadata: { id: type, name: type },
    }),
  );

  return {
    get keyrings() {
      return restrictedKeyrings;
    },
    addNewKeyring: async (type: string) => {
      mockRestrictedAddNewLedgerKeyring(type);
      const entry = {
        keyring: { type },
        metadata: { id: type, name: type },
      };
      restrictedKeyrings.push(entry);
      keyringController.state.keyrings.push({
        type,
        accounts: [],
        metadata: { id: type, name: type },
      });
      return entry;
    },
    removeKeyring: jest.fn(),
  } as unknown as RestrictedController;
}

describe('LedgerDmk', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    const mockKeyringController = MockEngine.context.KeyringController;
    mockKeyringController.state.keyrings = [
      {
        type: LegacyLedgerKeyring.type,
        accounts: [],
        metadata: { id: 'ledger', name: LegacyLedgerKeyring.type },
      },
    ];

    mockBridge.getAppNameAndVersion.mockResolvedValue({
      appName: 'appName',
    });

    jest.spyOn(ledgerKeyring, 'setDeviceId').mockImplementation();

    mockKeyringController.withKeyringV2.mockImplementation(
      (_selector, operation) =>
        operation({
          keyring: ledgerKeyring as unknown as Keyring,
          metadata: { id: '1234', name: '' },
        }),
    );
    let withControllerQueue = Promise.resolve();
    mockKeyringController.withController.mockImplementation((operation) => {
      const runOperation = () =>
        operation(createRestrictedControllerMock(mockKeyringController));
      const result = withControllerQueue.then(runOperation, runOperation);
      withControllerQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connectLedgerDmkHardware', () => {
    const mockSessionId = 'mock-session-id';
    it('calls keyring.updateSessionId', async () => {
      await connectLedgerDmkHardware(mockSessionId, 'bar');
      expect(mockBridge.updateSessionId).toHaveBeenCalled();
    });

    it('calls keyring.getAppAndVersion', async () => {
      await connectLedgerDmkHardware(mockSessionId, 'bar');
      expect(mockBridge.getAppNameAndVersion).toHaveBeenCalled();
    });

    it('returns app name correctly', async () => {
      const value = await connectLedgerDmkHardware(mockSessionId, 'bar');
      expect(value).toBe('appName');
    });

    it('releases the keyring lock before requesting app metadata from the device', async () => {
      const events: string[] = [];
      mockBridge.getAppNameAndVersion.mockImplementationOnce(async () => {
        events.push('getAppNameAndVersion');
        return { appName: 'Ethereum' };
      });
      MockEngine.context.KeyringController.withKeyringV2.mockImplementationOnce(
        async (_selector, operation) => {
          const result = await operation({
            keyring: ledgerKeyring as unknown as Keyring,
            metadata: { id: '1234', name: 'Ledger Hardware' },
          });
          events.push('withKeyring settled');
          return result;
        },
      );

      await expect(
        connectLedgerDmkHardware(mockSessionId, 'bar'),
      ).resolves.toBe('Ethereum');

      expect(mockBridge.updateSessionId).toHaveBeenCalled();
      expect(mockBridge.getAppNameAndVersion).toHaveBeenCalled();
      expect(events).toEqual(['withKeyring settled', 'getAppNameAndVersion']);
    });

    it('skips app metadata request when aborted before the BLE exchange starts', async () => {
      const abortController = new AbortController();
      mockBridge.updateSessionId.mockImplementationOnce(async () => {
        abortController.abort();
      });

      const resultPromise = connectLedgerDmkHardware(
        mockSessionId,
        'bar',
        abortController.signal,
      );
      const error = await resultPromise.catch((caughtError) => caughtError);

      expect(error).toMatchObject({
        name: 'LedgerOperationAbortedError',
      });

      expect(mockBridge.getAppNameAndVersion).not.toHaveBeenCalled();
    });

    it('throws before acquiring the keyring lock when the abort signal is already aborted', async () => {
      const abortController = new AbortController();
      abortController.abort();

      const error = await connectLedgerDmkHardware(
        mockSessionId,
        'bar',
        abortController.signal,
      ).catch((caughtError) => caughtError);

      expect(error).toMatchObject({
        name: 'LedgerOperationAbortedError',
      });

      expect(
        MockEngine.context.KeyringController.withKeyringV2,
      ).not.toHaveBeenCalled();
      expect(mockBridge.updateSessionId).not.toHaveBeenCalled();
      expect(mockBridge.getAppNameAndVersion).not.toHaveBeenCalled();
    });

    it('throws when the resolved keyring is not a LedgerKeyring instance', async () => {
      MockEngine.context.KeyringController.withKeyringV2.mockImplementationOnce(
        async (_selector, operation) =>
          operation({
            // The withKeyring helper guards against the keyring controller
            // resolving a non-Ledger keyring (e.g. due to a controller bug).
            keyring: {} as unknown as Keyring,
            metadata: { id: '1234', name: '' },
          }),
      );

      await expect(
        connectLedgerDmkHardware(mockSessionId, 'bar'),
      ).rejects.toThrow('Expected LedgerKeyring');
    });
  });
});
