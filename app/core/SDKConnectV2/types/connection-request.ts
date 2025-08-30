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
