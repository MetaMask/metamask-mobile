import { IHostApplicationAdapter } from '../adapters/IHostApplicationAdapter';
import { IConnectionStore } from '../store/IConnectionStore';

/**
 * The ConnectionRegistry is the central service responsible for managing the
 * lifecycle of all SDKConnectV2 connections. It acts as the primary entry
 * point and orchestrator for creating, managing, and tearing down secure
 * dApp sessions.
 */
export class ConnectionRegistry {
  /**
   * The constructor for the ConnectionRegistry.
   *
   * @param hostApplicationAdapter - An adapter that provides a bridge to the
   * host MetaMask Mobile application's UI and state management systems.
   * @param connectionStore - An adapter for the persistence layer, used to
   * save and retrieve connection data.
   */
  constructor(
    private readonly hostApplicationAdapter: IHostApplicationAdapter,
    private readonly connectionStore: IConnectionStore,
  ) { }

  /**
   * The primary entry point for handling a new connection request from a
   * v2 deeplink (e.g., from a QR code).
   * @param url - The full deeplink URL that triggered the connection.
   */
  public handleConnectDeeplink(url: string): void {
    // This log is the key success metric for Milestone 1.
    console.log(
      '[SDKConnectV2] ConnectionRegistry: handleConnectDeeplink successfully called with URL:',
      url,
    );

    // In future, this method will be responsible for:
    // 1. Parsing the URL to extract the ConnectionRequest.
    // 2. Calling the hostApplicationAdapter to show the connection approval UI.
    // 3. Initiating the cryptographic handshake upon user approval.
    // 4. Saving the resulting connection to the connectionStore.
  }
}
