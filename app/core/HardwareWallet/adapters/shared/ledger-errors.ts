import { DISCONNECT_ERROR_NAMES } from '../../../Ledger/ledgerErrors';

/**
 * APDU status word returned by the device when it is locked.
 */
export const DEVICE_LOCKED_STATUS_CODE = 0x6b0c;

/**
 * BLE/native error names that represent transient failures which may succeed
 * on retry (disconnects during app switch, pairing failures, etc.).
 */
export const TRANSIENT_BLE_ERROR_NAMES: readonly string[] = [
  ...DISCONNECT_ERROR_NAMES,
  'PairingFailed',
  'PeerRemovedPairing',
  'BleError',
];

/**
 * Lowercased substrings that mark an error message as a transient BLE failure.
 */
const TRANSIENT_BLE_MESSAGE_SUBSTRINGS: readonly string[] = [
  'disconnected',
  'connection lost',
  'gatt',
  'ble error',
  'bluetooth connection',
  'bluetooth transfer',
];

/**
 * Whether an error message describes a transient BLE failure.
 *
 * Used as a fallback when the error name is generic (e.g. after a device
 * power-cycle), matching on lowercased substrings.
 *
 * @param message - The raw (any-case) error message.
 */
export function hasTransientBleMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSIENT_BLE_MESSAGE_SUBSTRINGS.some((substring) =>
    lower.includes(substring),
  );
}

/**
 * Whether an error is the timeout error thrown by `withLedgerTimeout`
 * (name is set to `LedgerTimeoutError`).
 */
export function isLedgerTimeoutError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: string }).name === 'LedgerTimeoutError'
  );
}

/**
 * Whether an error indicates the device stalled without completing an
 * operation — DMK's own unresponsiveness errors (e.g. "Device action ended
 * without completion") or any unresponsive-flavored message. These are not
 * `LedgerTimeoutError`s (different error name), but during the app check
 * they should behave the same: return to the awaiting-app modal instead of
 * a fatal, unrecoverable error screen.
 */
export function isDeviceUnresponsiveError(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('message' in error)) {
    return false;
  }
  const message = String(
    (error as { message?: unknown }).message,
  ).toLowerCase();
  return (
    message.includes('device action ended without completion') ||
    message.includes('unresponsive')
  );
}

/**
 * Normalize an unknown value to an `Error` for event/callback payloads.
 *
 * @param value - The value thrown or passed in.
 * @returns An `Error` (wrapping non-Error values via `String`).
 */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * DMK `_tag` values indicating the session is gone (device dropped or the
 * session was evicted). Session-lost errors force a fresh `connect()` on
 * the next attempt rather than reusing the wedged session.
 */
export const SESSION_LOST_DMK_TAGS: readonly string[] = [
  'DeviceSessionNotFound',
  'DeviceDisconnectedWhileSendingError',
  'DeviceDisconnectedBeforeSendingApdu',
];

/**
 * DMK `_tag` values for transient failures worth retrying: every
 * session-lost tag plus connection-opening races.
 */
export const TRANSIENT_DMK_TAGS: readonly string[] = [
  ...SESSION_LOST_DMK_TAGS,
  'ConnectionOpeningError',
];

/**
 * Whether an error indicates the Ledger device is locked.
 *
 * Matches @ledgerhq/errors TransportStatusError with the locked status word
 * (0x6b0c) and plain errors whose message mentions "Locked device". DMK
 * callers should additionally check `error instanceof DeviceLockedError`
 * (kept in the adapter so this module stays free of a DMK import).
 */
export function isDeviceLockedError(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false;
  }

  const err = error as {
    name?: string;
    statusCode?: number;
    message?: string;
  };

  if (err.name === 'TransportStatusError') {
    return err.statusCode === DEVICE_LOCKED_STATUS_CODE;
  }

  return (
    typeof err.message === 'string' && err.message.includes('Locked device')
  );
}
