import { type Observable } from 'rxjs';
import { type DiscoveredDevice } from '@ledgerhq/device-management-kit';
import { withLedgerKeyring } from './Ledger';

/**
 * The subset of bridge methods used by {@link connectLedgerDmkHardware}.
 * `LedgerDmkBridge` satisfies this shape via optional `updateSessionId`.
 */
interface LedgerDmkSessionBridge {
  updateSessionId?: (sessionId: string) => Promise<boolean>;
  getAppNameAndVersion: () => Promise<{ appName: string; version: string }>;
}

/**
 * The subset of DMK-bridge methods used by the adapter's session lifecycle.
 *
 * `LedgerDmkBridge` owns the single `DeviceManagementKit` instance that
 * signing uses, so the adapter routes discovery/connect/monitoring/disconnect
 * through these methods. Sessions created via `connect` live on the bridge's
 * own DMK and are therefore valid for bridge commands (app checks, signing).
 */
interface LedgerDmkBridgeConnection {
  startDiscovering: (args: unknown) => Observable<DiscoveredDevice>;
  connect: (args: { device: DiscoveredDevice }) => Promise<string>;
  readonly onSessionStateChange: Observable<{ connected: boolean }>;
  destroy: () => Promise<void>;
}

const throwIfLedgerOperationAborted = (abortSignal?: AbortSignal) => {
  if (!abortSignal?.aborted) {
    return;
  }

  const error = new Error('Ledger operation aborted');
  error.name = 'LedgerOperationAbortedError';
  throw error;
};

/**
 * Resolve the keyring's DMK bridge. The keyring mutex is held only long enough
 * to fetch the bridge reference; all BLE I/O (connect, destroy, subscribing)
 * happens at the call site, outside the mutex — mirroring
 * {@link connectLedgerDmkHardware}.
 */
const getLedgerDmkBridge = (): Promise<LedgerDmkBridgeConnection> =>
  withLedgerKeyring(
    async ({ keyring }) =>
      keyring.bridge as unknown as LedgerDmkBridgeConnection,
  );

/**
 * Connect a Ledger device via a DMK session and return the running app name.
 *
 * Called by `LedgerBluetoothDMKAdapter` after it has discovered and connected
 * to the device through the shared DMK singleton. The session ID is forwarded
 * to the keyring's bridge via `updateSessionId`.
 *
 * @param sessionId - The DMK session ID from the adapter's connection.
 * @param deviceId - The device ID to connect to.
 * @param abortSignal - Optional abort signal to cancel the operation.
 * @returns The name of the currently open application on the device.
 */
export const connectLedgerDmkHardware = async (
  sessionId: string,
  deviceId: string,
  abortSignal?: AbortSignal,
): Promise<string> => {
  throwIfLedgerOperationAborted(abortSignal);

  const bridge = await withLedgerKeyring(async ({ keyring }) => {
    keyring.setDeviceId(deviceId);
    const ledgerBridge = keyring.bridge as unknown as LedgerDmkSessionBridge;
    await ledgerBridge.updateSessionId?.(sessionId);
    return ledgerBridge;
  });

  // Keep the BLE exchange outside the KeyringController mutex. Hardware-wallet
  // flows are serialized at the adapter/provider layer.
  throwIfLedgerOperationAborted(abortSignal);
  const result = await bridge.getAppNameAndVersion();
  return result.appName;
};

/**
 * Connect to a discovered Ledger device via the keyring's bridge. The session
 * is created on the bridge's own DMK instance and stored internally by the
 * bridge, so it is valid for subsequent bridge commands (app checks, signing).
 *
 * @param device - A discovered device (from `getDmk().listenToAvailableDevices`).
 * @returns The DMK session ID.
 */
export const connectLedgerDmkDevice = async (
  device: DiscoveredDevice,
): Promise<string> => {
  const bridge = await getLedgerDmkBridge();
  return bridge.connect({ device });
};

/**
 * Observe the connected/disconnected state of the bridge's DMK session.
 *
 * @returns An observable emitting `{ connected }`. Coarse signal: it does not
 * distinguish a LOCKED device — locked devices are surfaced via the error
 * path (`DeviceLockedError`) instead.
 */
export const getLedgerDmkSessionState = async (): Promise<
  Observable<{ connected: boolean }>
> => {
  const bridge = await getLedgerDmkBridge();
  return bridge.onSessionStateChange;
};

/**
 * Disconnect the bridge's DMK session by tearing down the bridge's transport
 * middleware. The bridge is reconnectable on the next `connect`.
 */
export const disconnectLedgerDmkSession = async (): Promise<void> => {
  const bridge = await getLedgerDmkBridge();
  await bridge.destroy();
};
