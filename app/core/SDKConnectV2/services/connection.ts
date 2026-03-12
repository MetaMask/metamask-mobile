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
import { errorCodes, providerErrors } from '@metamask/rpc-errors';
import Engine from '../../Engine';
import NavigationService from '../../NavigationService';

/**
 * Known user-rejection error codes across ecosystems.
 * - 4001: EVM standard (EIP-1193)
 * - 5000: Solana wallet standard (user rejected)
 */
const REJECTION_CODES: ReadonlySet<number> = new Set([
  errorCodes.provider.userRejectedRequest, // 4001
  5000, // Solana wallet-standard user rejection
]);

/**
 * Message patterns that indicate a user rejection even when the original
 * error code has been lost. The SnapKeyring strips the 4001 code from
 * approval rejections and re-throws a plain Error, which serializeError
 * then wraps with the fallback code -32603. We match on the message to
 * recover the user-rejection intent.
 */
const REJECTION_MESSAGE_PATTERNS: readonly string[] = [
  'request rejected by user or snap',
  'user rejected',
];

const isRejectionMessage = (message: unknown): boolean => {
  if (typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return REJECTION_MESSAGE_PATTERNS.some((pattern) => lower.includes(pattern));
};

/**
 * Standard JSON-RPC internal error range: -32603, and server errors -32000 to -32099.
 */
const isInternalError = (code: number): boolean =>
  code === errorCodes.rpc.internal || (code >= -32099 && code <= -32000);

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

    this.client.on('message', async (payload) => {
      const data =
        payload && typeof payload === 'object' && 'data' in payload
          ? (payload.data as Record<string, unknown>)
          : undefined;
      logger.debug('Received message:', this.id, {
        method: data?.method,
        id: data?.id,
      });

      const isWalletCreateSessionRequest =
        payload &&
        typeof payload === 'object' &&
        'name' in payload &&
        payload.name === 'metamask-multichain-provider' &&
        'data' in payload &&
        payload.data &&
        typeof payload.data === 'object' &&
        'method' in payload.data &&
        payload.data.method === 'wallet_createSession';

      // If the request is a wallet_createSession request and there are pending approval requests, clear those pending approvals before
      // showing the wallet_createSession approval. We do this to prevent the user from seeing a stale wallet_createSession approval in the
      // scenario where they make a connection request, but leave the wallet before approving or rejecting the request, return to the dapp
      // to make a new connection request, and then finally return to the wallet to approve or reject the new connection request.
      if (
        isWalletCreateSessionRequest &&
        Engine.context.ApprovalController.getTotalApprovalCount() > 0
      ) {
        // We must manually navigate away from the currently open approval request, otherwise an approval component may be rendered
        // with an approval request prop that it cannot handle and cause the wallet to throw an exception.
        NavigationService.navigation?.goBack();
        await Engine.context.ApprovalController.clear(
          providerErrors.userRejectedRequest({
            data: {
              cause: 'rejectAllApprovals',
            },
          }),
        );
      }

      this.bridge.send(payload);
    });

    this.bridge.on('response', (payload) => {
      const responseData =
        'data' in payload
          ? (payload.data as Record<string, unknown>)
          : (payload as Record<string, unknown>);
      logger.debug('Sending message:', this.id, {
        method: responseData?.method,
        id: responseData?.id,
      });

      // If the payload includes an id, its a JSON-RPC response, otherwise its a notification
      if ('data' in payload && 'id' in payload.data) {
        const responseData = payload.data;
        // Check if the response is an error (JSON-RPC error responses have an 'error' property)
        const isError =
          'error' in responseData && responseData.error !== undefined;

        if (isError) {
          const errCode = responseData.error.code as number;
          const errMessage =
            (responseData.error as Record<string, unknown>).message ??
            (responseData.error as Record<string, unknown>).reason;

          logger.warn('RPC error response', {
            connectionId: this.id,
            code: errCode,
            message: errMessage,
          });

          if (REJECTION_CODES.has(errCode) || isRejectionMessage(errMessage)) {
            this.hostApp.showConfirmationRejectionError(this.info);
          } else if (isInternalError(errCode)) {
            this.hostApp.showInternalError(this.info);
          } else {
            this.hostApp.showMethodError(this.info);
          }
        } else {
          this.hostApp.showReturnToApp(this.info);
        }
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
      useSharedConnection: true,
    });
    const sessionstore = await SessionStore.create(
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
