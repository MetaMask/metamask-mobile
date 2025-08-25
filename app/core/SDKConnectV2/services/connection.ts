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
import { BackgroundBridge } from '../../BackgroundBridge/BackgroundBridge';

/**
 * Represents a live, runtime representation of a dApp connection.
 */
export class Connection {
  public readonly id: string;
  public readonly dappMetadata: DappMetadata;
  public readonly client: WalletClient;
  public readonly bridge?: BackgroundBridge; // FIXME

  private constructor(
    id: string,
    dappMetadata: DappMetadata,
    client: WalletClient,
    bridge?: BackgroundBridge,
  ) {
    this.id = id;
    this.dappMetadata = dappMetadata;
    this.client = client;
    this.bridge = bridge;

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
    const bridge = undefined; // To be implemented in a future PR.

    return new Connection(id, dappMetadata, client, bridge);
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

  public async resume(): Promise<void> {
    console.warn(
      `[Connection:${this.id}] Session resumption logic to be implemented.`,
    );
    // In the next PR, this will be:
    // this.client.on('message', this.handleMessage);
    // await this.client.resume(this.id);
    return Promise.resolve();
  }

  private handleMessage = (payload: unknown) => {
    console.warn(`[Connection:${this.id}] Received message:`, payload);
    // In a future PR, this will route the message to this connection's BackgroundBridge
    // if (this.bridge) {
    //   this.bridge.onMessage({ name: 'metamask-provider', data: payload });
    // }
  };
}
