import { Subject } from 'rxjs';
import {
  DeviceLockedError,
  type DiscoveredDevice as DmkDiscoveredDevice,
} from '@ledgerhq/device-management-kit';
import { DeviceEvent } from '@metamask/hw-wallet-sdk';
import { PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Linking, Platform } from 'react-native';

const mockBleStateSubscription = { unsubscribe: jest.fn() };
let mockBleObserver: {
  next?: (e: { type: string; available: boolean }) => void;
  error?: (e: Error) => void;
  complete?: () => void;
} | null = null;

const mockGetSystemVersion = jest.fn();
const mockRequestMultiple = jest.fn();
const mockRequest = jest.fn();

const mockOpenEthereumAppOnLedger = jest.fn();
const mockCloseRunningAppOnLedger = jest.fn();

const mockConnectLedgerHardware = jest.fn();
const mockConnectLedgerDmkDevice = jest.fn();
const mockGetLedgerDmkSessionState = jest.fn();
const mockDisconnectLedgerDmkSession = jest.fn();
const mockListenToLedgerDmkAvailableDevices = jest.fn();

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    observeState: jest.fn(
      (observer: {
        next?: (e: { type: string; available: boolean }) => void;
      }) => {
        mockBleObserver = observer;
        observer.next?.({ type: 'PoweredOn', available: true });
        return mockBleStateSubscription;
      },
    ),
  },
}));

jest.mock('react-native-ble-plx', () => ({
  State: { PoweredOn: 'PoweredOn' },
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
  },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' },
  requestMultiple: (...args: unknown[]) => mockRequestMultiple(...args),
  request: (...args: unknown[]) => mockRequest(...args),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: (...args: unknown[]) => mockGetSystemVersion(...args),
}));

jest.mock('../../Ledger/Ledger', () => ({
  openEthereumAppOnLedger: (...args: unknown[]) =>
    mockOpenEthereumAppOnLedger(...args),
  closeRunningAppOnLedger: (...args: unknown[]) =>
    mockCloseRunningAppOnLedger(...args),
}));

jest.mock('../../Ledger/LedgerDmk', () => ({
  connectLedgerDmkHardware: (...args: unknown[]) =>
    mockConnectLedgerHardware(...args),
  connectLedgerDmkDevice: (...args: unknown[]) =>
    mockConnectLedgerDmkDevice(...args),
  getLedgerDmkSessionState: (...args: unknown[]) =>
    mockGetLedgerDmkSessionState(...args),
  disconnectLedgerDmkSession: (...args: unknown[]) =>
    mockDisconnectLedgerDmkSession(...args),
  listenToLedgerDmkAvailableDevices: (...args: unknown[]) =>
    mockListenToLedgerDmkAvailableDevices(...args),
}));

import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';

const DEVICE_ID = 'device-123';
const RETRY_DELAY_MS = 2000;
const SCAN_TIMEOUT_MS = 30000;
const OPERATION_TIMEOUT_MS = 10000;
const DEBOUNCE_MS = 3000;

describe('LedgerBluetoothDMKAdapter', () => {
  let adapter: LedgerBluetoothDMKAdapter;
  let onDeviceEvent: jest.Mock;
  let onDisconnect: jest.Mock;
  let scanSubject: Subject<DmkDiscoveredDevice[]>;
  let sessionStateSubject: Subject<{ connected: boolean }>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetSystemVersion.mockReturnValue('13');
    mockBleObserver = null;

    onDeviceEvent = jest.fn();
    onDisconnect = jest.fn();
    adapter = new LedgerBluetoothDMKAdapter({
      onDeviceEvent,
      onDisconnect,
    });

    scanSubject = new Subject<DmkDiscoveredDevice[]>();
    sessionStateSubject = new Subject<{ connected: boolean }>();

    mockListenToLedgerDmkAvailableDevices.mockResolvedValue(
      scanSubject.asObservable(),
    );
    mockConnectLedgerDmkDevice.mockResolvedValue('session-1');
    mockDisconnectLedgerDmkSession.mockResolvedValue(undefined);
    mockGetLedgerDmkSessionState.mockReturnValue(
      sessionStateSubject.asObservable(),
    );
  });

  afterEach(() => {
    adapter.destroy();
  });

  const flushPromises = () =>
    new Promise<void>((resolve) => setImmediate(resolve));

  const expectEmitted = (event: DeviceEvent) =>
    expect(onDeviceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event }),
    );
  const expectNotEmitted = (event: DeviceEvent) =>
    expect(onDeviceEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ event }),
    );

  const deferredSession = (): {
    promise: Promise<string>;
    resolve: (value: string) => void;
  } => {
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  async function discoverDevice(
    id: string = DEVICE_ID,
    name = 'Nano X',
  ): Promise<void> {
    adapter.startDeviceDiscovery(jest.fn(), jest.fn());
    await flushPromises();
    scanSubject.next([{ id, name } as DmkDiscoveredDevice]);
    await flushPromises();
    adapter.stopDeviceDiscovery();
  }

  async function connectFirst(id: string = DEVICE_ID): Promise<void> {
    await discoverDevice(id);
    await adapter.connect(id);
  }

  describe('flow state', () => {
    it('starts disconnected with a null device id', () => {
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });

    it('marks the flow complete', () => {
      adapter.markFlowComplete();

      expect(adapter.isFlowComplete()).toBe(true);
    });

    it('clears the completed flow state when reset', () => {
      adapter.markFlowComplete();
      adapter.reset();

      expect(adapter.isFlowComplete()).toBe(false);
    });

    it('clears the completed flow state when resetFlowState', () => {
      adapter.markFlowComplete();
      adapter.resetFlowState();

      expect(adapter.isFlowComplete()).toBe(false);
    });
  });

  describe('connect()', () => {
    beforeEach(async () => {
      await discoverDevice();
      await discoverDevice('device-B', 'Nano B');
    });

    it('establishes a session, emits Connected, and reports connected state', async () => {
      await adapter.connect(DEVICE_ID);

      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getConnectedDeviceId()).toBe(DEVICE_ID);
      expectEmitted(DeviceEvent.Connected);
    });

    it('is idempotent when already connected to the same device', async () => {
      await adapter.connect(DEVICE_ID);
      mockConnectLedgerDmkDevice.mockClear();

      await adapter.connect(DEVICE_ID);

      expect(mockConnectLedgerDmkDevice).not.toHaveBeenCalled();
    });

    it('disconnects the prior session when connecting to a different device', async () => {
      await adapter.connect(DEVICE_ID);
      mockDisconnectLedgerDmkSession.mockClear();

      await adapter.connect('device-B');

      expect(mockDisconnectLedgerDmkSession).toHaveBeenCalled();
      expect(adapter.getConnectedDeviceId()).toBe('device-B');
    });
  });

  describe('#doConnect (no cached device / retries / failure)', () => {
    it('emits ConnectionFailed (no throw) when the device is not cached', async () => {
      await adapter.connect('unknown-device');

      expectEmitted(DeviceEvent.ConnectionFailed);
    });

    it('retries and succeeds on the second attempt', async () => {
      await discoverDevice();
      jest.useFakeTimers();
      try {
        mockConnectLedgerDmkDevice
          .mockReset()
          .mockRejectedValueOnce(new Error('ble hiccup'))
          .mockResolvedValueOnce('session-retry');

        const pending = adapter.connect(DEVICE_ID);
        await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);

        await expect(pending).resolves.toBeUndefined();
        expect(adapter.isConnected()).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    interface ConnectFailCase {
      name: string;
      reason: unknown;
    }
    const connectFailCases: ConnectFailCase[] = [
      { name: 'an Error', reason: new Error('persistent failure') },
      { name: 'a non-Error string', reason: 'string boom' },
    ];
    it.each(connectFailCases)(
      'emits ConnectionFailed (error wrapped via #toError) and throws after all attempts fail for $name',
      async ({ reason }: ConnectFailCase) => {
        await discoverDevice();
        jest.useFakeTimers();
        try {
          mockConnectLedgerDmkDevice.mockReset().mockRejectedValue(reason);

          const pending = adapter.connect(DEVICE_ID);
          pending.catch(() => undefined);
          await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);

          await expect(pending).rejects.toBe(reason);
          expect(onDeviceEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              event: DeviceEvent.ConnectionFailed,
              error: reason instanceof Error ? reason : expect.any(Error),
            }),
          );
        } finally {
          jest.useRealTimers();
        }
      },
    );

    it('cleans up and returns if destroyed after the session resolves', async () => {
      await discoverDevice();
      const { promise, resolve } = deferredSession();
      mockConnectLedgerDmkDevice.mockReset().mockReturnValue(promise);

      const pending = adapter.connect(DEVICE_ID);
      await flushPromises();

      adapter.destroy();
      resolve('session-x');

      await expect(pending).resolves.toBeUndefined();
      expect(mockDisconnectLedgerDmkSession).toHaveBeenCalled();
    });
  });

  describe('backgroundReconnect()', () => {
    it('returns false when the adapter has been destroyed', async () => {
      adapter.destroy();
      await expect(adapter.backgroundReconnect(DEVICE_ID)).resolves.toBe(false);
    });

    it('directly reconnects using the cached device without scanning', async () => {
      await connectFirst();
      mockDisconnectLedgerDmkSession.mockClear();

      const ok = await adapter.backgroundReconnect(DEVICE_ID, 5000);

      expect(ok).toBe(true);
      expectEmitted(DeviceEvent.Connected);
    });

    it('cleans up and returns false if destroyed after a direct reconnect resolves', async () => {
      await connectFirst();
      const { promise, resolve } = deferredSession();
      mockConnectLedgerDmkDevice.mockReset().mockReturnValue(promise);

      const pending = adapter.backgroundReconnect(DEVICE_ID, 5000);
      await flushPromises();

      adapter.destroy();
      resolve('session-z');

      await expect(pending).resolves.toBe(false);
      expect(mockDisconnectLedgerDmkSession).toHaveBeenCalled();
    });

    it('falls back to scanning when the direct connect fails', async () => {
      await connectFirst();
      mockConnectLedgerDmkDevice.mockRejectedValueOnce(
        new Error('direct fail'),
      );

      const pending = adapter.backgroundReconnect(DEVICE_ID, 5000);
      await flushPromises();
      await flushPromises();
      scanSubject.next([
        { id: DEVICE_ID, name: 'Nano X' } as DmkDiscoveredDevice,
      ]);

      await expect(pending).resolves.toBe(true);
    });

    it('returns false when the device is not found within the scan timeout', async () => {
      jest.useFakeTimers();
      try {
        const pending = adapter.backgroundReconnect('missing-device', 1000);
        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(1000);

        await expect(pending).resolves.toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns false when scanning itself throws', async () => {
      mockListenToLedgerDmkAvailableDevices.mockRejectedValueOnce(
        new Error('scan down'),
      );
      await expect(
        adapter.backgroundReconnect('missing-device', 1000),
      ).resolves.toBe(false);
    });

    it('reuses an in-flight background reconnect rather than starting a second', async () => {
      await connectFirst();
      const { promise, resolve } = deferredSession();
      mockConnectLedgerDmkDevice.mockReset().mockReturnValue(promise);
      mockConnectLedgerDmkDevice.mockClear();

      const first = adapter.backgroundReconnect(DEVICE_ID, 5000);
      await flushPromises();
      const callsAfterFirst = mockConnectLedgerDmkDevice.mock.calls.length;
      const second = adapter.backgroundReconnect(DEVICE_ID, 5000);
      await flushPromises();

      expect(mockConnectLedgerDmkDevice.mock.calls.length).toBe(
        callsAfterFirst,
      );

      resolve('session-2');
      await expect(first).resolves.toBe(true);
      await expect(second).resolves.toBe(true);
    });
  });

  describe('disconnect()', () => {
    it('emits Disconnected when the flow is not complete', async () => {
      await connectFirst();
      onDeviceEvent.mockClear();

      await adapter.disconnect();

      expectEmitted(DeviceEvent.Disconnected);
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });

    it('suppresses the Disconnected event when the flow is complete', async () => {
      await connectFirst();
      adapter.markFlowComplete();
      onDeviceEvent.mockClear();

      await adapter.disconnect();

      expectNotEmitted(DeviceEvent.Disconnected);
    });
  });

  describe('startDeviceDiscovery()', () => {
    it('calls onDeviceFound for each new device and dedupes repeats', async () => {
      const onFound = jest.fn();
      adapter.startDeviceDiscovery(onFound, jest.fn());
      await flushPromises();

      scanSubject.next([{ id: 'a', name: 'A' } as DmkDiscoveredDevice]);
      scanSubject.next([
        { id: 'a', name: 'A' } as DmkDiscoveredDevice,
        { id: 'b', name: 'B' } as DmkDiscoveredDevice,
      ]);
      await flushPromises();

      expect(onFound).toHaveBeenCalledTimes(2);
    });

    it('forwards scan errors to onError and stops discovery', async () => {
      const onError = jest.fn();
      adapter.startDeviceDiscovery(jest.fn(), onError);
      await flushPromises();

      scanSubject.error(new Error('scan failed'));
      await flushPromises();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('surfaces listen() failures via onError', async () => {
      mockListenToLedgerDmkAvailableDevices.mockRejectedValueOnce(
        new Error('listen fail'),
      );
      const onError = jest.fn();
      adapter.startDeviceDiscovery(jest.fn(), onError);
      await flushPromises();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('reports an error when the scan times out with no devices found', async () => {
      jest.useFakeTimers();
      try {
        const onError = jest.fn();
        adapter.startDeviceDiscovery(jest.fn(), onError);
        await jest.advanceTimersByTimeAsync(0);
        await jest.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS);

        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      } finally {
        jest.useRealTimers();
      }
    });

    it('throws when started on a destroyed adapter', () => {
      adapter.destroy();
      expect(() => adapter.startDeviceDiscovery(jest.fn(), jest.fn())).toThrow(
        'Adapter has been destroyed',
      );
    });

    it('returns an unsubscribe function that stops discovery', async () => {
      const onFound = jest.fn();
      const stop = adapter.startDeviceDiscovery(onFound, jest.fn());
      await flushPromises();

      stop();
      scanSubject.next([{ id: 'a', name: 'A' } as DmkDiscoveredDevice]);
      await flushPromises();

      expect(onFound).not.toHaveBeenCalled();
    });
  });

  describe('ensurePermissions()', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      Platform.OS = originalOS;
    });

    it('returns true on iOS without prompting for permissions', async () => {
      Platform.OS = 'ios';
      await expect(adapter.ensurePermissions()).resolves.toBe(true);
      expect(mockRequestMultiple).not.toHaveBeenCalled();
    });

    describe('on Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      interface PermCase {
        name: string;
        version: string;
        granted: boolean;
        isLegacy: boolean;
      }
      const androidPermissionCases: PermCase[] = [
        {
          name: 'Android 12+ when both BLE permissions are granted',
          version: '13',
          granted: true,
          isLegacy: false,
        },
        {
          name: 'Android 12+ when a BLE permission is denied',
          version: '13',
          granted: false,
          isLegacy: false,
        },
        {
          name: 'Android <12 when location is granted',
          version: '11',
          granted: true,
          isLegacy: true,
        },
        {
          name: 'Android <12 when location is denied',
          version: '11',
          granted: false,
          isLegacy: true,
        },
      ];
      it.each(androidPermissionCases)(
        'returns $granted on $name',
        async ({ version, granted, isLegacy }: PermCase) => {
          mockGetSystemVersion.mockReturnValue(version);
          if (isLegacy) {
            mockRequest.mockResolvedValue(
              granted ? RESULTS.GRANTED : RESULTS.DENIED,
            );
          } else {
            mockRequestMultiple.mockResolvedValue({
              [PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]: RESULTS.GRANTED,
              [PERMISSIONS.ANDROID.BLUETOOTH_SCAN]: granted
                ? RESULTS.GRANTED
                : RESULTS.DENIED,
            });
          }
          if (!granted) {
            jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
          }

          await expect(adapter.ensurePermissions()).resolves.toBe(granted);

          if (!granted) {
            expect(Linking.openSettings).toHaveBeenCalled();
          }
        },
      );
    });
  });

  describe('isTransportAvailable() / onTransportStateChange()', () => {
    it('returns true once the initial PoweredOn state has been received', async () => {
      await expect(adapter.isTransportAvailable()).resolves.toBe(true);
    });

    it('notifies listeners of subsequent state changes and honours unsubscribe', async () => {
      const cb = jest.fn();
      const unsub = adapter.onTransportStateChange(cb);

      expect(cb).toHaveBeenLastCalledWith(true);

      mockBleObserver?.next?.({ type: 'PoweredOff', available: false });
      expect(cb).toHaveBeenLastCalledWith(false);

      unsub();
      const callsBefore = cb.mock.calls.length;
      mockBleObserver?.next?.({ type: 'PoweredOn', available: true });
      expect(cb.mock.calls.length).toBe(callsBefore);
    });

    it('treats a BLE state observer error as unavailable and notifies listeners', async () => {
      const cb = jest.fn();
      adapter.onTransportStateChange(cb);

      mockBleObserver?.error?.(new Error('ble boom'));

      expect(cb).toHaveBeenLastCalledWith(false);
    });
  });

  describe('ensureDeviceReady()', () => {
    beforeEach(async () => {
      mockConnectLedgerHardware.mockReset();
      await discoverDevice();
    });

    describe('device-locked detection (#isDeviceLocked)', () => {
      interface LockedCase {
        name: string;
        error: unknown;
        expectLocked: boolean;
      }
      const lockedCases: LockedCase[] = [
        {
          name: 'emits DeviceLocked for a DMK DeviceLockedError instance',
          error: new DeviceLockedError('device is locked'),
          expectLocked: true,
        },
        {
          name: 'emits DeviceLocked for a TransportStatusError @ 0x6b0c',
          error: (() => {
            const e = new Error('Condition of use not satisfied');
            (e as { name?: string }).name = 'TransportStatusError';
            (e as { statusCode?: number }).statusCode = 0x6b0c;
            return e;
          })(),
          expectLocked: true,
        },
        {
          name: 'emits DeviceLocked for a "Locked device" message',
          error: Object.assign(new Error('Locked device'), {
            name: 'SomeOtherError',
          }),
          expectLocked: true,
        },
        {
          name: 'does NOT emit DeviceLocked for an unrelated error',
          error: new Error('User cancelled the operation'),
          expectLocked: false,
        },
        {
          name: 'does NOT emit DeviceLocked for a non-signal object',
          error: Object.assign(new Error('Network unreachable'), {
            name: 'TypeError',
          }),
          expectLocked: false,
        },
      ];
      it.each(lockedCases)(
        '$name',
        async ({ error, expectLocked }: LockedCase) => {
          mockConnectLedgerHardware.mockRejectedValueOnce(error);

          await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(
            error,
          );

          if (expectLocked) {
            expectEmitted(DeviceEvent.DeviceLocked);
          } else {
            expectNotEmitted(DeviceEvent.DeviceLocked);
          }
        },
      );
    });

    describe('app detection', () => {
      it('returns true and emits AppOpened when the Ethereum app is running', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('Ethereum');

        await expect(adapter.ensureDeviceReady(DEVICE_ID)).resolves.toBe(true);
        expect(onDeviceEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event: DeviceEvent.AppOpened,
            currentAppName: 'Ethereum',
          }),
        );
      });

      it('opens the Ethereum app from the BOLOS screen and returns false', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockResolvedValueOnce(undefined);

        await expect(adapter.ensureDeviceReady(DEVICE_ID)).resolves.toBe(false);
        expectEmitted(DeviceEvent.AppNotOpen);
        expect(mockOpenEthereumAppOnLedger).toHaveBeenCalled();
      });

      it('closes a wrong app and returns false', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('Bitcoin');
        mockCloseRunningAppOnLedger.mockResolvedValueOnce(undefined);

        await expect(adapter.ensureDeviceReady(DEVICE_ID)).resolves.toBe(false);
        expect(mockCloseRunningAppOnLedger).toHaveBeenCalled();
        expectEmitted(DeviceEvent.AppNotOpen);
      });

      it('returns false when connect leaves no session', async () => {
        mockConnectLedgerHardware.mockResolvedValueOnce('Ethereum');

        await expect(adapter.ensureDeviceReady('not-cached')).resolves.toBe(
          false,
        );
      });
    });

    describe('transient-error retries (#isTransientBleError / #isSessionLost)', () => {
      interface TransientCase {
        name: string;
        error: unknown;
      }
      const transientCases: TransientCase[] = [
        {
          name: 'a message-based BLE error',
          error: new Error('ble disconnected'),
        },
        {
          name: 'a transient DMK _tag',
          error: Object.assign(new Error('opening'), {
            _tag: 'ConnectionOpeningError',
          }),
        },
        {
          name: 'an originalError.name match',
          error: Object.assign(new Error('pair'), {
            originalError: { name: 'PairingFailed' },
          }),
        },
        {
          name: 'a session-lost error (resets the session)',
          error: Object.assign(new Error('gone'), {
            _tag: 'DeviceSessionNotFound',
          }),
        },
      ];
      it.each(transientCases)(
        'retries on $name and then succeeds',
        async ({ error }: TransientCase) => {
          jest.useFakeTimers();
          try {
            mockConnectLedgerHardware
              .mockRejectedValueOnce(error)
              .mockResolvedValueOnce('Ethereum');

            const pending = adapter.ensureDeviceReady(DEVICE_ID);
            await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);

            await expect(pending).resolves.toBe(true);
          } finally {
            jest.useRealTimers();
          }
        },
      );

      it('rethrows a non-transient error immediately', async () => {
        const fatal = new Error('user cancelled');
        mockConnectLedgerHardware.mockRejectedValueOnce(fatal);

        await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(fatal);
      });

      it('rethrows after exhausting retries on persistent transient errors', async () => {
        jest.useFakeTimers();
        try {
          const persistent = new Error('still disconnected');
          mockConnectLedgerHardware.mockReset().mockRejectedValue(persistent);

          const pending = adapter.ensureDeviceReady(DEVICE_ID);
          pending.catch(() => undefined);
          await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);
          await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);

          await expect(pending).rejects.toBe(persistent);
        } finally {
          jest.useRealTimers();
        }
      });
    });

    it('times out and closes the session when opening the Ethereum app stalls', async () => {
      jest.useFakeTimers();
      try {
        mockConnectLedgerHardware.mockResolvedValueOnce('BOLOS');
        mockOpenEthereumAppOnLedger.mockReturnValue(
          new Promise(() => undefined),
        );

        const pending = adapter.ensureDeviceReady(DEVICE_ID);
        await jest.advanceTimersByTimeAsync(OPERATION_TIMEOUT_MS);

        await expect(pending).resolves.toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('destroy()', () => {
    it('marks the adapter destroyed so later connect / ensureDeviceReady reject', async () => {
      adapter.destroy();
      await expect(adapter.connect(DEVICE_ID)).rejects.toThrow(
        'Adapter has been destroyed',
      );
      await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });

    it('stops BLE monitoring and closes the session asynchronously', async () => {
      await connectFirst();

      adapter.destroy();
      await flushPromises();

      expect(mockBleStateSubscription.unsubscribe).toHaveBeenCalled();
      expect(mockDisconnectLedgerDmkSession).toHaveBeenCalled();
    });
  });

  describe('session-state monitoring (#handleDisconnect)', () => {
    it('clears the session when the state stream reports disconnected', async () => {
      await connectFirst();
      await flushPromises();
      expect(adapter.isConnected()).toBe(true);

      jest.useFakeTimers();
      try {
        sessionStateSubject.next({ connected: false });
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        expect(adapter.isConnected()).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    interface StreamEndCase {
      name: string;
      trigger: () => void;
    }
    const streamEndCases: StreamEndCase[] = [
      { name: 'completes', trigger: () => sessionStateSubject.complete() },
      {
        name: 'errors',
        trigger: () =>
          sessionStateSubject.error(new Error('state stream broke')),
      },
    ];
    it.each(streamEndCases)(
      'clears the session when the state stream $name',
      async ({ trigger }: StreamEndCase) => {
        await connectFirst();
        await flushPromises();

        trigger();
        await flushPromises();

        expect(adapter.isConnected()).toBe(false);
      },
    );

    it('continues when getLedgerDmkSessionState rejects during monitoring setup', async () => {
      mockGetLedgerDmkSessionState
        .mockReset()
        .mockRejectedValueOnce(new Error('no state'));

      await connectFirst();
      await flushPromises();

      expect(adapter.isConnected()).toBe(true);
    });
  });
});
