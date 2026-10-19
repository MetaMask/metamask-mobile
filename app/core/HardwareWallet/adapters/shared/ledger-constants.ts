/**
 * Ledger app name required for Ethereum operations.
 *
 * Shared by the Ledger BLE adapters (legacy transport + DMK) so the
 * required-app checks and event payloads stay in sync.
 */
export const REQUIRED_APP_NAME = 'Ethereum';

/**
 * Derivation path of the first Ethereum account, used to verify the device
 * is unlocked by requesting its public key/address.
 */
export const VERIFICATION_DERIVATION_PATH = "44'/60'/0'/0/0";

/**
 * Timeout for a single Ledger operation (app switch, unlock verification)
 * guarded by withLedgerTimeout.
 */
export const LEDGER_OPERATION_TIMEOUT_MS = 10000;

/**
 * Default device-discovery scan timeout.
 */
export const DEFAULT_SCAN_TIMEOUT_MS = 30000;

/**
 * Attempts for ensureDeviceReady's transient-BLE-error retry loop.
 */
export const MAX_DISCONNECT_RETRIES = 3;

/**
 * Delay between retries in the transient-BLE-error retry loop.
 */
export const RETRY_DELAY_MS = 2000;
