// HACK: Using relative path to local vendored package.
// The module resolver will use the package.json inside 'vendor/core/' to find the correct types in 'dist/'.
// TODO: Replace with '@metamask/mobile-wallet-protocol-core' once published.
import { SessionRequest } from '../vendor/core';
import { DappMetadata } from './dapp-metadata';

/**
 * Represents an incoming connection request parsed from a QR code or deep link.
 * This is the shared data contract between the dApp SDK and the mobile wallet,
 * as defined in the technical proposal. It encapsulates all the information
 * needed to initiate a new session.
 */
export type ConnectionRequest = {
  /**
   * The low-level protocol session request, containing cryptographic
   * and channel information.
   */
  sessionRequest: SessionRequest;

  /**
   * Metadata about the decentralized application (dApp) that is
   * requesting the connection.
   */
  dappMetadata: DappMetadata;
};