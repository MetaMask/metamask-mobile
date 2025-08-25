import {
  SessionRequest,
  WalletClient,
} from '@metamask/mobile-wallet-protocol-wallet-client';
import {
  IKeyManager,
  SessionStore,
  WebSocketTransport,
} from '@metamask/mobile-wallet-protocol-core';
import { DappMetadata } from '../types/dapp-metadata';
import { ConnectionRequest } from '../types/connection-request';
import { KVStore } from '../store/kv-store';

/**
 * Represents a live, runtime representation of a dApp connection.
 */
export class Connection {
  public readonly id: string;
  public readonly dappMetadata: DappMetadata;
  public readonly client: WalletClient;

  private constructor(
    id: string,
    dappMetadata: DappMetadata,
    client: WalletClient,
  ) {
    this.id = id;
    this.dappMetadata = dappMetadata;
    this.client = client;

    this.client.on('message', this.handleMessage);
  }

  public static async create(
    connreq: ConnectionRequest,
    keymanager: IKeyManager,
    relayURL: string,
  ): Promise<Connection> {
    const id = connreq.sessionRequest.id;
    const dappMetadata = connreq.dappMetadata;
    const transport = await WebSocketTransport.create({
      url: relayURL,
      kvstore: new KVStore(`mwp/transport/${id}`),
    });
    const sessionstore = new SessionStore(
      new KVStore(`mwp/session-store/${id}`),
    );
    const client = new WalletClient({ transport, sessionstore, keymanager });

    return new Connection(id, dappMetadata, client);
  }

  public async connect(sessionRequest: SessionRequest): Promise<void> {
    await this.client.connect({ sessionRequest });
    console.warn(`[Connection:${this.id}] Protocol handshake complete.`);
  }

  public async disconnect(): Promise<void> {
    this.client.off('message', this.handleMessage);
    await this.client.disconnect();
    console.warn(`[Connection:${this.id}] Disconnected.`);
  }

  private handleMessage = (payload: unknown) => {
    console.warn(`[Connection:${this.id}] Received message:`, payload);
  };
}
