import { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import { Metadata } from './metadata';

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = data as any;

  // Validate sessionRequest
  if (!obj.sessionRequest || typeof obj.sessionRequest !== 'object') {
    return false;
  }

  const sessionReq = obj.sessionRequest;
  if (
    !sessionReq.id ||
    typeof sessionReq.id !== 'string' ||
    !sessionReq.dappPublicKey ||
    typeof sessionReq.dappPublicKey !== 'string' ||
    !sessionReq.walletPublicKey ||
    typeof sessionReq.walletPublicKey !== 'string' ||
    !sessionReq.channel ||
    typeof sessionReq.channel !== 'string'
  ) {
    return false;
  }

  // Validate metadata
  if (!obj.metadata || typeof obj.metadata !== 'object') {
    return false;
  }

  const metadata = obj.metadata;

  // Validate dapp metadata
  if (
    !metadata.dapp ||
    typeof metadata.dapp !== 'object' ||
    !metadata.dapp.name ||
    typeof metadata.dapp.name !== 'string' ||
    !metadata.dapp.url ||
    typeof metadata.dapp.url !== 'string'
  ) {
    return false;
  }

  // Validate SDK metadata
  if (
    !metadata.sdk ||
    typeof metadata.sdk !== 'object' ||
    !metadata.sdk.version ||
    typeof metadata.sdk.version !== 'string' ||
    !metadata.sdk.platform ||
    typeof metadata.sdk.platform !== 'string'
  ) {
    return false;
  }

  // Validate URL format
  try {
    new URL(metadata.dapp.url);
  } catch {
    return false;
  }

  return true;
}
