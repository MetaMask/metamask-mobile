import { classifyQrSyncScanContent } from '../../../core/QrSync/services/qr-sync-validation';

export enum AddDeviceScannerUiState {
  Searching = 'searching',
  Detected = 'detected',
  InvalidQr = 'invalid_qr',
  ExpiredQr = 'expired_qr',
  ConnectionFailed = 'connection_failed',
}

export const ADD_DEVICE_QR_DETECTED_DELAY_MS = 400;

export type AddDeviceScanClassification = 'valid' | 'invalid' | 'expired';

/**
 * Classifies Add Device camera scans using the same rules as QrSyncController
 * manual entry (MWP deeplink, compressed payload, base64 JSON, or raw JSON).
 */
export function classifyAddDeviceScanContent(
  content: string,
): AddDeviceScanClassification {
  return classifyQrSyncScanContent(content);
}
