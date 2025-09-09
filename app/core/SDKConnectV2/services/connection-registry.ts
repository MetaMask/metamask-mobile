import { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import {
  ConnectionRequest,
  isConnectionRequest,
} from '../types/connection-request';
import { IConnectionStore } from '../types/connection-store';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { Connection } from './connection';

/**
 * The ConnectionRegistry is the central service responsible for managing the
 * lifecycle of all SDKConnectV2 connections.
 */
export class ConnectionRegistry {
  private readonly RELAY_URL: string;
  private readonly keymanager: IKeyManager;
  private readonly hostapp: IHostApplicationAdapter;
  private readonly store: IConnectionStore;

  private connections = new Map<string, Connection>();

  constructor(
    relayURL: string,
    keymanager: IKeyManager,
    hostapp: IHostApplicationAdapter,
    store: IConnectionStore,
  ) {
    this.RELAY_URL = relayURL;
    this.keymanager = keymanager;
    this.hostapp = hostapp;
    this.store = store;
  }

  /**
   * The primary entry point for handling a new connection from a deeplink.
   * @param url The full deeplink URL that triggered the connection.
   *
   * Happy path:
   * 1. Show loading indicator
   * 2. Parse the connection request
   * 3. Create a new connection and connect
   * 4. Save the connection to the store
   * 5. Sync the connection list to the host application
   * 6. Hide loading indicator
   */
  public async handleConnectDeeplink(url: string): Promise<void> {
    let conn: Connection | undefined;

    try {
      const connreq = this.parseConnectionRequest(url);
      this.hostapp.showLoading();
      conn = await Connection.create(connreq, this.keymanager, this.RELAY_URL);
      await conn.connect(connreq.sessionRequest);
      this.connections.set(conn.id, conn);
      await this.store.save({ id: conn.id, metadata: connreq.metadata });
      this.hostapp.syncConnectionList(Array.from(this.connections.values()));
      console.warn(
        `[SDKConnectV2] Connection with ${connreq.metadata.dapp.name} successfully established.`,
      );
    } catch (error) {
      console.error('[SDKConnectV2] Connection handshake failed:', error);
      if (conn) await this.disconnect(conn.id);
      this.hostapp.showAlert(
        'Connection Error',
        'The connection request failed. Please try again.',
      );
    } finally {
      this.hostapp.hideLoading();
    }
  }

  /**
   * Disconnects a session, cleans up all associated data
   * and revokes permissions.
   * @param id The ID of the connection to terminate.
   */
  public async disconnect(id: string): Promise<void> {
    await this.connections.get(id)?.disconnect();
    await this.hostapp.revokePermissions(id);
    await this.store.delete(id);
    this.connections.delete(id);
    this.hostapp.syncConnectionList(Array.from(this.connections.values()));
  }

  /**
   * Parse the connection request from the deeplink URL.
   * @param url The full deeplink URL that triggered the connection.
   * @returns The parsed connection request.
   *
   * Format: metamask://connect/mwp?p=<encoded_connection_request>
   */
  private parseConnectionRequest(url: string): ConnectionRequest {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch (error) {
      throw new Error('[SDKConnectV2] Invalid URL format.');
    }

    const payload = parsed.searchParams.get('p');
    if (!payload) {
      throw new Error('[SDKConnectV2] No payload found in URL.');
    }

    if (payload.length > 1024 * 1024) {
      throw new Error('[SDKConnectV2] Payload too large (max 1MB).');
    }

    let connreq: unknown;
    try {
      connreq = JSON.parse(payload);
    } catch (error) {
      throw new Error('[SDKConnectV2] Invalid JSON in payload.');
    }

    if (!isConnectionRequest(connreq)) {
      throw new Error('[SDKConnectV2] Invalid connection request structure.');
    }

    return connreq;
  }
}
