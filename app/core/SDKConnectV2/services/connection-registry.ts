import { AppState, AppStateStatus } from 'react-native';
import { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import {
  ConnectionRequest,
  isConnectionRequest,
} from '../types/connection-request';
import { IConnectionStore } from '../types/connection-store';
import { IHostApplicationAdapter } from '../types/host-application-adapter';
import { Connection } from './connection';
import { ConnectionInfo } from '../types/connection-info';
import logger from './logger';
import { ACTIONS, PREFIXES } from '../../../constants/deeplinks';
import { decompressPayloadB64 } from '../utils/compression-utils';

/**
 * The ConnectionRegistry is the central service responsible for managing the
 * lifecycle of all SDKConnectV2 connections.
 */
export class ConnectionRegistry {
  private readonly DEEPLINK_PREFIX = `${PREFIXES.METAMASK}${ACTIONS.CONNECT}/mwp`;

  private readonly RELAY_URL: string;
  private readonly keymanager: IKeyManager;
  private readonly hostapp: IHostApplicationAdapter;
  private readonly store: IConnectionStore;

  private readonly ready: Promise<void>;
  private connections = new Map<string, Connection>();
  private deeplinks = new Set<string>();

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
  }

  /**
   * One-time initialization to resume all persisted connections on app cold start.
   */
  private async initialize(): Promise<void> {
    const persisted = await this.store.list().catch(() => []);

    const promises = persisted.map(async (connInfo) => {
      try {
        const conn = await Connection.create(
          connInfo,
          this.keymanager,
          this.RELAY_URL,
        );
        await conn.resume();
        this.connections.set(conn.id, conn);
        logger.debug('Connection resumed', conn.id);
      } catch (error) {
        logger.error('Failed to resume connection', connInfo.id, error);
      }
    });

    await Promise.allSettled(promises);

    this.hostapp.syncConnectionList(Array.from(this.connections.values()));
  }

  /**
   * Returns true if the deeplink is a connect deeplink
   * @param url - The url to check
   * @returns - True if the deeplink is a connect deeplink
   */
  public isConnectDeeplink(url: unknown): url is string {
    return typeof url === 'string' && url.startsWith(this.DEEPLINK_PREFIX);
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
   *
   * NOTE: As the host app might call this function multiple times in a short period of time,
   * we need keep track of the deeplinks to make this function idempotent.
   */
  public async handleConnectDeeplink(url: string): Promise<void> {
    if (this.deeplinks.has(url)) return;
    this.deeplinks.add(url);

    logger.debug('Handling connect deeplink:', url);

    let conn: Connection | undefined;
    let connInfo: ConnectionInfo | undefined;

    try {
      const connReq = this.parseConnectionRequest(url);
      connInfo = this.toConnectionInfo(connReq);
      this.hostapp.showConnectionLoading(connInfo);
      conn = await Connection.create(connInfo, this.keymanager, this.RELAY_URL);
      await conn.connect(connReq.sessionRequest);
      this.connections.set(conn.id, conn);
      await this.store.save(connInfo);
      this.hostapp.syncConnectionList(Array.from(this.connections.values()));
      logger.debug('Handled connect deeplink.', connInfo);
    } catch (error) {
      logger.error('Failed to handle connect deeplink:', error, url);
      this.hostapp.showConnectionError();
      if (conn) await this.disconnect(conn.id);
    } finally {
      if (connInfo) this.hostapp.hideConnectionLoading(connInfo);
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
    logger.debug('Connection disconnected:', id);
  }

  /**
   * Parse the connection request from the deeplink URL.
   * @param url The full deeplink URL that triggered the connection.
   * @returns The parsed connection request.
   *
   * Format: metamask://connect/mwp?p=<encoded_connection_request>&c=1
   */
  private parseConnectionRequest(url: string): ConnectionRequest {
    const parsed = new URL(url);

    const payload = parsed.searchParams.get('p');
    if (!payload) {
      throw new Error('No payload found in URL.');
    }

    const compressionFlag = parsed.searchParams.get('c');
    const jsonString =
      compressionFlag === '1' ? decompressPayloadB64(payload) : payload;

    if (jsonString.length > 1024 * 1024) {
      throw new Error('Payload too large (max 1MB).');
    }

    const connReq: unknown = JSON.parse(jsonString);

    if (!isConnectionRequest(connReq)) {
      throw new Error('Invalid connection request structure.');
    }

    return connReq;
  }

  private toConnectionInfo(connReq: ConnectionRequest): ConnectionInfo {
    return {
      id: connReq.sessionRequest.id,
      metadata: connReq.metadata,
      expiresAt: connReq.sessionRequest.expiresAt,
    };
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
        .then(() => logger.debug('Connection reconnected:', conn.id))
        .catch((err: Error) =>
          logger.error('Failed to reconnect connection:', err, conn.id),
        ),
    );

    await Promise.allSettled(promises);
  }
}
