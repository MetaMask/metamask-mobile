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
