import SDKConnectV2 from '../../../core/SDKConnectV2';
import { parseQrSyncConnectionRequest } from '../../../core/QrSync/services/qr-sync-validation';
import {
  extractAddDeviceQrSessionExpiresAt,
  tryDecodeAddDeviceQrPayloadFromMwpDeeplink,
} from '../../../core/ExtensionAccountSync/parseAddDeviceQrMwpDeeplink';

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
 * Classifies Add Device camera scans.
 *
 * Accepted format: `metamask://connect/mwp?p=<base64(session-request-json)>`
 */
export function classifyAddDeviceScanContent(
  content: string,
): AddDeviceScanClassification {
  if (!SDKConnectV2.isMwpDeeplink(content)) {
    return 'invalid';
  }

  try {
    parseQrSyncConnectionRequest(content);
    return 'valid';
  } catch {
    const payload = tryDecodeAddDeviceQrPayloadFromMwpDeeplink(content);
    if (payload) {
      const expiresAt = extractAddDeviceQrSessionExpiresAt(payload);
      if (typeof expiresAt === 'number' && expiresAt <= Date.now()) {
        return 'expired';
      }
    }

    return 'invalid';
  }
}
