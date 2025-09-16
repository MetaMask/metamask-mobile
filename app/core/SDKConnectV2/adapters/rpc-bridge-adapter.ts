import EventEmitter from 'eventemitter2';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { Connection } from '../services/connection';
import { IRPCBridgeAdapter } from '../types/rpc-bridge-adapter';
import Engine from '../../Engine';
import AppConstants from '../../AppConstants';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import { ImageSourcePropType } from 'react-native';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RPCBridgeAdapter
  extends EventEmitter
  implements IRPCBridgeAdapter
{
  private client: BackgroundBridge | null = null;
  private queue: unknown[] = [];
  private processing = false;
  private connection: Connection;

  constructor(connection: Connection) {
    super();
    this.connection = connection;
    this.initialize();
  }

  /**
   * Sends a request to the background bridge.
   */
  public send(request: unknown): void {
    this.queue.push(request);
    this.processQueue(); // Attempt to process the request immediately
  }

  /**
   * Asynchronously sets up listeners for wallet state changes.
   */
  private async initialize() {
    while (!Engine.context?.KeyringController) {
      await wait(10);
    }

    const messenger = Engine.controllerMessenger;
    messenger.subscribe('KeyringController:lock', this.onLock);
    messenger.subscribe('KeyringController:unlock', this.onUnlock);
  }

  /**
   * Handles the wallet lock event.
   */
  private onLock = () => {
    console.warn('[SDKConnectV2] Wallet locked.');
    // TODO: What do we do here? Do we reject the queue? Do we discard the background bridge client?
  };

  /**
   * Handles the wallet unlock event.
   */
  private onUnlock = () => {
    console.warn(
      '[SDKConnectV2] Wallet unlocked. Attempting to process queue.',
    );
    // The unlock event is a signal to try processing whatever is in the queue.
    this.processQueue();
  };

  /**
   * The processQueue will process the queue of requests in a FIFO manner.
   */
  private async processQueue(): Promise<void> {
    // Gate 1: Don't run if already processing or if the queue is empty
    if (this.processing || this.queue.length === 0) {
      console.warn(
        '[SDKConnectV2] Processing halted: Queue is empty or already processing.',
      );
      return;
    }

    // Gate 2: Don't process requests if the wallet is locked
    if (!Engine.context.KeyringController.isUnlocked()) {
      console.warn('[SDKConnectV2] Processing halted: Wallet is locked.');
      return;
    }

    this.processing = true;

    try {
      if (!this.client) {
        this.client = this.createClient();
      }

      while (this.queue.length > 0) {
        const request = this.queue.shift();
        if (this.client && request) {
          this.client.onMessage({
            name: 'metamask-provider',
            data: request,
          });
        }
      }
    } catch (error) {
      console.error('[SDKConnectV2] Error during queue processing:', error);
      // TODO: What do we do here? Do we reject the request? Do we reject the full queue? Do we wait or return an error to the dapp?
      // TODO: Do we use "@metamask/rpc-errors" here?
    } finally {
      this.processing = false;
    }
  }

  /**
   * Creates a new BackgroundBridge instance configured for our use case.
   */
  private createClient(): BackgroundBridge {
    console.warn('[SDKConnectV2] Creating BackgroundBridge client.');
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
        [this.connection.metadata.dapp.url]: true,
      }),
      isWalletConnect: false,
      wcRequestActions: undefined,
    });
  }

  public dispose(): void {
    const messenger = Engine.controllerMessenger;
    messenger.unsubscribe('KeyringController:lock', this.onLock);
    messenger.unsubscribe('KeyringController:unlock', this.onUnlock);
    this.client?.onDisconnect();
    this.removeAllListeners();
  }
}
