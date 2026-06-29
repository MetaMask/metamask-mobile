import SDKConnectV2 from '../../../core/SDKConnectV2';
import { tryParseExtensionAccountSyncConnectionRequest } from '../../../core/ExtensionAccountSync/extensionAccountSyncConnectionRequest';
import { parseQrSyncConnectionRequest } from '../../../core/QrSync/services/qr-sync-connection-request';
import { parseMwpConnectPayload } from '../../../core/SDKConnectV2/utils/parseMwpConnectDeeplink';

export enum AddDeviceScannerUiState {
  Searching = 'searching',
  Detected = 'detected',
  InvalidQr = 'invalid_qr',
  ExpiredQr = 'expired_qr',
  ConnectionFailed = 'connection_failed',
}

export const ADD_DEVICE_QR_DETECTED_DELAY_MS = 400;

export type AddDeviceScanClassification = 'valid' | 'invalid' | 'expired';

export function classifyAddDeviceScanContent(
  content: string,
): AddDeviceScanClassification {
  if (!SDKConnectV2.isMwpDeeplink(content)) {
    return 'invalid';
  }

  if (tryParseExtensionAccountSyncConnectionRequest(content)) {
    return 'valid';
  }

  try {
    parseQrSyncConnectionRequest(content);
    return 'valid';
  } catch {
    // Fall through to expiry / invalid handling below.
  }

  try {
    const payload = parseMwpConnectPayload(content) as {
      sessionRequest?: { expiresAt?: number };
    };
    const expiresAt = payload?.sessionRequest?.expiresAt;
    if (typeof expiresAt === 'number' && expiresAt <= Date.now()) {
      return 'expired';
    }
  } catch {
    // Fall through to invalid.
  }

  return 'invalid';
}
