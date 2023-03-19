import {
  CommunicationLayerMessage,
  CommunicationLayerPreference,
  ConnectionStatus,
  EventType,
  MessageType,
  OriginatorInfo,
  RemoteCommunication,
} from '@metamask/sdk-communication-layer';
import BackgroundTimer from 'react-native-background-timer';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../AppConstants';
import { v1 as random } from 'uuid';

import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';
import { AppState } from 'react-native';
import Minimizer from 'react-native-minimizer';
import Device from '../../util/device';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';

import { ApprovalController } from '@metamask/approval-controller';
import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import { EventEmitter2 } from 'eventemitter2';
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
import { toggleSDKLoadingModal } from '../../../app/actions/modals';
import { store } from '../../../app/store';
import generateOTP from './generateOTP.util';
import { ethErrors } from 'eth-rpc-errors';

export const MIN_IN_MS = 1000 * 60;
export const HOUR_IN_MS = MIN_IN_MS * 60;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const DEFAULT_SESSION_TIMEOUT_MS = 7 * DAY_IN_MS;

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
  initialConnection?: boolean;
  originatorInfo?: OriginatorInfo;
  validUntil: number;
}
export interface ConnectedSessions {
  [id: string]: Connection;
}

export interface SDKSessions {
  [chanelId: string]: ConnectionProps;
}

export interface ApprovedHosts {
  [host: string]: number;
}

export interface approveHostProps {
  host: string;
  hostname: string;
  context?: string;
}

export const TIMEOUT_PAUSE_CONNECTIONS = 20000;

export type SDKEventListener = (event: string) => void;

export const MM_SDK_REMOTE_ORIGIN = 'MMSDKREMOTE::';

const CONNECTION_LOADING_EVENT = 'loading';

export const CONNECTION_CONFIG = {
  // Adjust the serverUrl during local dev if need to debug the communication protocol.
  // serverUrl: 'http://192.168.50.114:4000',
  serverUrl: 'https://metamask-sdk-socket.metafi.codefi.network/',
  platform: 'metamask-mobile',
  context: 'mm-mobile',
  sdkRemoteOrigin: 'MMSDKREMOTE::',
  unknownParam: 'UNKNOWN',
};

export const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
  eth_requestAccounts: true,
  eth_sendTransaction: true,
  eth_signTransaction: true,
  eth_sign: true,
  personal_sign: true,
  eth_signTypedData: true,
  eth_signTypedData_v3: true,
  eth_signTypedData_v4: true,
  wallet_watchAsset: true,
  wallet_addEthereumChain: true,
  wallet_switchEthereumChain: true,
};

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

let wentBack = false;

export enum Sources {
  'web-desktop' = 'web-desktop',
  'web-mobile' = 'web-mobile',
  'nodejs' = 'nodejs',
  'unity' = 'unity',
}

const parseSource = (source: string) => {
  if ((Object as any).values(Sources).includes(source)) return source;
  return 'undefined';
};

const waitForKeychainUnlocked = async () => {
  let i = 0;
  const keyringController = (
    Engine.context as { KeyringController: KeyringController }
  ).KeyringController;
  while (!keyringController.isUnlocked()) {
    await new Promise<void>((res) => setTimeout(() => res(), 600));
    if (i++ > 60) break;
  }
};

let rpcQueue: { [id: string]: string } = {};
const waitForEmptyRPCQueue = async () => {
  let i = 0;
  console.debug(
    `waitForEmptyRPCQueue stringify(rpcQueue)`,
    JSON.stringify(rpcQueue, null, 4),
  );
  let queue = Object.keys(rpcQueue);
  console.debug(`waitForEmptyRPCQueue length=${queue.length}`, rpcQueue, queue);
  while (queue.length > 0) {
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    console.debug(
      `waitForEmptyRPCQueue[${i}] length=${queue.length}`,
      rpcQueue,
      queue,
    );
    queue = Object.keys(rpcQueue);
    if (i++ > 30) {
      console.debug(
        `waitForEmptyRPCQueue timing out 30sec length=${queue.length}`,
        rpcQueue,
      );
      break;
    }
  }
};

// const waitForMethod = async (method: string) => {
//   let i = 0;
//   const queue = Object.values(rpcQueue).filter((m) => m === method);
//   console.debug(`waitForMethod length=${queue.length}`, rpcQueue);
//   while (queue.length > 0) {
//     await new Promise<void>((res) => setTimeout(() => res(), 1000));
//     if (i++ > 30) {
//       console.debug(
//         `waitForEmptyRPCQueue timing out 30sec length=${queue.length}`,
//         rpcQueue,
//       );
//       break;
//     }
//   }
// };

export class Connection extends EventEmitter2 {
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
    approveHost,
    getApprovedHosts,
    disapprove,
    revalidate,
    isApproved,
    updateOriginatorInfos,
    onTerminate,
  }: ConnectionProps & {
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
    this.host = `${MM_SDK_REMOTE_ORIGIN}${this.channelId}`;
    this.approveHost = approveHost;
    this.getApprovedHosts = getApprovedHosts;
    this.disapprove = disapprove;
    this.revalidate = revalidate;
    this.isApproved = isApproved;
    this.onTerminate = onTerminate;

    this.setLoading(true);
    this.remote = new RemoteCommunication({
      platform: CONNECTION_CONFIG.platform,
      communicationServerUrl: CONNECTION_CONFIG.serverUrl,
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect,
      context: CONNECTION_CONFIG.context,
      analytics: true,
      logging: {
        eciesLayer: true,
        keyExchangeLayer: true,
        remoteLayer: true,
        serviceLayer: true,
      },
      storage: {
        debug: true,
      },
    });

    this.requestsToRedirect = {};

    this.sendMessage = this.sendMessage.bind(this);

    this.remote.on(EventType.CLIENTS_CONNECTED, () => {
      this.setLoading(true);
    });

    this.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
      this.setLoading(false);
      console.debug(
        `Connection::on::clients_disconnected paused=${this.remote.isPaused()} `,
      );
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
        console.debug(
          `Connection::on::clients_Ready origin=${this.origin} `,
          clientsReadyMsg,
        );

        if (
          !this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
        ) {
          const approvalController = (
            Engine.context as { ApprovalController: ApprovalController }
          ).ApprovalController;

          approvalController.clear(ethErrors.provider.userRejectedRequest());

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
          const hostname = MM_SDK_REMOTE_ORIGIN + this.channelId;
          approveHost({
            host: hostname,
            hostname,
            context: 'clients_ready',
          });
        }

        if (this.isReady) {
          console.debug(
            `Connection::on::clients_Ready received 'clients_ready' when isReady=true --- disable channel approval`,
            this.otps,
          );

          // Re-send otp message in case client didnd't receive disconnection.
          return;
        }

        // clients_ready is sent multple time.
        // The first time it sent without originatorInfo
        const originatorInfo = clientsReadyMsg?.originatorInfo;

        // Make sure we only initialize the bridge when originatorInfo is received.
        if (!originatorInfo) {
          console.debug(
            `Connection::on::clients_Ready invalid originatorInfo -- skip bagroundbridge`,
          );
          return;
        }

        this.originatorInfo = originatorInfo;
        updateOriginatorInfos({ channelId: this.channelId, originatorInfo });
        this.setupBridge(originatorInfo);
        this.isReady = true;
      },
    );

    this.remote.on(
      EventType.MESSAGE,
      async (message: CommunicationLayerMessage) => {
        console.debug(
          `Connection::on 'message' --> this.ready=${this.isReady} method=${message.method}`,
        );

        if (!this.isReady) {
          console.debug(`Connection::on 'message' connection not ready`);
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
          console.debug(`received invalid rpc message`, message);
          return;
        }

        const needsRedirect = METHODS_TO_REDIRECT[message?.method];
        if (needsRedirect) {
          this.requestsToRedirect[message?.id] = true;
        }

        console.debug(
          `debug needsRedirect=${needsRedirect} isResumed=${this.isResumed}`,
        );

        await waitForKeychainUnlocked();

        console.debug(
          `Connection::on 'message' method=${message?.method} needsRedirect=${
            this.requestsToRedirect[message?.id]
          }`,
        );
        // Check if channel is permitted
        try {
          if (needsRedirect) {
            this.setLoading(false);
            // Special case for eth_requestAccount, doens't need to queue because it comes from apporval request.
            console.debug(
              `Adding to rpcQueue id=${message.id} method=${message.method}`,
            );
            rpcQueue[(message.id as string) ?? 'UNK'] = message.method;

            await this.checkPermissions(message);
          } else {
            console.debug(`Allowed method`, message);
          }
        } catch (error) {
          // Approval failed - redirect to app with error.
          console.warn(
            `Permissions failed -- sending error and might redirect.`,
            error,
          );
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

        console.debug(
          `permissions validated - send to json rpc`,
          getApprovedHosts('debug'),
        );

        console.debug(
          `Connection::on message rpcId=${message?.id} method: ${message?.method}`,
        );
        // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
        if (message.method === 'eth_sendTransaction') {
          if (
            !(
              message.params &&
              Array.isArray(message?.params) &&
              message.params.length > 0
            )
          ) {
            console.debug(`invalid message format!`);
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
                  ? MM_SDK_REMOTE_ORIGIN + this.originatorInfo?.url
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
          console.debug(
            `Connection::on message recalling backgroundbrigde`,
            message,
          );
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
    console.debug(
      `SDKConnect::Connection::connect() channel=${this.channelId}`,
    );
    this.remote.connectToChannel(this.channelId, withKeyExchange);
    this.setLoading(true);
    if (withKeyExchange) {
      this.remote.on(EventType.CLIENTS_WAITING, () => {
        // Always disconnect - this should not happen, DAPP should always init the connection.
        // A new channelId should be created after connection is removed.
        // On first launch reconnect is set to false even if there was a previous existing connection in another instance.
        // To avoid hanging on the socket forever, we automatically close it after 5seconds.
        console.debug(`Connection::on received 'clients_waiting' event`);
        console.debug(
          `Connection::on 'clients_waiting' -- disconnect hanging socket`,
        );
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
      console.warn(`backrground bridge already setup`);
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
            current: originatorInfo?.url ?? CONNECTION_CONFIG.unknownParam,
          },
          title: {
            current: originatorInfo?.title ?? CONNECTION_CONFIG.unknownParam,
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
              originatorInfo?.platform ?? CONNECTION_CONFIG.unknownParam,
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
    message: CommunicationLayerMessage,
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

    console.debug(
      `Connection::checkPermissions approved=${approved} ** selectedAddress=${selectedAddress}`,
      message,
    );
    if (approved && selectedAddress) {
      return true;
    }

    const approvalController = (
      Engine.context as { ApprovalController: ApprovalController }
    ).ApprovalController;

    let approvalResult;

    if (this.approvalPromise) {
      console.debug(
        `Connection::checkPermissions approval already pending -- waiting for result origin=${this.origin}`,
      );

      // TODO force display the modal
      // store.dispatch(toggleAccountApprovalModal(true));

      console.debug(
        `Connection::checkPermissions force dispatch account approval modal has been called`,
      );
      // was it called from deeplink?

      // Wait for result and clean the promise afterwards.
      approvalResult = await this.approvalPromise;
      console.debug(
        `Connection::checkPermissions result=${approvalResult}`,
        message,
      );
      this.approvalPromise = undefined;
      return true;
    }

    console.debug(
      `Connection::checkPermissions approved=${approved} ** selectedAddress=${selectedAddress} origin=${this.origin} otps=${this.otps}`,
      this.otps,
    );

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
              this.originatorInfo?.platform ?? CONNECTION_CONFIG.unknownParam,
            ),
          },
        },
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
    console.debug(
      `Connection::sendMessage requestsToRedirect redirect=${needsRedirect} rpcQueue=${rpcQueue.length} msg?.data?.id=${msg?.data?.id}`,
      this.requestsToRedirect,
    );
    this.remote.sendMessage(msg);
    this.setLoading(false);

    if (!needsRedirect) return;

    console.debug(
      `Connection::sendMessage rpcQuee id=${msg?.data?.id}`,
      rpcQueue,
    );
    delete rpcQueue[msg?.data?.id];
    delete this.requestsToRedirect[msg?.data?.id];
    console.debug(
      `Connection::sendMessage after delete id=${msg?.data?.id}`,
      rpcQueue,
    );

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    console.debug(
      `Connection::sendMessage message sent - waiting for minimizer - id=${msg?.data?.id} data=${msg?.data}`,
      rpcQueue,
    );

    waitForEmptyRPCQueue().then(() => {
      if (wentBack) {
        // Skip
        console.debug(
          `Already used Minimizer.goBack() -- nothing to do -- id=${msg?.data?.id}`,
        );
        return;
      }

      wentBack = true;
      console.debug(
        `Start going back -- end of queue -- id=${msg?.data?.id}`,
        rpcQueue,
      );
      setTimeout(() => {
        wentBack = false;
        console.debug(`SDKConnect::sendMessage goBack now()`);
        Minimizer.goBack();
      }, 300);
    });
  }
}

export class SDKConnect extends EventEmitter2 {
  private static instance: SDKConnect;

  private reconnected = false;
  private _initialized = false;
  private timeout?: number;
  private initTimeout?: number;
  private paused = false;
  private appState?: string;
  private connected: ConnectedSessions = {};
  private connections: SDKSessions = {};
  private connecting: { [channelId: string]: boolean } = {};
  private approvedHosts: ApprovedHosts = {};
  private sdkLoadingState: { [channelId: string]: boolean } = {};
  // Contains the list of hosts that have been set to not persist "Do Not Remember" on account approval modal.
  // This should only affect web connection from qr-code.
  private disabledHosts: ApprovedHosts = {};

  private SDKConnect() {
    // Keep empty to manage singleton
  }

  public async connectToChannel({
    id,
    otherPublicKey,
    origin,
  }: ConnectionProps) {
    if (this.paused) {
      console.debug(
        `SDKConnect::connectToChannel -- connection was paused - wait for resume...`,
      );
      return;
    }

    const existingConnection = this.connected[id] !== undefined;
    console.debug(
      `SDKConnect::connectToChannel() existingConnection=${existingConnection} channel=${id}`,
    );
    if (existingConnection) {
      // Was previously started
      this.reconnect({ channelId: id });
      return;
    }

    this.connecting[id] = true;
    this.connections[id] = {
      id,
      otherPublicKey,
      origin,
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
    };
    console.debug(
      `SDKConnect::connectToChannel() id=${id}, origin=${origin}`,
      otherPublicKey,
    );
    const initialConnection = this.approvedHosts[id] === undefined;

    console.debug(
      `SDKConnect::connectToChannel() approvedHosts initialConnection=${initialConnection}`,
      this.approvedHosts,
    );

    this.connected[id] = new Connection({
      ...this.connections[id],
      initialConnection,
      updateOriginatorInfos: this.updateOriginatorInfos.bind(this),
      approveHost: this._approveHost.bind(this),
      disapprove: this.disapproveChannel.bind(this),
      getApprovedHosts: this.getApprovedHosts.bind(this),
      revalidate: this.revalidateChannel.bind(this),
      isApproved: this.isApproved.bind(this),
      onTerminate: ({
        channelId,
        sendTerminate,
      }: {
        channelId: string;
        sendTerminate?: boolean;
      }) => {
        this.removeChannel(channelId, sendTerminate);
      },
    });
    // Make sure to watch event before you connect
    this.watchConnection(this.connected[id]);
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.connections),
    );
    // Initialize connection
    this.connected[id].connect({
      withKeyExchange: true,
    });
    this.emit('refresh');
    this.connecting[id] = false;
  }

  private watchConnection(connection: Connection) {
    connection.remote.on(
      EventType.CONNECTION_STATUS,
      (connectionStatus: ConnectionStatus) => {
        if (connectionStatus === ConnectionStatus.TERMINATED) {
          console.debug(
            `SHOULD DISCONNECT channel=${connection.channelId} HERE`,
          );
          this.removeChannel(connection.channelId);
        }
      },
    );
    connection.on(CONNECTION_LOADING_EVENT, (event: { loading: boolean }) => {
      const channelId = connection.channelId;
      const { loading } = event;
      console.debug(`received event ${loading}`, event);
      this.updateSDKLoadingState({ channelId, loading });
    });
  }

  public updateSDKLoadingState({
    channelId,
    loading,
  }: {
    channelId: string;
    loading: boolean;
  }) {
    if (loading === true) {
      this.sdkLoadingState[channelId] = true;
    } else {
      delete this.sdkLoadingState[channelId];
    }

    const loadingSessions = Object.keys(this.sdkLoadingState).length;
    console.debug(
      `SDKConnect::updateSDKLoadingState loading sessions=${loadingSessions} channelId=${channelId} loading=${loading}`,
    );
    store.dispatch(toggleSDKLoadingModal(loadingSessions > 0));
  }

  public updateOriginatorInfos({
    channelId,
    originatorInfo,
  }: {
    channelId: string;
    originatorInfo: OriginatorInfo;
  }) {
    this.connections[channelId].originatorInfo = originatorInfo;
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.connections),
    );
  }

  public resume({ channelId }: { channelId: string }) {
    console.debug(`SDKConnect::resume() channelId=${channelId}`);
    const session = this.connected[channelId]?.remote;
    if (session && !session?.isConnected()) {
      this.connecting[channelId] = true;
      this.connected[channelId].resume();
      this.connecting[channelId] = false;
    }
    console.debug(`SDKConnected::resume channelId=${channelId} has resumed`);
  }

  async reconnect({ channelId }: { channelId: string }) {
    if (this.paused) {
      console.debug(
        `SDKConnect::reconnect -- connection was paused - wait for resume...`,
      );
      return;
    }

    if (this.connecting[channelId]) {
      console.debug(
        `SDKConnect::reconnect -- connection already in progress...`,
      );
      return;
    }

    if (!this.connections[channelId]) {
      console.debug(`invalid sdk state ${channelId} not found.`);
      return;
    }

    const existingConnection = this.connected[channelId];

    if (existingConnection) {
      const connected = existingConnection?.remote.isConnected();
      const ready = existingConnection?.remote.isReady();
      const keysExchanged =
        !!existingConnection?.remote.getKeyInfo()?.keysExchanged;
      console.debug(
        `SDKConnect::reconnect() existing channel=${channelId} connected=${connected} ready=${ready} keysExchanged=${keysExchanged}`,
      );

      if (ready) {
        console.debug(
          `SDKConnect::reconnect() already ready - interrup reconnect`,
        );
        return;
      }

      if (connected) {
        // When does this happen?
        console.warn(
          `SDKConnect::reconnect() interrupted - already connected.`,
        );
        existingConnection.remote.ping();
        return;
      }

      console.debug(
        `SDKConnect::reconnect() JJJJJJJJJJJJJJJJ invalid connection state`,
      );
    }

    console.debug(
      `SDKConnect::reconnect() Establishing reconnection for ${channelId}`,
    );
    const connection = this.connections[channelId];
    this.connecting[channelId] = true;
    this.connected[channelId] = new Connection({
      ...connection,
      reconnect: true,
      initialConnection: false,
      approveHost: this._approveHost.bind(this),
      disapprove: this.disapproveChannel.bind(this),
      getApprovedHosts: this.getApprovedHosts.bind(this),
      revalidate: this.revalidateChannel.bind(this),
      isApproved: this.isApproved.bind(this),
      updateOriginatorInfos: this.updateOriginatorInfos.bind(this),
      // eslint-disable-next-line @typescript-eslint/no-shadow
      onTerminate: ({ channelId }) => {
        this.removeChannel(channelId);
      },
    });
    this.connected[channelId].connect({
      withKeyExchange: true,
    });
    this.watchConnection(this.connected[channelId]);
    this.emit('refresh');
    this.connecting[channelId] = false;
  }

  async reconnectAll() {
    console.debug(
      `SDKConnect::reconnectAll() this.reconnected=${this.reconnected} this.paused=${this.paused}`,
    );
    if (this.reconnected) {
      console.debug(`SDKConnect::reconnectAll() Already reconnected -- skip`);
      return;
    }

    const channelIds = Object.keys(this.connections);
    channelIds.forEach((channelId) => {
      if (channelId) {
        this.reconnect({ channelId });
      }
    });
    this.reconnected = true;
  }

  setSDKSessions(sdkSessions: SDKSessions) {
    this.connections = sdkSessions;
  }

  public pause() {
    console.debug(`SDKConnect::pause()`);
    if (this.paused) return;

    for (const id in this.connected) {
      this.connected[id].pause();
    }
    this.paused = true;
    this.connecting = {};
    DefaultPreference.set('paused', 'paused');
  }

  /**
   * Invalidate a channel/session by preventing future connection to be established.
   * Instead of removing the channel, it creates sets the session to timeout on next
   * connection which will remove it while conitnuing current session.
   *
   * @param channelId
   */
  public invalidateChannel(channelId: string) {
    const host = MM_SDK_REMOTE_ORIGIN + channelId;
    this.disabledHosts[host] = 0;
  }

  public removeChannel(channelId: string, sendTerminate?: boolean) {
    if (this.connected[channelId]) {
      try {
        this.connected[channelId].removeConnection({
          terminate: sendTerminate ?? false,
        });
      } catch (err) {
        // Ignore error
      }

      console.debug(
        `removing channel ${channelId}`,
        Object.keys(this.connected),
      );
      delete this.connected[channelId];
      delete this.connections[channelId];
      delete this.connecting[channelId];
      delete this.approvedHosts[MM_SDK_REMOTE_ORIGIN + channelId];
      delete this.disabledHosts[MM_SDK_REMOTE_ORIGIN + channelId];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(this.connections),
      );
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(this.approvedHosts),
      );
      this.emit('refresh');
    }
  }

  public async removeAll() {
    console.debug(`SDKConnect::removeAll()`);
    for (const id in this.connections) {
      this.removeChannel(id, true);
    }
    // Also remove approved hosts that may have been skipped.
    this.approvedHosts = {};
    this.connections = {};
    this.connected = {};
    this.connecting = {};
    DefaultPreference.clear(AppConstants.MM_SDK.SDK_CONNECTIONS);
    DefaultPreference.clear(AppConstants.MM_SDK.SDK_APPROVEDHOSTS);
  }

  public getConnected() {
    return this.connected;
  }

  public getConnections() {
    return this.connections;
  }

  public getApprovedHosts(context?: string) {
    console.debug(
      `SDKConnnect::getApprovedHosts() context=${context} `,
      this.approvedHosts,
    );
    return this.approvedHosts || {};
  }

  public disapproveChannel(channelId: string) {
    const hostname = MM_SDK_REMOTE_ORIGIN + channelId;
    console.debug(
      `SDKConnect::disapprove hostname=${hostname}`,
      this.approvedHosts,
    );
    delete this.approvedHosts[hostname];
    this.emit('refresh');
  }

  public async revalidateChannel({ channelId }: { channelId: string }) {
    console.debug(`SDKConnect::revalidateChannel() channelId=${channelId}`);
    const hostname = MM_SDK_REMOTE_ORIGIN + channelId;
    this._approveHost({
      host: hostname,
      hostname,
      context: 'revalidateChannel',
    });
  }

  public isApproved({
    channelId,
    context,
  }: {
    channelId: string;
    context?: string;
  }) {
    const hostname = MM_SDK_REMOTE_ORIGIN + channelId;
    const isApproved = this.approvedHosts[hostname] !== undefined;
    // possible future feature to add multiple approval parameters per channel.
    console.debug(
      `SDKConnect::isApproved approved=${isApproved} context=${context} ${channelId} -> ${hostname}`,
      this.approvedHosts,
    );
    return isApproved;
  }

  private _approveHost({ host, hostname, context }: approveHostProps) {
    console.debug(
      `SDKConnect::_approveHost host=${host} hostname=${hostname} _context=${context}`,
    );
    // Host is approved for 24h.
    this.approvedHosts[host] = Date.now() + DAY_IN_MS;
    if (!this.disabledHosts[host]) {
      console.debug(`SDKConnect::_approveHost prevent disabled hosts`);
      // Prevent disabled hosts from being persisted.
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(this.approvedHosts),
      );
    }
    this.emit('refresh');
  }

  private _handleAppState(appState: string) {
    console.debug(
      `SDKConnect::handleAppState() state has changed appState=${appState}`,
    );
    this.appState = appState;
    if (appState === 'active') {
      // Reset wentBack state
      wentBack = false;
      if (Device.isAndroid()) {
        if (this.timeout) BackgroundTimer.clearInterval(this.timeout);
      } else if (this.timeout) clearTimeout(this.timeout);

      if (this.paused) {
        this.reconnected = false;
        for (const id in this.connected) {
          console.debug(`SDKConnect::handleAppState trying to resume app`);
          this.resume({ channelId: id });
        }
      }
      this.paused = false;
    } else if (appState === 'background') {
      // Reset wentBack state
      wentBack = false;
      // Cancel rpc queue anytime app is backgrounded
      rpcQueue = {};
      if (!this.paused) {
        /**
         * Pause connections after 20 seconds of the app being in background to respect device resources.
         * Also, OS closes the app if after 30 seconds, the connections are still open.
         */
        if (Device.isIos()) {
          BackgroundTimer.start();
          this.timeout = setTimeout(() => {
            console.debug(
              `SDKConnect::handleAppState::ios -- timeout reached -- calling this.pause()`,
            );
            this.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS) as unknown as number;
          BackgroundTimer.stop();
        } else if (Device.isAndroid()) {
          this.timeout = BackgroundTimer.setTimeout(() => {
            console.debug(
              `SDKConnect::handleAppState::android -- timeout reached -- calling this.pause()`,
            );
            this.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS);
          // TODO manage interval clearTimeout
        }
      }
    }
  }

  public async unmount() {
    console.debug(`SDKConnect::unmount()`);
    AppState.removeEventListener('change', this._handleAppState.bind(this));
    for (const id in this.connected) {
      this.connected[id].disconnect({ terminate: false });
    }
    if (this.timeout) clearTimeout(this.timeout);
    if (this.initTimeout) clearTimeout(this.initTimeout);
  }

  getSessionsStorage() {
    return this.connections;
  }

  public async init() {
    if (this._initialized) {
      console.debug(`SDKConnect::init already initialized.`);
      return;
    }

    this.connecting = {};

    AppState.removeEventListener('change', this._handleAppState.bind(this));
    AppState.addEventListener('change', this._handleAppState.bind(this));

    const [connectionsStorage, hostsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
      DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
    ]);

    if (connectionsStorage) {
      this.connections = JSON.parse(connectionsStorage);
    }

    if (hostsStorage) {
      const uncheckedHosts = JSON.parse(hostsStorage) as ApprovedHosts;
      // Check if the approved hosts haven't timed out.
      const approvedHosts: ApprovedHosts = {};
      let expiredCounter = 0;
      for (const host in uncheckedHosts) {
        const expirationTime = uncheckedHosts[host];
        if (Date.now() < expirationTime) {
          // Host is valid, add it to the list.
          approvedHosts[host] = expirationTime;
        } else {
          expiredCounter += 1;
        }
      }
      if (expiredCounter > 1) {
        // Update the list of approved hosts excluding the expired ones.
        DefaultPreference.set(
          AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
          JSON.stringify(approvedHosts),
        );
      }
      this.approvedHosts = approvedHosts;
    }

    // this.initTimeout = setTimeout(() => {
    // Need to use a timeout to avoid race condition of double reconnection
    // - reconnecting from deeplink and reconnecting from being back in foreground.
    // We prioritize the deeplink and thus use the delay on foregroun.
    console.debug(
      `SDKConnect::init reconnect this.paused=${this.paused}`,
      JSON.stringify(this.connections, null, 4),
    );

    if (!this.paused) {
      this.reconnectAll();
    }

    this._initialized = true;
  }

  public static getInstance(): SDKConnect {
    if (!SDKConnect.instance) {
      SDKConnect.instance = new SDKConnect();
    }
    return SDKConnect.instance;
  }
}

export default SDKConnect;
