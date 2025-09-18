import { AppState, AppStateStatus } from 'react-native';
import { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import { throttle } from 'lodash';
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

  private readonly ready: Promise<void>;
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
    this.ready = this.initialize();
    this.setupAppStateListener();

    // Throttled function to prevent failure due to rapid,
    // duplicate calls from the host app.
    this.handleConnectDeeplink = throttle(
      this._handleConnectDeeplink.bind(this),
      1000,
      { leading: true, trailing: false },
    );
  }

  /**
   * One-time initialization to resume all persisted connections on app cold start.
   */
  private async initialize(): Promise<void> {
    console.warn(
      '[SDKConnectV2] Initializing and resuming persisted connections...',
    );

    const persisted = await this.store.list().catch(() => []);

    const promises = persisted.map(async (c) => {
      try {
        const conn = await Connection.create(
          c,
          this.keymanager,
          this.RELAY_URL,
        );
        await conn.resume();
        this.connections.set(conn.id, conn);
      } catch (error) {
        console.error(
          `[SDKConnectV2] Failed to resume connection ${c.id}.`,
          error,
        );
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * The primary entry point for handling a new connection from a deeplink.
   * @param url The full deeplink URL that triggered the connection.
   *
   * Happy path:
   * 1. Parse the connection request
   * 2. Show loading indicator
   * 3. Create a new connection and connect
   * 4. Save the connection to the store
   * 5. Sync the connection list to the host application
   * 6. Hide loading indicator
   */
  public handleConnectDeeplink: (url: string) => Promise<void> | undefined;

  private async _handleConnectDeeplink(url: string): Promise<void> {
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
        'Connection Error', // TODO use localizable strings
        'The connection request failed. Please try again.', // TODO use localizable strings
      );
    } finally {
      this.hostapp.hideLoading();
    }
  }

  /**
   * Disconnects a connection, cleans up all associated data
   * and revokes permissions.
   * @param id The ID of the connection to terminate.
   */
  public async disconnect(id: string): Promise<void> {
    await this.connections.get(id)?.disconnect();
    await this.store.delete(id);
    this.connections.delete(id);
    this.hostapp.revokePermissions(id);
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
    const parsed = new URL(url);

    const payload = parsed.searchParams.get('p');
    if (!payload) {
      throw new Error('[SDKConnectV2] No payload found in URL.');
    }

    if (payload.length > 1024 * 1024) {
      throw new Error('[SDKConnectV2] Payload too large (max 1MB).');
    }

    const connreq: unknown = JSON.parse(payload);

    if (!isConnectionRequest(connreq)) {
      throw new Error('[SDKConnectV2] Invalid connection request structure.');
    }

    return connreq;
  }

  /**
   * Sets up the listener for app state lifecycle events to handle reconnection.
   */
  private setupAppStateListener(): void {
    let isColdStart = true;

    AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus): void => {
        if (nextAppState !== 'active') {
          return;
        }

        // First 'active' event on a cold start is ignored
        if (isColdStart) {
          isColdStart = false;
          return;
        }

        // For all subsequent 'active' events, we reconnect, but only after
        // the initial setup is guaranteed to be complete to avoid race conditions.
        this.ready.then(() => this.reconnectAll());
      },
    );
  }

  /**
   * Proactively refreshes all active connections. This is the primary mechanism
   * for preventing stale/zombie connections after the app was put in the background.
   */
  private async reconnectAll(): Promise<void> {
    const connections = Array.from(this.connections.values());

    const promises = connections.map((conn) =>
      conn.client
        .reconnect()
        .catch((err: Error) =>
          console.error(
            `[SDKConnectV2] Failed to reconnect connection ${conn.id}`,
            err,
          ),
        ),
    );

    await Promise.allSettled(promises);
  }
}
