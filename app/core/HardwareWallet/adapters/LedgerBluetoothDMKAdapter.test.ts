import { Subject } from 'rxjs';
import {
  DeviceLockedError,
  type DiscoveredDevice as DmkDiscoveredDevice,
} from '@ledgerhq/device-management-kit';
import { DeviceEvent, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import type { HardwareWalletAdapterOptions } from '../types';

/**
 * Mocks are registered before the SUT import. Jest hoists `jest.mock` calls
 * above imports; factory functions may only reference `mock*`-prefixed
 * out-of-scope variables.
 *
 * NOTE: `@ledgerhq/device-management-kit` is intentionally NOT mocked — the
 * real `DeviceLockedError` class must be available so `instanceof` checks in
 * `#isDeviceLocked` (and in the tests below) work end-to-end. The adapter now
 * routes its DMK session lifecycle through LedgerDmk.ts helpers (which wrap the
 * keyring's bridge), so those helpers are mocked here.
 */

const mockBleStateSubscription = { unsubscribe: jest.fn() };

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    observeState: jest.fn((observer: { next?: (e: unknown) => void }) => {
      // Immediately report Bluetooth powered-on so isTransportAvailable/onTransportStateChange resolve.
      if (observer.next) {
        observer.next({ type: 'PoweredOn', available: true });
      }
      return mockBleStateSubscription;
    }),
  },
}));

jest.mock('react-native-ble-plx', () => ({
  State: { PoweredOn: 'PoweredOn' },
}));

// Discovery uses getDmk() directly (listenToAvailableDevices), so mock the
// dmk module. Connect/monitor/disconnect still route through the LedgerDmk.ts
// bridge helpers (mocked below).
const mockDmk = {
  listenToAvailableDevices: jest.fn(),
};
jest.mock('../../Ledger/dmk', () => ({
  getDmk: () => mockDmk,
}));

const mockConnectLedgerHardware = jest.fn();
const mockConnectLedgerDmkDevice = jest.fn();
const mockGetLedgerDmkSessionState = jest.fn();
const mockDisconnectLedgerDmkSession = jest.fn();
jest.mock('../../Ledger/Ledger', () => ({
  openEthereumAppOnLedger: jest.fn(),
  closeRunningAppOnLedger: jest.fn(),
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
  requestMultiple: jest.fn(),
  request: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getSystemVersion: () => '13',
}));

// SUT import — must come after all jest.mock registrations.
import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';

const DEVICE_ID = 'device-123';

describe('LedgerBluetoothDMKAdapter', () => {
  let adapter: LedgerBluetoothDMKAdapter;
  let onDeviceEvent: jest.Mock;
  let onDisconnect: jest.Mock;
  let scanSubject: Subject<DmkDiscoveredDevice[]>;

  beforeEach(() => {
    jest.clearAllMocks();

    onDeviceEvent = jest.fn();
    onDisconnect = jest.fn();
    const options: HardwareWalletAdapterOptions = {
      onDeviceEvent,
      onDisconnect,
    };

    // RxJS Subject gives the test synchronous control over the discovery
    // observable (getDmk().listenToAvailableDevices emits device arrays).
    scanSubject = new Subject<DmkDiscoveredDevice[]>();

    mockDmk.listenToAvailableDevices.mockReturnValue(
      scanSubject.asObservable(),
    );
    mockConnectLedgerDmkDevice.mockResolvedValue('session-1');
    mockDisconnectLedgerDmkSession.mockResolvedValue(undefined);
    // Session-state observable that never completes: the bridge's
    // onSessionStateChange stream stays open for the life of the session.
    // Using `of(...)` would complete synchronously and trigger
    // #startSessionMonitoring's `complete` handler (#handleDisconnect → clears
    // #sessionId) before the app check runs. A silent Subject keeps
    // #sessionId set so ensureDeviceReady proceeds to connectLedgerHardware.
    mockGetLedgerDmkSessionState.mockReturnValue(
      new Subject<{ connected: boolean }>().asObservable(),
    );

    adapter = new LedgerBluetoothDMKAdapter(options);
  });

  afterEach(() => {
    adapter.destroy();
  });

  /**
   * Drive the public discovery flow so that `connect()` finds the device in
   * the discovered-devices cache (listenToAvailableDevices emits arrays).
   */
  async function discoverDevice(
    id: string = DEVICE_ID,
    name = 'Nano X',
  ): Promise<void> {
    adapter.startDeviceDiscovery(jest.fn(), jest.fn());
    await new Promise((resolve) => setTimeout(resolve, 0));
    scanSubject.next([{ id, name } as DmkDiscoveredDevice]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    adapter.stopDeviceDiscovery();
  }

  it('exposes the Ledger wallet type', () => {
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  describe('ensureDeviceReady — device-locked detection (#isDeviceLocked)', () => {
    beforeEach(async () => {
      await discoverDevice();
    });

    it('detects a DMK DeviceLockedError instance via the DMK error class', async () => {
      // Primary path exercised by the "use dmk error util" refactor.
      const locked = new DeviceLockedError('device is locked');
      mockConnectLedgerHardware.mockRejectedValueOnce(locked);

      await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(locked);

      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: DeviceEvent.DeviceLocked }),
      );
    });

    it('detects a legacy TransportStatusError carrying the 0x6b0c status code', async () => {
      const legacy = new Error('Condition of use not satisfied');
      (legacy as { name?: string }).name = 'TransportStatusError';
      (legacy as { statusCode?: number }).statusCode = 0x6b0c;
      mockConnectLedgerHardware.mockRejectedValueOnce(legacy);

      await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(legacy);

      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: DeviceEvent.DeviceLocked }),
      );
    });

    it('falls back to message-based detection for an error saying "Locked device"', async () => {
      const messageError = Object.assign(new Error('Locked device'), {
        name: 'SomeOtherError',
      });
      mockConnectLedgerHardware.mockRejectedValueOnce(messageError);

      await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(
        messageError,
      );

      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: DeviceEvent.DeviceLocked }),
      );
    });

    it('does not emit DeviceLocked for an unrelated (non-transient) error', async () => {
      const unrelated = new Error('User cancelled the operation');
      mockConnectLedgerHardware.mockRejectedValueOnce(unrelated);

      await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(
        unrelated,
      );

      expect(onDeviceEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: DeviceEvent.DeviceLocked }),
      );
    });

    it('treats a plain object without locked signal as not locked', async () => {
      // Guards against false positives: an error that is neither a
      // DeviceLockedError, nor a TransportStatusError@0x6b0c, nor carrying
      // the "Locked device" message must NOT trigger DeviceLocked.
      const generic = Object.assign(new Error('Network unreachable'), {
        name: 'TypeError',
      });
      mockConnectLedgerHardware.mockRejectedValueOnce(generic);

      await expect(adapter.ensureDeviceReady(DEVICE_ID)).rejects.toBe(generic);

      expect(onDeviceEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: DeviceEvent.DeviceLocked }),
      );
    });
  });
});
