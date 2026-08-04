import { type Observable } from 'rxjs';
import { type DiscoveredDevice } from '@ledgerhq/device-management-kit';
import { LedgerDmkBridge } from '@metamask/eth-ledger-bridge-keyring';
import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createHardwareWalletError } from '../HardwareWallet/errors';
import { withLedgerKeyring } from './Ledger';

/**
 * Type guard for the DMK keyring bridge. These helpers are DMK-only, so a
 * legacy mobile bridge (or any other bridge) is rejected.
 */
export const isLedgerDmkBridge = (bridge: unknown): bridge is LedgerDmkBridge =>
  bridge instanceof LedgerDmkBridge;

const assertLedgerDmkBridge = (bridge: unknown): LedgerDmkBridge => {
  if (!isLedgerDmkBridge(bridge)) {
    throw createHardwareWalletError(
      ErrorCode.Unknown,
      HardwareWalletType.Ledger,
      'Expected LedgerDmkBridge',
    );
  }
  return bridge;
};

const throwIfLedgerOperationAborted = (abortSignal?: AbortSignal) => {
  if (!abortSignal?.aborted) {
    return;
  }

  throw createHardwareWalletError(
    ErrorCode.UserCancelled,
    HardwareWalletType.Ledger,
    'Ledger operation aborted',
  );
};

/**
 * Resolve the keyring's DMK bridge. The keyring mutex is held only long enough
 * to fetch the bridge reference; all BLE I/O (connect, destroy, subscribing)
 * happens at the call site, outside the mutex — mirroring
 * {@link connectLedgerDmkHardware}.
 */
const getLedgerDmkBridge = (): Promise<LedgerDmkBridge> =>
  withLedgerKeyring(async ({ keyring }) =>
    assertLedgerDmkBridge(keyring.bridge),
  );

/**
 * Connect a Ledger device via a DMK session and return the running app name.
 *
 * Called by `LedgerBluetoothDmkAdapter` after it has discovered and connected
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
    const dmkBridge = assertLedgerDmkBridge(keyring.bridge);
    const sessionBound = await dmkBridge.updateSessionId(sessionId);
    if (!sessionBound) {
      throw createHardwareWalletError(
        ErrorCode.DeviceInvalidSession,
        HardwareWalletType.Ledger,
        'Failed to bind DMK session to Ledger bridge',
      );
    }
    return dmkBridge;
  });

  // Keep the BLE exchange outside the KeyringController mutex.
  // Hardware wallet flows are serialized at the adapter/provider layer.
  throwIfLedgerOperationAborted(abortSignal);
  const result = await bridge.getAppNameAndVersion();
  return result.appName;
};

/**
 * Connect to a discovered Ledger device via the keyring's bridge. The session
 * is created on the bridge's own DMK instance and stored internally by the
 * bridge, so it is valid for subsequent bridge commands (app checks, signing).
 *
 * @param device - A discovered device from the bridge's DMK discovery stream.
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
