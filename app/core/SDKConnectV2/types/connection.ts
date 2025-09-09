import { Session } from '@metamask/mobile-wallet-protocol-core';
import { WalletClient } from '@metamask/mobile-wallet-protocol-wallet-client';
import { BackgroundBridge } from '../../BackgroundBridge/BackgroundBridge';
import { Metadata } from './metadata';

/**
 * Represents a fully established, user-approved, and persisted connection.
 * This is the primary domain object managed by the SDKConnectV2 system,
 * combining the protocol-level session with application-level metadata and
 * runtime clients.
 */
export interface Connection {
  /**
   * The unique identifier for this connection, used as the 'origin' for
   * the permissions system. This ID is derived from the underlying
   * protocol session's ID.
   */
  id: string;

  /**
   * The low-level, protocol-specific session object. It contains the
   * cryptographic keys and channel information required for secure
   * communication. This is the primary object to be persisted securely.
   */
  session: Session;

  /**
   * Metadata about the connected dApp. This data is persisted alongside
   * the session.
   */
  dappMetadata: Metadata['dapp'];

  /**
   * The live, in-memory client instance for this connection, provided by the
   * vendored wallet-client library. This property is for runtime use only
   * and is NOT persisted to storage.
   */
  client: WalletClient;

  /**
   * The dedicated RPC message handler for this specific connection. Each
   * connection gets its own bridge to process dApp requests and route them
   * to the core multichain engine. This property is for runtime use only
   * and is NOT persisted.
   */
  bridge: BackgroundBridge;
}
