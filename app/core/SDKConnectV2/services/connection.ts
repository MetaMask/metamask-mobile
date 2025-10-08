import {
  SessionRequest,
  WalletClient,
} from '@metamask/mobile-wallet-protocol-wallet-client';
import {
  IKeyManager,
  SessionStore,
  WebSocketTransport,
} from '@metamask/mobile-wallet-protocol-core';
import { KVStore } from '../store/kv-store';
import { IRPCBridgeAdapter } from '../types/rpc-bridge-adapter';
import { RPCBridgeAdapter } from '../adapters/rpc-bridge-adapter';
import { ConnectionInfo } from '../types/connection-info';
import logger from './logger';
import { IHostApplicationAdapter } from '../types/host-application-adapter';

/**
 * Connection is a live, runtime representation of a dApp connection.
 */
export class Connection {
  public readonly id: string;
  public readonly info: ConnectionInfo;
  public readonly client: WalletClient;
  public readonly hostApp: IHostApplicationAdapter;
  public readonly bridge: IRPCBridgeAdapter;

  private constructor(
    connInfo: ConnectionInfo,
    client: WalletClient,
    hostApp: IHostApplicationAdapter,
  ) {
    this.id = connInfo.id;
    this.info = connInfo;
    this.client = client;
    this.hostApp = hostApp;
    this.bridge = new RPCBridgeAdapter(this.info);

    this.client.on('message', (payload) => {
      logger.debug('Received message:', this.id, payload);

      this.bridge.send(payload);
    });

    this.bridge.on('response', (payload) => {
      logger.debug('Sending message:', this.id, payload);

      // If the payload includes an id, its a JSON-RPC response, otherwise its a notification
      if ('data' in payload && 'id' in payload.data) {
        this.hostApp.showReturnToApp(this.info);
      }

      this.client.sendResponse(payload);
    });
  }

  /**
   * Creates a new connection from either a new request or persisted data.
   *
   * @param connInfo - The connection information.
   * @param keymanager - The key manager instance.
   * @param relayURL - The URL of the relay server.
   * @returns The created connection.
   */
  public static async create(
    connInfo: ConnectionInfo,
    keymanager: IKeyManager,
    relayURL: string,
    hostApp: IHostApplicationAdapter,
  ): Promise<Connection> {
    const transport = await WebSocketTransport.create({
      url: relayURL,
      kvstore: new KVStore(`mwp/transport/${connInfo.id}`),
    });
    const sessionstore = new SessionStore(
      new KVStore(`mwp/session-store/${connInfo.id}`),
    );
    const client = new WalletClient({ transport, sessionstore, keymanager });

    return new Connection(connInfo, client, hostApp);
  }

  /**
   * Connects the connection to the dApp.
   * @param sessionRequest - The session request.
   */
  public async connect(sessionRequest: SessionRequest): Promise<void> {
    await this.client.connect({ sessionRequest });
  }

  /**
   * Resumes a previously established session.
   */
  public async resume(): Promise<void> {
    await this.client.resume(this.id);
  }

  /**
   * Disconnects the connection from the dApp.
   */
  public async disconnect(): Promise<void> {
    this.bridge.dispose();
    await this.client.disconnect();
  }
}
