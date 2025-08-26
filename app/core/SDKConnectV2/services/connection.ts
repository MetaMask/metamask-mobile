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

    this.client.on('message', this.handleMessage);
  }

  /**
   * Creates a new connection.
   * @param connreq - The connection request.
   * @param keymanager - The key manager.
   * @param relayURL - The relay URL.
   * @returns The created connection.
   */
  public static async create(
    connreq: ConnectionRequest,
    keymanager: IKeyManager,
    relayURL: string,
  ): Promise<Connection> {
    const id = connreq.sessionRequest.id;
    const metadata = connreq.metadata;
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
   * Resumes the connection to the dApp.
   */
  public async resume(): Promise<void> {
    // NOTE: This will be implemented in a future PR.
    console.warn(`[Connection:${this.id}] Resuming connection.`);
  }

  /**
   * Disconnects the connection from the dApp.
   */
  public async disconnect(): Promise<void> {
    this.client.off('message', this.handleMessage);
    await this.client.disconnect();
    console.warn(`[Connection:${this.id}] Disconnected.`);
  }

  /**
   * Handles a message from the dApp.
   * @param payload - The message payload.
   */
  private handleMessage = (payload: unknown) => {
    // NOTE: This will be implemented in a future PR.
    console.warn(`[Connection:${this.id}] Received message:`, payload);
  };
}
