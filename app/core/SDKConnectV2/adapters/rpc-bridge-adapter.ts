import EventEmitter from 'eventemitter2';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { IRPCBridgeAdapter } from '../types/rpc-bridge-adapter';
import Engine, { RootExtendedMessenger } from '../../Engine';
import AppConstants from '../../AppConstants';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import { ImageSourcePropType } from 'react-native';
import { ConnectionInfo } from '../types/connection-info';
import { whenEngineReady } from '../utils/when-engine-ready';
import { whenOnboardingComplete } from '../utils/when-onboarding-complete';
import { whenStoreReady } from '../utils/when-store-ready';

export class RPCBridgeAdapter
  extends EventEmitter
  implements IRPCBridgeAdapter
{
  private readonly connInfo: ConnectionInfo;
  private client: BackgroundBridge | null = null;
  private messenger: RootExtendedMessenger | null = null;
  private initialized: Promise<void> | null = null;
  private processing = false;
  private queue: unknown[] = [];

  constructor(connInfo: ConnectionInfo) {
    super();
    this.connInfo = connInfo;
    this.processQueue = this.processQueue.bind(this);
    this.ensureInitialized();
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
   * and onboarding to complete, creates the background bridge client, and subscribes to wallet events.
   * This method is idempotent.
   */
  private ensureInitialized(): Promise<void> {
    if (this.initialized) return this.initialized;

    this.initialized = (async () => {
      await Promise.all([
        whenEngineReady(),
        whenStoreReady(),
        whenOnboardingComplete(),
      ]);
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

    if (
      this.processing ||
      this.queue.length === 0 ||
      !this.isUnlocked() ||
      !this.client
    ) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      this.client.onMessage(request);
    }

    this.processing = false;
  }

  /**
   * Creates a new BackgroundBridge instance configured for our use case.
   *
   * IMPORTANT: `connInfo.metadata.dapp.url`, `.name`, and `.icon` are
   * **self-reported** by the dapp in the MWP connection request payload.
   * They are NOT independently verified. They are shown in the confirmation/approval
   * UI to indicate the claimed source of the request, and should NOT be treated as
   * equivalent to a verified origin/hostname. The actual connection identity is
   * secured by the MWP key exchange, but the displayed metadata could be spoofed
   * by a malicious dapp.
   */
  private createClient(): BackgroundBridge {
    const middlewareHostname = `${AppConstants.MM_SDK.SDK_CONNECT_V2_ORIGIN}${this.connInfo.id}`;

    // WARNING: These values are self-reported by the dapp and unverified.
    const selfReportedDappUrl = this.connInfo.metadata.dapp.url;
    const selfReportedDappName = this.connInfo.metadata.dapp.name;
    const selfReportedDappIcon = this.connInfo.metadata.dapp.icon;

    return new BackgroundBridge({
      webview: null,
      isMMSDK: true,
      sdkVersion: 'v2',
      isRemoteConn: true,
      channelId: this.connInfo.id,
      url: selfReportedDappUrl,
      remoteConnHost: selfReportedDappUrl,
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
          // Website info — self-reported by dapp, shown in confirmation/approval UI
          // to indicate the claimed source. Not equivalent to a verified origin.
          url: { current: selfReportedDappUrl },
          title: { current: selfReportedDappName },
          icon: {
            current: selfReportedDappIcon as ImageSourcePropType,
          },
          navigation: null,
          tabId: '',
          isWalletConnect: false,
          analytics: {
            isRemoteConn: true,
            platform:
              this.connInfo.metadata.sdk.platform ??
              AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
        }),
      isMainFrame: true,
      getApprovedHosts: () => ({
        [selfReportedDappUrl]: true,
      }),
      isWalletConnect: false,
      wcRequestActions: undefined,
    });
  }
}
