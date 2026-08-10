import { of } from 'rxjs';
import type { DiscoveredDevice } from '@ledgerhq/device-management-kit';
import {
  ErrorCode,
  HardwareWalletError,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import {
  connectLedgerDmkDevice,
  connectLedgerDmkHardware,
  disconnectLedgerDmkSession,
  getLedgerDmkSessionState,
  isLedgerDmkBridge,
  listenToLedgerDmkAvailableDevices,
} from './LedgerDmk';
import Engine from '../../core/Engine';
import type { RestrictedController } from '@metamask/keyring-controller';
import {
  LedgerKeyring as LegacyLedgerKeyring,
  LedgerDmkBridge,
  LedgerMobileBridge,
} from '@metamask/eth-ledger-bridge-keyring';
import { LedgerKeyring } from '@metamask/eth-ledger-bridge-keyring/v2';
import type { Keyring } from '@metamask/keyring-api/v2';

jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

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

const mockSessionState = of({ connected: true });

const mockBridge = Object.create(
  LedgerDmkBridge.prototype,
) as LedgerDmkBridge & {
  getAppNameAndVersion: jest.Mock;
  updateSessionId: jest.Mock;
  connect: jest.Mock;
  destroy: jest.Mock;
  startDiscovering: jest.Mock;
};

const mockListenToAvailableDevices = jest.fn();

mockBridge.getAppNameAndVersion = jest.fn();
mockBridge.updateSessionId = jest.fn();
mockBridge.connect = jest.fn();
mockBridge.destroy = jest.fn();
mockBridge.startDiscovering = jest.fn();
Object.defineProperty(mockBridge, 'dmk', {
  configurable: true,
  enumerable: true,
  get: () => ({
    listenToAvailableDevices: mockListenToAvailableDevices,
  }),
});
Object.defineProperty(mockBridge, 'onSessionStateChange', {
  configurable: true,
  enumerable: true,
  get: () => mockSessionState,
});

const legacyLedgerKeyring = new LegacyLedgerKeyring({
  bridge: mockBridge,
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
    jest.clearAllMocks();

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
    mockBridge.updateSessionId.mockResolvedValue(true);
    legacyLedgerKeyring.bridge = mockBridge;

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

  describe('isLedgerDmkBridge', () => {
    it('returns true for LedgerDmkBridge instances', () => {
      expect(isLedgerDmkBridge(mockBridge)).toBe(true);
    });

    it('returns false for non-DMK bridges', () => {
      expect(
        isLedgerDmkBridge(Object.create(LedgerMobileBridge.prototype)),
      ).toBe(false);
      expect(isLedgerDmkBridge({})).toBe(false);
      expect(isLedgerDmkBridge(null)).toBe(false);
    });
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

    it('returns the app name from the bridge', async () => {
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
        return true;
      });

      const resultPromise = connectLedgerDmkHardware(
        mockSessionId,
        'bar',
        abortController.signal,
      );
      const error = await resultPromise.catch((caughtError) => caughtError);

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error).toMatchObject({
        code: ErrorCode.UserCancelled,
        message: 'Ledger operation aborted',
        metadata: expect.objectContaining({
          walletType: HardwareWalletType.Ledger,
        }),
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

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error).toMatchObject({
        code: ErrorCode.UserCancelled,
        message: 'Ledger operation aborted',
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

    it('throws when the bridge is not a LedgerDmkBridge', async () => {
      legacyLedgerKeyring.bridge = Object.create(
        LedgerMobileBridge.prototype,
      ) as typeof legacyLedgerKeyring.bridge;

      const error = await connectLedgerDmkHardware(mockSessionId, 'bar').catch(
        (caughtError) => caughtError,
      );

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error).toMatchObject({
        code: ErrorCode.Unknown,
        message: 'Expected LedgerDmkBridge',
      });
      expect(mockBridge.getAppNameAndVersion).not.toHaveBeenCalled();
    });

    it('throws when updateSessionId fails to bind the session', async () => {
      mockBridge.updateSessionId.mockResolvedValueOnce(false);

      const error = await connectLedgerDmkHardware(mockSessionId, 'bar').catch(
        (caughtError) => caughtError,
      );

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error).toMatchObject({
        code: ErrorCode.DeviceInvalidSession,
        message: 'Failed to bind DMK session to Ledger bridge',
      });
      expect(mockBridge.getAppNameAndVersion).not.toHaveBeenCalled();
    });
  });

  describe('listenToLedgerDmkAvailableDevices', () => {
    it('returns the observable from the bridge DMK', async () => {
      const devices$ = of([]);
      mockListenToAvailableDevices.mockReturnValue(devices$);

      const result = await listenToLedgerDmkAvailableDevices({});

      expect(mockListenToAvailableDevices).toHaveBeenCalledWith({});
      expect(result).toBe(devices$);
    });

    it('throws when the bridge is not a LedgerDmkBridge', async () => {
      legacyLedgerKeyring.bridge = {} as typeof legacyLedgerKeyring.bridge;

      const error = await listenToLedgerDmkAvailableDevices({}).catch(
        (caughtError) => caughtError,
      );

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error).toMatchObject({
        code: ErrorCode.Unknown,
        message: 'Expected LedgerDmkBridge',
      });
    });
  });

  describe('connectLedgerDmkDevice', () => {
    it('returns the session id from the keyring bridge connection', async () => {
      const device = { id: 'device-1' } as DiscoveredDevice;
      mockBridge.connect.mockResolvedValue('bridge-session-id');

      const sessionId = await connectLedgerDmkDevice(device);

      expect(mockBridge.connect).toHaveBeenCalledWith({ device });
      expect(sessionId).toBe('bridge-session-id');
    });

    it('throws when the bridge is not a LedgerDmkBridge', async () => {
      legacyLedgerKeyring.bridge = {} as typeof legacyLedgerKeyring.bridge;

      const error = await connectLedgerDmkDevice({
        id: 'device-1',
      } as DiscoveredDevice).catch((caughtError) => caughtError);

      expect(error).toBeInstanceOf(HardwareWalletError);
      expect(error).toMatchObject({
        code: ErrorCode.Unknown,
        message: 'Expected LedgerDmkBridge',
      });
    });
  });

  describe('getLedgerDmkSessionState', () => {
    it('returns the bridge session state observable', async () => {
      const sessionState = await getLedgerDmkSessionState();

      expect(sessionState).toBe(mockBridge.onSessionStateChange);
    });
  });

  describe('disconnectLedgerDmkSession', () => {
    it('destroys the bridge session', async () => {
      mockBridge.destroy.mockResolvedValue(undefined);

      await disconnectLedgerDmkSession();

      expect(mockBridge.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
