/**
 * QR Scanner event property keys and values
 * Event names are defined in MetaMetrics.events.ts as the single source of truth
 */

/**
 * Event property keys - ensures consistent property naming
 */
export const QRScannerEventProperties = {
  SCAN_SUCCESS: 'scan_success',
  QR_TYPE: 'qr_type',
  SCAN_RESULT: 'scan_result',
} as const;

/**
 * QR Type values
 */
export const QRType = {
  SEED_PHRASE: 'seed phrase',
  PRIVATE_KEY: 'private key',
  SEND_FLOW: 'send flow',
  WALLET_CONNECT: 'wallet connect',
  DEEPLINK: 'deeplink',
  URL: 'url',
} as const;

/**
 * Type for QR Type values
 */
export type QRTypeValue =
  | typeof QRType.SEED_PHRASE
  | typeof QRType.PRIVATE_KEY
  | typeof QRType.SEND_FLOW
  | typeof QRType.WALLET_CONNECT
  | typeof QRType.DEEPLINK
  | typeof QRType.URL;

/**
 * Scan Result values - describes the outcome of a QR scan attempt
 */
export const ScanResult = {
  // Success outcomes
  COMPLETED: 'completed',
  DEEPLINK_HANDLED: 'deeplink_handled',
  URL_NAVIGATION_CONFIRMED: 'url_navigation_confirmed',

  // User error outcomes
  UNRECOGNIZED_QR_CODE: 'unrecognized_qr_code',
  INVALID_ADDRESS_FORMAT: 'invalid_address_format',
  URL_NAVIGATION_CANCELLED: 'url_navigation_cancelled',
  ADDRESS_TYPE_NOT_SUPPORTED: 'address_type_not_supported',

  // System state outcomes
  WALLET_LOCKED: 'wallet_locked',
} as const;

/**
 * Type for Scan Result values
 */
export type ScanResultValue =
  | typeof ScanResult.COMPLETED
  | typeof ScanResult.DEEPLINK_HANDLED
  | typeof ScanResult.URL_NAVIGATION_CONFIRMED
  | typeof ScanResult.UNRECOGNIZED_QR_CODE
  | typeof ScanResult.INVALID_ADDRESS_FORMAT
  | typeof ScanResult.URL_NAVIGATION_CANCELLED
  | typeof ScanResult.ADDRESS_TYPE_NOT_SUPPORTED
  | typeof ScanResult.WALLET_LOCKED;
