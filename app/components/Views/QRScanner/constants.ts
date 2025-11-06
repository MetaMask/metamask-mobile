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
