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
 * Whether an error message describes a transient BLE failure.
 *
 * Used as a fallback when the error name is generic (e.g. after a device
 * power-cycle), matching on lowercased substrings.
 *
 * @param message - The raw (any-case) error message.
 */
export function hasTransientBleMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('disconnected') ||
    lower.includes('connection lost') ||
    lower.includes('gatt') ||
    lower.includes('ble error') ||
    lower.includes('bluetooth connection') ||
    lower.includes('bluetooth transfer')
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
