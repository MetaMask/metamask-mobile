import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { IConnectionStore } from '../types/connection-store';

/**
 * The ConnectionRegistry is the central service responsible for managing the
 * lifecycle of all SDKConnectV2 connections. It acts as the primary entry
 * point and orchestrator for creating, managing, and tearing down secure
 * dApp sessions.
 */
export class ConnectionRegistry {
  private readonly hostapp: IHostApplicationAdapter;
  private readonly store: IConnectionStore;

  /**
   * The constructor for the ConnectionRegistry.
   *
   * @param hostapp - An adapter that provides a bridge to the
   * host MetaMask Mobile application's UI and state management systems.
   * @param store - An adapter for the persistence layer, used to
   * save and retrieve connection data.
   */
  constructor(hostapp: IHostApplicationAdapter, store: IConnectionStore) {
    this.hostapp = hostapp;
    this.store = store;
  }

  /**
   * The primary entry point for handling a new connection request from a
   * v2 deeplink (e.g., from a QR code).
   * @param url - The full deeplink URL that triggered the connection.
   */
  public handleConnectDeeplink(url: string): void {
    console.warn(
      '[SDKConnectV2] ConnectionRegistry: handleConnectDeeplink successfully called with URL:',
      url,
    );

    // In future, this method will be responsible for:
    // 1. Parsing the URL to extract the ConnectionRequest.
    // 2. Calling the hostapp to show the connection approval UI.
    // 3. Initiating the cryptographic handshake upon user approval.
    // 4. Saving the resulting connection to the store.
  }
}
