import {
  SessionRequest,
  WalletClient,
} from '@metamask/mobile-wallet-protocol-wallet-client';
import {
  IKeyManager,
  SessionStore,
  WebSocketTransport,
} from '@metamask/mobile-wallet-protocol-core';
import { ConnectionRequest } from '../types/connection-request';
import { PersistedConnection } from '../types/persisted-connection';
import { KVStore } from '../store/kv-store';
import { Metadata } from '../types/metadata';

/**
 * Connection is a live, runtime representation of a dApp connection.
 */
export class Connection {
  public readonly id: string;
  public readonly metadata: Metadata;
  public readonly client: WalletClient;

  private constructor(id: string, metadata: Metadata, client: WalletClient) {
    this.id = id;
    this.metadata = metadata;
    this.client = client;

    this.client.on('message', (payload) => {
      console.warn(`[Connection:${this.id}] Received message:`, payload); // To be implemented in a future PR.
    });
  }

  /**
   * Creates a new connection from either a new request or persisted data.
   *
   * @param data - The data for the connection, either a `ConnectionRequest` or a `PersistedConnection`.
   * @param keymanager - The key manager instance.
   * @param relayURL - The URL of the relay server.
   * @returns The created connection.
   */
  public static async create(
    data: ConnectionRequest | PersistedConnection,
    keymanager: IKeyManager,
    relayURL: string,
  ): Promise<Connection> {
    const id = 'sessionRequest' in data ? data.sessionRequest.id : data.id;
    const metadata = data.metadata;

    const transport = await WebSocketTransport.create({
      url: relayURL,
      kvstore: new KVStore(`mwp/transport/${id}`),
    });
    const sessionstore = new SessionStore(
      new KVStore(`mwp/session-store/${id}`),
    );
    const client = new WalletClient({ transport, sessionstore, keymanager });

    return new Connection(id, metadata, client);
  }

  /**
   * Connects the connection to the dApp.
   * @param sessionRequest - The session request.
   */
  public async connect(sessionRequest: SessionRequest): Promise<void> {
    await this.client.connect({ sessionRequest });
    console.warn(`[Connection:${this.id}] Connected to dApp.`);
  }

  /**
   * Resumes a previously established session.
   */
  public async resume(): Promise<void> {
    await this.client.resume(this.id);
    console.warn(`[Connection:${this.id}] Resumed connection to dApp.`);
  }

  /**
   * Disconnects the connection from the dApp.
   */
  public async disconnect(): Promise<void> {
    await this.client.disconnect();
    console.warn(`[Connection:${this.id}] Disconnected.`);
  }
}
