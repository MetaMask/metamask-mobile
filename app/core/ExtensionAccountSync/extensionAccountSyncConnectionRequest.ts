import {
  isConnectionRequest,
  type ConnectionRequest,
} from '../SDKConnectV2/types/connection-request';
import { parseMwpConnectPayload } from '../SDKConnectV2/utils/parseMwpConnectDeeplink';

/**
 * Connection type name emitted by the MetaMask extension QR sync sender.
 * Must stay aligned with the extension payload contract (ADR-0055 / build spec).
 */
export const EXTENSION_ACCOUNT_SYNC_CONNECTION_TYPE_NAME =
  'extension-account-sync' as const;

export interface ExtensionAccountSyncConnectionType {
  name: typeof EXTENSION_ACCOUNT_SYNC_CONNECTION_TYPE_NAME;
}

export interface ExtensionAccountSyncConnectionRequest
  extends ConnectionRequest {
  connectionType: ExtensionAccountSyncConnectionType;
}

export const isExtensionAccountSyncConnectionRequest = (
  data: unknown,
): data is ExtensionAccountSyncConnectionRequest => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const obj = data as ExtensionAccountSyncConnectionRequest;
  const connectionType = obj.connectionType;

  if (
    !connectionType ||
    typeof connectionType !== 'object' ||
    Array.isArray(connectionType)
  ) {
    return false;
  }

  if (connectionType.name !== EXTENSION_ACCOUNT_SYNC_CONNECTION_TYPE_NAME) {
    return false;
  }

  const { connectionType: _connectionType, ...base } = obj;
  return isConnectionRequest(base);
};

export const tryParseExtensionAccountSyncConnectionRequest = (
  url: unknown,
): ExtensionAccountSyncConnectionRequest | null => {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    const raw = parseMwpConnectPayload(url);
    return isExtensionAccountSyncConnectionRequest(raw) ? raw : null;
  } catch {
    return null;
  }
};
