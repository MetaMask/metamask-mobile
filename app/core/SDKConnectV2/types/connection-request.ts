import { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import { Metadata } from './metadata';
import { isUUID } from '../../SDKConnect/utils/isUUID';

const HANDSHAKE_CHANNEL_REGEX =
  /^handshake:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Represents an incoming connection request parsed from a QR code or deep link.
 * This is the shared data contract between the dApp SDK and the mobile wallet,
 * as defined in the technical proposal. It encapsulates all the information
 * needed to initiate a new session.
 */
export interface ConnectionRequest {
  /**
   * The low-level protocol session request, containing cryptographic
   * and channel information.
   */
  sessionRequest: SessionRequest;

  /**
   * Metadata about the dApp and SDK that is requesting the connection.
   */
  metadata: Metadata;
}

/**
 * Type guard to validate if the given data conforms to the ConnectionRequest interface.
 *
 * @param {unknown} data - The data to be validated.
 * @returns {boolean} True if the data conforms to the ConnectionRequest interface, false otherwise.
 */
export function isConnectionRequest(data: unknown): data is ConnectionRequest {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const obj = data as ConnectionRequest;
  if (!obj.sessionRequest || typeof obj.sessionRequest !== 'object') {
    return false;
  }

  const sessionReq = obj.sessionRequest;
  if (
    !sessionReq.id ||
    typeof sessionReq.id !== 'string' ||
    !isUUID(sessionReq.id)
  ) {
    return false;
  }

  if (
    !sessionReq.publicKeyB64 ||
    typeof sessionReq.publicKeyB64 !== 'string' ||
    sessionReq.publicKeyB64.length > 200
  ) {
    return false;
  }
  try {
    const decoded = Buffer.from(sessionReq.publicKeyB64, 'base64');
    if (decoded.length !== 33) return false; // compressed secp256k1
  } catch {
    return false;
  }

  if (
    !sessionReq.channel ||
    typeof sessionReq.channel !== 'string' ||
    !HANDSHAKE_CHANNEL_REGEX.test(sessionReq.channel)
  ) {
    return false;
  }

  if (
    !sessionReq.mode ||
    typeof sessionReq.mode !== 'string' ||
    !['trusted', 'untrusted'].includes(sessionReq.mode)
  ) {
    return false;
  }

  if (
    typeof sessionReq.expiresAt !== 'number' ||
    isNaN(sessionReq.expiresAt) ||
    sessionReq.expiresAt < Date.now()
  ) {
    return false;
  }

  if (!obj.metadata || typeof obj.metadata !== 'object') {
    return false;
  }

  const metadata = obj.metadata;
  if (
    !metadata.dapp ||
    typeof metadata.dapp !== 'object' ||
    !metadata.dapp.name ||
    typeof metadata.dapp.name !== 'string' ||
    metadata.dapp.name.length > 256 ||
    !metadata.dapp.url ||
    typeof metadata.dapp.url !== 'string' ||
    metadata.dapp.url.length > 2048
  ) {
    return false;
  }

  // SECURITY: The try/catch rejects plain strings (e.g. 'metamask') that
  // aren't parseable URLs. The protocol check additionally blocks custom
  // schemes like metamask:// that are valid URLs but could collide with
  // internal origin identifiers. Together these ensure dapp.url can never
  // match INTERNAL_ORIGINS values used in downstream privilege checks.
  // Do not relax this without also updating the defense-in-depth check
  // in ConnectionRegistry.handleConnectDeeplink().
  try {
    const parsed = new URL(metadata.dapp.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
  } catch {
    return false;
  }

  if (metadata.dapp.icon) {
    if (
      typeof metadata.dapp.icon !== 'string' ||
      metadata.dapp.icon.length > 2048 // this seems long still
    ) {
      return false;
    }
    try {
      new URL(metadata.dapp.icon);
    } catch {
      return false;
    }
  }

  if (
    !metadata.sdk ||
    typeof metadata.sdk !== 'object' ||
    !metadata.sdk.version ||
    typeof metadata.sdk.version !== 'string' ||
    metadata.sdk.version.length > 64 ||
    !metadata.sdk.platform ||
    typeof metadata.sdk.platform !== 'string' ||
    metadata.sdk.platform.length > 64
  ) {
    return false;
  }

  return true;
}
