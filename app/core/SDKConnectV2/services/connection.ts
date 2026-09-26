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
 * Silent read-only methods that should not trigger user-facing toast
 * notifications (e.g. "Return to app") since they do not require a
 * confirmation and are typically polled by dapps in the background.
 */
const SILENT_READ_METHODS: ReadonlySet<string> = new Set([
  'eth_accounts',
  'eth_chainId',
]);

/**
 * Connection is a live, runtime representation of a dApp connection.
 */
export class Connection {
  public readonly id: string;
  public readonly info: ConnectionInfo;
  public readonly client: WalletClient;
  public readonly hostApp: IHostApplicationAdapter;
  public readonly bridge: IRPCBridgeAdapter;

  /**
   * Tracks the full in-flight request payload for each JSON-RPC request,
   * so the response handler can apply request-specific behavior (e.g.
   * suppressing user-facing toasts for silent read-only methods).
   *
   * Keyed by `${payload.name}:${id}` so requests from different multiplex
   * channels (e.g. `metamask-provider` vs `metamask-multichain-provider`)
   * with overlapping JSON-RPC ids do not collide. Entries are added when
   * a request is forwarded to the bridge and removed once a response with
   * the matching key is received.
   */
  private readonly requestMap: Map<string, unknown> = new Map();

  /**
   * Resolves once the secure relay session is fully established — i.e. after
   * the MWP handshake completes via {@link connect} or {@link resume} and the
   * underlying WalletClient is in the `CONNECTED` state.
   *
   * Used to gate outbound responses. With the eager-approval optimization in
   * {@link connect}, the connection request is surfaced to the user directly
   * from the deeplink's inline `initialMessage` — potentially before the relay
   * handshake has finished. Awaiting this before calling
   * `client.sendResponse()` guarantees we never try to respond while the client
   * is still `CONNECTING` (which throws `SESSION_INVALID_STATE` and silently
   * drops the response). In the common case the handshake finishes long before
   * the user acts, so this resolves instantly.
   */
  private clientReady: Promise<void> | null = null;

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
      void this.handleIncomingMessage(payload);
    });

    this.bridge.on('response', async (payload) => {
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
        const responseId = responseData.id as number | string;

        // Look up the originating request for this response (keyed by
        // multiplex channel name + JSON-RPC id) and remove the entry from
        // the request map. Responses for silent read-only methods (e.g.
        // eth_accounts, eth_chainId) should not surface "Return to app" or
        // error toasts to the user. The response itself is still relayed
        // back to the dapp below via this.client.sendResponse(payload).
        //
        // At runtime BackgroundBridge wraps responses with `{ name, data }`
        // via the json-rpc-middleware-stream multiplex layer, but `RPCResponse`
        // does not declare `name`, so we narrow defensively.
        let request: unknown;
        if ('name' in payload && typeof payload.name === 'string') {
          const key = `${payload.name}:${responseId}`;
          request = this.requestMap.get(key);
          this.requestMap.delete(key);
        }
        const requestData =
          request && typeof request === 'object' && 'data' in request
            ? ((request as { data?: unknown }).data as
                | Record<string, unknown>
                | undefined)
            : undefined;
        const requestMethod = requestData?.method;
        const isSilentReadRequest =
          typeof requestMethod === 'string' &&
          SILENT_READ_METHODS.has(requestMethod);

        if (!isSilentReadRequest) {
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

            if (
              REJECTION_CODES.has(errCode) ||
              isRejectionMessage(errMessage)
            ) {
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
      }

      // Wait for the relay handshake to finish before responding. With the
      // eager-approval optimization (see {@link connect}) the user can be
      // shown the connection request before the handshake completes, so a
      // response could otherwise be emitted while the client is still
      // `CONNECTING`. If the handshake failed, drop the response — the
      // connection is being torn down anyway. See {@link clientReady}.
      if (this.clientReady) {
        try {
          await this.clientReady;
        } catch {
          return;
        }
      }

      this.client.sendResponse(payload);
    });
  }

  /**
   * Forwards a single inbound message to the RPC bridge.
   *
   * Invoked both for messages that arrive over the relay (via the WalletClient
   * `message` event) and — for direct deeplink connections — for the
   * `initialMessage` embedded in the connection request, which {@link connect}
   * processes eagerly so the approval surfaces without waiting for the relay
   * handshake.
   */
  private async handleIncomingMessage(payload: unknown): Promise<void> {
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
      await Engine.context.ApprovalController.clearRequests(
        providerErrors.userRejectedRequest({
          data: {
            cause: 'rejectAllApprovals',
          },
        }),
      );
    }

    // Record the originating request payload (keyed by multiplex channel
    // name + JSON-RPC id) so the response handler can look up any of its
    // fields (e.g. `method`) when the matching response arrives. At runtime
    // BackgroundBridge wraps payloads with `{ name, data }` via the
    // json-rpc-middleware-stream multiplex layer, but `payload` is typed as
    // `unknown` here, so we narrow defensively.
    const requestId = data?.id;
    if (
      (typeof requestId === 'number' || typeof requestId === 'string') &&
      payload &&
      typeof payload === 'object' &&
      'name' in payload &&
      typeof payload.name === 'string'
    ) {
      const key = `${payload.name}:${requestId}`;
      this.requestMap.set(key, payload);
    }

    this.bridge.send(payload);
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
   *
   * Direct deeplink connections embed the initial RPC (typically
   * `wallet_createSession`) in `sessionRequest.initialMessage`. The approval UI
   * is driven entirely by that inline payload and does NOT need the relay — only
   * the eventual *response* delivery does. So we surface the approval
   * immediately, in parallel with the MWP handshake, rather than waiting for the
   * handshake (WebSocket connect + channel subscribes + handshake-offer publish)
   * to complete before the user can even see the request. This removes those
   * relay round-trips from the time-to-prompt critical path, which is the main
   * source of the perceived "deeplink connection is slow to prompt" latency.
   *
   * The inline message is stripped before the request is handed to the wallet
   * client so the client does not replay it after the handshake (see the wallet
   * client's `_processInitialMessage`), which would surface a duplicate
   * approval.
   */
  public async connect(sessionRequest: SessionRequest): Promise<void> {
    const { initialMessage } = sessionRequest;

    if (initialMessage) {
      // Fire-and-forget: drives the approval modal from the inline payload
      // while the handshake below runs concurrently.
      void this.handleIncomingMessage(initialMessage.payload);
    }

    try {
      this.clientReady = this.client.connect({
        sessionRequest: initialMessage
          ? { ...sessionRequest, initialMessage: undefined }
          : sessionRequest,
      });
      await this.clientReady;
    } catch (error) {
      // The handshake failed after we eagerly surfaced the approval. Reject the
      // pending approval so the user isn't left looking at a connection request
      // whose response can never be delivered.
      if (initialMessage) {
        await this.rejectEagerApproval();
      }
      throw error;
    }
  }

  /**
   * Resumes a previously established session.
   */
  public async resume(): Promise<void> {
    this.clientReady = this.client.resume(this.id);
    await this.clientReady;
  }

  /**
   * Rejects an approval that was eagerly surfaced from a deeplink's inline
   * `initialMessage` when the subsequent relay handshake fails. Mirrors the
   * superseded-request cleanup in {@link handleIncomingMessage}: navigate away
   * from the open approval first so a stale approval component isn't left
   * mounted, then clear the pending request(s).
   */
  private async rejectEagerApproval(): Promise<void> {
    try {
      if (Engine.context.ApprovalController.getTotalApprovalCount() > 0) {
        NavigationService.navigation?.goBack();
        await Engine.context.ApprovalController.clearRequests(
          providerErrors.userRejectedRequest({
            data: {
              cause: 'connectionFailed',
            },
          }),
        );
      }
    } catch (error) {
      logger.error('Failed to reject eager approval', this.id, error);
    }
  }

  /**
   * Disconnects the connection from the dApp.
   */
  public async disconnect(): Promise<void> {
    this.bridge.dispose();
    this.requestMap.clear();
    await this.client.disconnect();
  }
}
