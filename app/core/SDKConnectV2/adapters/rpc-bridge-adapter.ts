import EventEmitter from 'eventemitter2';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { IRPCBridgeAdapter } from '../types/rpc-bridge-adapter';
import Engine, { BaseControllerMessenger } from '../../Engine';
import AppConstants from '../../AppConstants';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import { ImageSourcePropType } from 'react-native';
import { whenEngineReady } from '../utils/is-engine-ready';
import { ConnectionInfo } from '../types/connection-info';

export class RPCBridgeAdapter
  extends EventEmitter
  implements IRPCBridgeAdapter
{
  private readonly connInfo: ConnectionInfo;
  private client: BackgroundBridge | null = null;
  private messenger: BaseControllerMessenger | null = null;
  private initialized: Promise<void> | null = null;
  private processing = false;
  private queue: unknown[] = [];

  constructor(connInfo: ConnectionInfo) {
    super();
    this.connInfo = connInfo;
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * Sends an RPC request to the background bridge.
   */
  public send(request: unknown): void {
    this.queue.push(request);
    this.processQueue();
  }

  /**
   * Disposes of the adapter, cleaning up listeners and connections.
   */
  public dispose(): void {
    this.messenger?.tryUnsubscribe(
      'KeyringController:unlock',
      this.processQueue,
    );
    this.client?.onDisconnect();
    this.removeAllListeners();
    this.queue = [];
  }

  /**
   * Lazily initializes the adapter. On the first call, it waits for the engine,
   * creates the background bridge client, and subscribes to wallet events.
   * This method is idempotent.
   */
  private ensureInitialized(): Promise<void> {
    if (this.initialized) return this.initialized;

    this.initialized = (async () => {
      await whenEngineReady();
      this.messenger = Engine.controllerMessenger;
      this.messenger.subscribe('KeyringController:unlock', this.processQueue);
      this.client = this.createClient();
    })();

    return this.initialized;
  }

  private isUnlocked(): boolean {
    return Engine.context.KeyringController.isUnlocked();
  }

  /**
   * Processes the queued requests.
   * Is triggered when new messages are received or the keyring is unlocked.
   */
  private async processQueue(): Promise<void> {
    await this.ensureInitialized();

    if (this.processing || this.queue.length === 0 || !this.isUnlocked()) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      this.client?.onMessage({
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
    const middlewareHostname = `${AppConstants.MM_SDK.SDK_CONNECT_V2_ORIGIN}${this.connInfo.id}`;

    return new BackgroundBridge({
      webview: null,
      isMMSDK: true,
      sdkVersion: 'v2',
      isRemoteConn: true,
      channelId: this.connInfo.id,
      url: this.connInfo.metadata.dapp.url,
      remoteConnHost: this.connInfo.metadata.dapp.url,
      sendMessage: (response: unknown) => {
        this.emit('response', response);
      },
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        getProviderState: () => void;
      }) =>
        getRpcMethodMiddleware({
          hostname: middlewareHostname,
          channelId: this.connInfo.id,
          getProviderState,
          isMMSDK: true,
          url: { current: this.connInfo.metadata.dapp.url },
          title: { current: this.connInfo.metadata.dapp.name },
          icon: {
            current: this.connInfo.metadata.dapp.icon as ImageSourcePropType,
          },
          navigation: null,
          isHomepage: () => false,
          fromHomepage: { current: false },
          tabId: '',
          isWalletConnect: false,
          analytics: {
            isRemoteConn: true,
            platform:
              this.connInfo.metadata.sdk.platform ??
              AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
          toggleUrlModal: () => null,
          injectHomePageScripts: () => null,
        }),
      isMainFrame: true,
      getApprovedHosts: () => ({
        [this.connInfo.metadata.dapp.url]: true,
      }),
      isWalletConnect: false,
      wcRequestActions: undefined,
    });
  }
}
