export const LEDGER_DISCOVERY_TIMEOUT_MS = 15000;

export type LedgerDiscoveryStep =
  | 'searching'
  | 'found'
  | 'not-found'
  | 'accounts'
  /** Bluetooth permission denied (iOS / Android < 12) */
  | 'bluetooth-access-denied'
  /** Location permission denied (Android < 12) */
  | 'location-access-denied'
  /** Nearby-devices permission denied (Android 12+) */
  | 'nearby-devices-denied'
  /** Bluetooth is switched off at the system level */
  | 'bluetooth-off'
  /** Bluetooth scan / connection attempt failed */
  | 'bluetooth-connection-failed'
  /** Device is connected but locked */
  | 'ledger-locked'
  /** Device is connected but not responding */
  | 'ledger-unresponsive'
  /** Device is connected but ETH app is not open */
  | 'eth-app-closed';
