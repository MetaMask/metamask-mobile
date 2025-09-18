import EventEmitter from 'eventemitter2';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { Connection } from '../services/connection';
import { IRPCBridgeAdapter } from '../types/rpc-bridge-adapter';
import Engine, { BaseControllerMessenger } from '../../Engine';
import AppConstants from '../../AppConstants';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import { ImageSourcePropType } from 'react-native';
import { whenEngineReady } from '../utils/is-engine-ready';

export class RPCBridgeAdapter
  extends EventEmitter
  implements IRPCBridgeAdapter {
  private initialized = false;
  private processing = false;
  private queue: unknown[] = [];
  private client: BackgroundBridge | null = null;
  private connection: Connection;
  private messenger: BaseControllerMessenger | null = null;

  constructor(connection: Connection) {
    super();
    this.connection = connection;
    this.initialize();
  }

  /**
   * Sends an rpc request to the background bridge.
   */
  public send(request: unknown): void {
    this.queue.push(request);
    this.processQueue(); // Attempt to process the request immediately
  }

  /**
   * Disposes of the RPC bridge adapter.
   */
  public dispose(): void {
    this.messenger?.tryUnsubscribe('KeyringController:unlock', this.processQueue);
    this.client?.onDisconnect();
    this.removeAllListeners();
  }

  /**
   * Asynchronously sets up listeners for wallet unlock changes.
   * When the wallet is unlocked, the processQueue will be called.
   */
  private async initialize() {
    await whenEngineReady();
    this.messenger = Engine.controllerMessenger;
    this.messenger.subscribe('KeyringController:unlock', this.processQueue);
    this.initialized = true;
  }

  /**
   * The processQueue will process the queue of requests in a FIFO manner.
   */
  private async processQueue(): Promise<void> {
    // Don't run if 1) not initialized 2) already processing 3) queue is empty
    if (!this.initialized || this.processing || this.queue.length === 0) return;

    this.processing = true;

    if (!this.client) {
      this.client = this.createClient(); // Lazy create the client if it doesn't exist
    }

    while (this.queue.length > 0) {
      if (!Engine.context.KeyringController.isUnlocked()) return;

      const request = this.queue.shift();

      this.client.onMessage({
        name: 'metamask-multichain-provider',
        data: request,
      });
    }

    this.processing = false;
  }

  /**
   * Creates a new BackgroundBridge instance configured for our use case.
   */
  private createClient(): BackgroundBridge {
    const middlewareHostname = `${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}${this.connection.id}`;

    return new BackgroundBridge({
      webview: null,
      isRemoteConn: true,
      isMMSDK: true,
      channelId: this.connection.id,
      url: this.connection.metadata.dapp.url,
      remoteConnHost: this.connection.metadata.dapp.url,
      sendMessage: (response: unknown) => {
        this.emit('response', response);
      },
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname: middlewareHostname,
          channelId: this.connection.id,
          getProviderState,
          isMMSDK: true,
          url: { current: this.connection.metadata.dapp.url },
          title: { current: this.connection.metadata.dapp.name },
          icon: {
            current: this.connection.metadata.dapp.icon as ImageSourcePropType,
          },
          navigation: null,
          isHomepage: () => false,
          fromHomepage: { current: false },
          tabId: '',
          isWalletConnect: false,
          analytics: {
            isRemoteConn: true,
            platform:
              this.connection.metadata.sdk.platform ??
              AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
          toggleUrlModal: () => null,
          injectHomePageScripts: () => null,
        }),
      isMainFrame: true,
      getApprovedHosts: () => ({
        [this.connection.metadata.dapp.url]: true, // FIXME: I copied this from the SDKConnect v1, does this make sense?
      }),
      isWalletConnect: false,
      wcRequestActions: undefined,
    });
  }
}
