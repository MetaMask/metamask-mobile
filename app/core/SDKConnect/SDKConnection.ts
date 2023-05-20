import { v1 as random } from 'uuid';
import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';
import Minimizer from 'react-native-minimizer';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';
import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  CommunicationLayerMessage,
  CommunicationLayerPreference,
  EventType,
  MessageType,
  OriginatorInfo,
  RemoteCommunication,
} from './CommunicationLayerAbstraction';
import { ethErrors } from 'eth-rpc-errors';
import generateOTP from './utils/generateOTP.util';
import {
  waitForEmptyRPCQueue,
  waitForKeychainUnlocked,
} from './utils/wait.util';
import { Json } from '@metamask/controller-utils';
import { parseSource } from './utils/parseSource';
import {
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
  registerGlobals,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';
import {
  ApprovedHosts,
  ConnectionProps,
  METHODS_TO_REDIRECT,
  approveHostProps,
  CONNECTION_LOADING_EVENT,
} from './SDKConnect';
import RPCQueueManager from './RPCQueueManager';
import AppConstants from '../AppConstants';
import Engine from '../Engine';
import Logger from 'app/util/Logger';
import { KeyringController } from '@metamask/keyring-controller';
import { EventEmitter2 } from 'eventemitter2';
import { sharedState, setWentBackMinimizer } from './ShareModules';

const webrtc = {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
};

// eslint-disable-next-line
const { version } = require('../../../package.json');

export default class Connection extends EventEmitter2 {
  channelId;
  remote: RemoteCommunication;
  requestsToRedirect: { [request: string]: boolean } = {};
  origin: string;
  host: string;
  originatorInfo?: OriginatorInfo;
  isReady = false;
  backgroundBridge?: BackgroundBridge;
  reconnect: boolean;
  /**
   * isResumed is used to manage the loading state.
   */
  isResumed = false;
  initialConnection: boolean;

  /**
   * Array of random number to use during reconnection and otp verification.
   */
  otps?: number[];

  /**
   * Should only be accesses via getter / setter.
   */
  private _loading = false;
  private approvalPromise?: Promise<unknown>;

  private rpcQueueManager: RPCQueueManager;

  approveHost: ({ host, hostname }: approveHostProps) => void;
  getApprovedHosts: (context: string) => ApprovedHosts;
  disapprove: (channelId: string) => void;
  revalidate: ({ channelId }: { channelId: string }) => void;
  isApproved: ({
    channelId,
  }: {
    channelId: string;
    context?: string;
  }) => boolean;
  onTerminate: ({ channelId }: { channelId: string }) => void;

  constructor({
    id,
    otherPublicKey,
    origin,
    reconnect,
    initialConnection,
    rpcQueueManager,
    approveHost,
    getApprovedHosts,
    disapprove,
    revalidate,
    isApproved,
    updateOriginatorInfos,
    onTerminate,
  }: ConnectionProps & {
    rpcQueueManager: RPCQueueManager;
    approveHost: ({ host, hostname }: approveHostProps) => void;
    getApprovedHosts: (context: string) => ApprovedHosts;
    disapprove: (channelId: string) => void;
    revalidate: ({ channelId }: { channelId: string }) => void;
    isApproved: ({ channelId }: { channelId: string }) => boolean;
    onTerminate: ({ channelId }: { channelId: string }) => void;
    updateOriginatorInfos: (params: {
      channelId: string;
      originatorInfo: OriginatorInfo;
    }) => void;
  }) {
    super();
    this.origin = origin;
    this.channelId = id;
    this.reconnect = reconnect || false;
    this.isResumed = false;
    this.initialConnection = initialConnection === true;
    this.host = `${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}${this.channelId}`;
    this.rpcQueueManager = rpcQueueManager;
    this.approveHost = approveHost;
    this.getApprovedHosts = getApprovedHosts;
    this.disapprove = disapprove;
    this.revalidate = revalidate;
    this.isApproved = isApproved;
    this.onTerminate = onTerminate;

    this.setLoading(true);

    this.remote = new RemoteCommunication({
      platform: AppConstants.MM_SDK.PLATFORM,
      communicationServerUrl: AppConstants.MM_SDK.SERVER_URL,
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect,
      walletInfo: {
        type: 'MetaMask Mobile',
        version,
      },
      context: AppConstants.MM_SDK.PLATFORM,
      analytics: true,
      logging: {
        eciesLayer: false,
        keyExchangeLayer: false,
        remoteLayer: false,
        serviceLayer: false,
        plaintext: false,
      },
      storage: {
        debug: false,
      },
    });

    this.requestsToRedirect = {};

    this.sendMessage = this.sendMessage.bind(this);

    this.remote.on(EventType.CLIENTS_CONNECTED, () => {
      this.setLoading(true);
    });

    this.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
      this.setLoading(false);
      // Disapprove a given host everytime there is a disconnection to prevent hijacking.
      if (!this.remote.isPaused()) {
        disapprove(this.channelId);
        this.initialConnection = false;
        this.otps = undefined;
      }
    });

    this.remote.on(
      EventType.CLIENTS_READY,
      async (clientsReadyMsg: { originatorInfo: OriginatorInfo }) => {
        const approvalController = (
          Engine.context as { ApprovalController: ApprovalController }
        ).ApprovalController;

        // backward compatibility with older sdk -- always first request approval
        if (!clientsReadyMsg?.originatorInfo?.apiVersion) {
          // Cleanup previous pending permissions
          approvalController.clear(ethErrors.provider.userRejectedRequest());
          this.approvalPromise = undefined;
        }

        if (
          !this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
        ) {
          approvalController.clear(ethErrors.provider.userRejectedRequest());
          this.approvalPromise = undefined;

          if (!this.otps) {
            this.otps = generateOTP();
          }
          this.sendMessage({
            type: MessageType.OTP,
            otpAnswer: this.otps?.[0],
          });
          // Prevent auto approval if metamask is killed and restarted
          disapprove(this.channelId);
        } else if (
          !this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
        ) {
          // Deeplink channels are automatically approved on re-connection.
          const hostname =
            AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + this.channelId;
          approveHost({
            host: hostname,
            hostname,
            context: 'clients_ready',
          });
        }

        if (this.isReady) {
          // Re-send otp message in case client didnd't receive disconnection.
          return;
        }

        // clients_ready may be sent multple time (from sdk <0.2.0).
        const originatorInfo = clientsReadyMsg?.originatorInfo;

        // Make sure we only initialize the bridge when originatorInfo is received.
        if (!originatorInfo) {
          return;
        }

        Logger.log(
          `SDKConnect::Connection - clients_ready channel=${this.channelId}`,
        );

        this.originatorInfo = originatorInfo;
        updateOriginatorInfos({ channelId: this.channelId, originatorInfo });
        this.setupBridge(originatorInfo);
        this.isReady = true;
      },
    );

    this.remote.on(
      EventType.MESSAGE,
      async (message: CommunicationLayerMessage) => {
        if (!this.isReady) {
          return;
        }

        // handle termination message
        if (message.type === MessageType.TERMINATE) {
          // Delete connection from storage
          this.onTerminate({ channelId: this.channelId });
          return;
        }

        // ignore anything other than RPC methods.
        if (!message.method || !message.id) {
          return;
        }

        let needsRedirect = METHODS_TO_REDIRECT[message?.method] ?? false;
        // reset wentBack state to allow Minimizer.goBack()
        setWentBackMinimizer(false);

        if (needsRedirect) {
          this.requestsToRedirect[message?.id] = true;
        }

        // Keep this section only for backward compatibility otherwise metamask doesn't redirect properly.
        if (
          !this.originatorInfo?.apiVersion &&
          !needsRedirect &&
          // this.originatorInfo?.platform !== 'unity' &&
          message?.method === 'metamask_getProviderState'
        ) {
          // Manually force redirect if apiVersion isn't defined for backward compatibility
          needsRedirect = true;
          this.requestsToRedirect[message?.id] = true;
        }

        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;
        await waitForKeychainUnlocked({ keyringController });

        // Check if channel is permitted
        try {
          if (needsRedirect) {
            await this.checkPermissions(message);
            this.setLoading(false);
            // Special case for eth_requestAccount, doens't need to queue because it comes from apporval request.
            this.rpcQueueManager.add({
              id: (message.id as string) ?? 'unknown',
              method: message.method,
            });
          }
        } catch (error) {
          // Approval failed - redirect to app with error.
          this.sendMessage({
            data: {
              error,
              id: message.id,
              jsonrpc: '2.0',
            },
            name: 'metamask-provider',
          });
          this.approvalPromise = undefined;
          return;
        }

        // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
        if (message.method === 'eth_sendTransaction') {
          if (
            !(
              message.params &&
              Array.isArray(message?.params) &&
              message.params.length > 0
            )
          ) {
            throw new Error('Invalid message format');
          }

          const transactionController = (
            Engine.context as { TransactionController: TransactionController }
          ).TransactionController;
          try {
            const hash = await (
              await transactionController.addTransaction(
                message.params[0],
                this.originatorInfo?.url
                  ? AppConstants.MM_SDK.SDK_REMOTE_ORIGIN +
                      this.originatorInfo?.url
                  : undefined,
                WalletDevice.MM_MOBILE,
              )
            ).result;
            this.sendMessage({
              data: {
                id: message.id,
                jsonrpc: '2.0',
                result: hash,
              },
              name: 'metamask-provider',
            });
          } catch (error) {
            this.sendMessage({
              data: {
                error,
                id: message.id,
                jsonrpc: '2.0',
              },
              name: 'metamask-provider',
            });
          }
          return;
        }

        // Add some delay, otherwise in some rare cases, the ui may not have had time ot initialize and modal doesn't show.
        setTimeout(() => {
          this.backgroundBridge?.onMessage({
            name: 'metamask-provider',
            data: message,
            origin: 'sdk',
          });
        }, 100);
      },
    );
  }

  public connect({ withKeyExchange }: { withKeyExchange: boolean }) {
    this.remote.connectToChannel(this.channelId, withKeyExchange);
    this.setLoading(true);
    if (withKeyExchange) {
      this.remote.on(EventType.CLIENTS_WAITING, () => {
        // Always disconnect - this should not happen, DAPP should always init the connection.
        // A new channelId should be created after connection is removed.
        // On first launch reconnect is set to false even if there was a previous existing connection in another instance.
        // To avoid hanging on the socket forever, we automatically close it after 5seconds.
        this.removeConnection({ terminate: false });
      });
    }
  }

  setLoading(loading: boolean) {
    this._loading = loading;
    this.emit(CONNECTION_LOADING_EVENT, { loading });
  }

  getLoading() {
    return this._loading;
  }

  private setupBridge(originatorInfo: OriginatorInfo) {
    if (this.backgroundBridge) {
      return;
    }
    this.backgroundBridge = new BackgroundBridge({
      webview: null,
      isMMSDK: true,
      url: originatorInfo?.url,
      isRemoteConn: true,
      sendMessage: this.sendMessage,
      getApprovedHosts: () => this.getApprovedHosts('backgroundBridge'),
      remoteConnHost: this.host,
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        hostname: string;
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname: this.host,
          getProviderState,
          isMMSDK: true,
          navigation: null, //props.navigation,
          getApprovedHosts: () => this.getApprovedHosts('rpcMethodMiddleWare'),
          setApprovedHosts: (hostname: string) => {
            this.approveHost({
              host: hostname,
              hostname,
              context: 'setApprovedHosts',
            });
          },
          approveHost: (approveHostname) =>
            this.approveHost({
              host: this.host,
              hostname: approveHostname,
              context: 'rpcMethodMiddleWare',
            }),
          // Website info
          url: {
            current: originatorInfo?.url ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
          title: {
            current: originatorInfo?.title ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
          icon: { current: undefined },
          // Bookmarks
          isHomepage: () => false,
          // Show autocomplete
          fromHomepage: { current: false },
          // Wizard
          wizardScrollAdjusted: { current: false },
          tabId: '',
          isWalletConnect: false,
          analytics: {
            isRemoteConn: true,
            platform: parseSource(
              originatorInfo?.platform ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
            ),
          },
          toggleUrlModal: () => null,
          injectHomePageScripts: () => null,
        }),
      isMainFrame: true,
      isWalletConnect: false,
      wcRequestActions: undefined,
    });
  }

  /**
   * Check if current channel has been allowed.
   *
   * @param message
   * @returns {boolean} true when host is approved or user approved the request.
   * @throws error if the user reject approval request.
   */
  private async checkPermissions(
    _message?: CommunicationLayerMessage,
  ): Promise<boolean> {
    // only ask approval if needed
    const approved = this.isApproved({
      channelId: this.channelId,
      context: 'checkPermission',
    });

    const preferencesController = (
      Engine.context as { PreferencesController: PreferencesController }
    ).PreferencesController;
    const selectedAddress = preferencesController.state.selectedAddress;

    if (approved && selectedAddress) {
      return true;
    }

    const approvalController = (
      Engine.context as { ApprovalController: ApprovalController }
    ).ApprovalController;

    if (this.approvalPromise) {
      // Wait for result and clean the promise afterwards.
      await this.approvalPromise;
      this.approvalPromise = undefined;
      return true;
    }

    if (!this.initialConnection && AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
      this.revalidate({ channelId: this.channelId });
    }

    this.approvalPromise = approvalController.add({
      origin: this.origin,
      type: ApprovalTypes.CONNECT_ACCOUNTS,
      requestData: {
        hostname: this.originatorInfo?.title ?? '',
        pageMeta: {
          channelId: this.channelId,
          reconnect: !this.initialConnection,
          origin: this.origin,
          url: this.originatorInfo?.url ?? '',
          title: this.originatorInfo?.title ?? '',
          icon: this.originatorInfo?.icon ?? '',
          otps: this.otps ?? [],
          apiVersion: this.originatorInfo?.apiVersion,
          analytics: {
            request_source: AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN,
            request_platform: parseSource(
              this.originatorInfo?.platform ??
                AppConstants.MM_SDK.UNKNOWN_PARAM,
            ),
          },
        } as Json,
      },
      id: random(),
    });

    await this.approvalPromise;
    // Clear previous permissions if already approved.
    this.revalidate({ channelId: this.channelId });
    this.approvalPromise = undefined;
    return true;
  }

  pause() {
    this.remote.pause();
  }

  resume() {
    this.remote.resume();
    this.isResumed = true;
    this.setLoading(false);
  }

  disconnect({ terminate }: { terminate: boolean }) {
    if (terminate) {
      this.remote.sendMessage({
        type: MessageType.TERMINATE,
      });
    }
    this.remote.disconnect();
  }

  removeConnection({ terminate }: { terminate: boolean }) {
    this.isReady = false;
    this.disconnect({ terminate });
    this.backgroundBridge?.onDisconnect();
    this.setLoading(false);
  }

  sendMessage(msg: any) {
    const needsRedirect = this.requestsToRedirect[msg?.data?.id];
    this.remote.sendMessage(msg);
    this.setLoading(false);

    if (!needsRedirect) return;

    this.rpcQueueManager.remove(msg?.data?.id);
    delete this.requestsToRedirect[msg?.data?.id];

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    waitForEmptyRPCQueue(this.rpcQueueManager).then(() => {
      if (sharedState.wentBackMinimizer) {
        // Skip, already went back.
        return;
      }

      Minimizer.goBack();
    });
  }
}
