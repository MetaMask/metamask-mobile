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
import { ToastHandler } from '../utils/toast-handler';
import { JsonRpcRequest } from '@metamask/utils';

/**
 * Connection is a live, runtime representation of a dApp connection.
 */
export class Connection {
  public readonly id: string;
  public readonly info: ConnectionInfo;
  public readonly client: WalletClient;
  public readonly bridge: IRPCBridgeAdapter;
  public readonly requests: unknown[] = [];
  public readonly toastHandler: ToastHandler;

  private constructor(connInfo: ConnectionInfo, client: WalletClient) {
    this.id = connInfo.id;
    this.info = connInfo;
    this.client = client;
    this.bridge = new RPCBridgeAdapter(this.info);
    this.toastHandler = new ToastHandler();

    this.client.on('message', (payload) => {
      logger.debug('Received message:', this.id, payload);

      this.toastHandler.addRequest(payload as JsonRpcRequest);

      this.bridge.send(payload);
    });

    this.bridge.on('response', (payload) => {
      logger.debug('Sending message:', this.id, payload);

      //TODO (wenfix): fix before merge
      // @ts-expect-error type mismatch
      this.toastHandler.handleRequest(payload.data);

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
  ): Promise<Connection> {
    const transport = await WebSocketTransport.create({
      url: relayURL,
      kvstore: new KVStore(`mwp/transport/${connInfo.id}`),
    });
    const sessionstore = new SessionStore(
      new KVStore(`mwp/session-store/${connInfo.id}`),
    );
    const client = new WalletClient({ transport, sessionstore, keymanager });

    return new Connection(connInfo, client);
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
