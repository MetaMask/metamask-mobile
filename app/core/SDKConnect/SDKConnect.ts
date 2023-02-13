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
import AppConstants from '../AppConstants';
import DefaultPreference from 'react-native-default-preference';

import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';
import { AppState } from 'react-native';
import Minimizer from 'react-native-minimizer';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';

import { KeyringController } from '@metamask/keyring-controller';
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

export const MIN_IN_MS = 1000 * 60;
export const HOUR_IN_MS = MIN_IN_MS * 60;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const DEFAULT_SESSION_TIMEOUT_MS = 7 * DAY_IN_MS;

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
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
  [host: string]: string;
}

export interface approveHostProps {
  host: string;
  hostname: string;
}

export const TIMEOUT_PAUSE_CONNECTIONS = 20000;

export type SDKEventListener = (event: string) => void;

export const MM_SDK_REMOTE_ORIGIN = 'MMSDKREMOTE::';

export const CONNECTION_CONFIG = {
  serverUrl: 'http://192.168.50.114:4000',
  // serverUrl: 'https://6831-1-36-226-145.ap.ngrok.io',
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
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    if (i++ > 60) break;
  }
};

export class Connection {
  channelId;
  remote: RemoteCommunication;
  requestsToRedirect: { [request: string]: boolean } = {};
  origin: string;
  host: string;
  originatorInfo?: OriginatorInfo;
  isReady = false;
  backgroundBridge?: BackgroundBridge;

  approveHost: ({ host, hostname }: approveHostProps) => void;
  getApprovedHosts: (context: string) => ApprovedHosts;
  disapprove: (channelId: string) => void;
  revalidate: ({ channelId }: { channelId: string }) => void;
  isApproved: ({ channelId }: { channelId: string }) => boolean;
  onTerminate: ({ channelId }: { channelId: string }) => void;

  constructor({
    id,
    otherPublicKey,
    origin,
    reconnect,
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
    this.origin = origin;
    this.channelId = id;
    this.host = `${MM_SDK_REMOTE_ORIGIN}${this.channelId}`;
    this.approveHost = approveHost;
    this.getApprovedHosts = getApprovedHosts;
    this.disapprove = disapprove;
    this.revalidate = revalidate;
    this.isApproved = isApproved;
    this.onTerminate = onTerminate;

    this.remote = new RemoteCommunication({
      platform: CONNECTION_CONFIG.platform,
      communicationServerUrl: CONNECTION_CONFIG.serverUrl,
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect: true,
      context: CONNECTION_CONFIG.context,
      analytics: true,
      logging: {
        eciesLayer: true,
        keyExchangeLayer: true,
        remoteLayer: true,
        serviceLayer: true,
      },
      storage: {
        debug: false,
      },
    });

    this.requestsToRedirect = {};

    this.sendMessage = this.sendMessage.bind(this);

    this.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
      Logger.log(`Connection::on::clients_disconnected `);
      // Disapprove a given host everytime there is a disconnection to prevent hijacking.
      disapprove(this.channelId);
    });

    if (reconnect) {
      this.remote.on(EventType.CLIENTS_WAITING, () => {
        // Always disconnect - this should not happen, DAPP should always init the connection.
        // A new channelId should be created after connection is removed.
        Logger.log(`Connection::on 'clients_waiting' removing connection`);
        this.removeConnection();
      });
    }

    this.remote.on(
      EventType.CLIENTS_READY,
      async (clientsReadyMsg: { originatorInfo: OriginatorInfo }) => {
        Logger.log(`Connection::on::clients_Ready QWERTYYYY `, clientsReadyMsg);

        if (this.isReady) {
          Logger.log(
            `Connection::on::clients_Ready received 'clients_ready' when isReady=true --- disable channel approval`,
          );

          disapprove(this.channelId);
          await this.checkPermissions();
          return;
        }

        // clients_ready is sent multple time.
        // The first time it sent without originatorInfo
        const originatorInfo = clientsReadyMsg?.originatorInfo;

        // Make sure we only initialize the bridge when originatorInfo is received.
        if (!originatorInfo) {
          Logger.log(
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
        Logger.log(`Connection::on 'message' --> this.ready=${this.isReady}`);
        if (!this.isReady) {
          Logger.log(`Connection::on 'message' connection not ready`);
          return;
        }

        // ignore anything other than RPC methods.
        if (!message.method || !message.id) {
          Logger.log(`received invalid rpc message`, message);
          return;
        }

        // handle termination message
        if (message.type === MessageType.TERMINATE) {
          // Delete connection from storage
          this.onTerminate({ channelId: this.channelId });
          return;
        }

        await waitForKeychainUnlocked();

        // Check if permissions required
        await this.checkPermissions();

        if (METHODS_TO_REDIRECT[message?.method]) {
          this.requestsToRedirect[message?.id] = true;
        }

        Logger.log(
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
            Logger.log(`invalid message format!`);
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

        Logger.log(`Connection::on message recalling backgroundbrigde`);
        this.backgroundBridge?.onMessage({
          name: 'metamask-provider',
          data: message,
          origin: 'sdk',
        });
      },
    );

    this.remote.connectToChannel(id);
  }

  private setupBridge(originatorInfo: OriginatorInfo) {
    Logger.log(
      `Connection::setupBridge initialize BackgroundBridge`,
      originatorInfo,
    );
    if (this.backgroundBridge) {
      console.warn(`backrground bridge already setup`);
      return;
    }
    this.backgroundBridge = new BackgroundBridge({
      webview: null,
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
          navigation: null, //props.navigation,
          getApprovedHosts: () => this.getApprovedHosts('rpcMethodMiddleWare'),
          setApprovedHosts: () => null,
          approveHost: (approveHostname) =>
            this.approveHost({
              host: this.host,
              hostname: approveHostname,
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

  private async checkPermissions() {
    // only ask approval if needed
    const approved = this.isApproved({ channelId: this.channelId });
    if (approved) {
      return;
    }

    // const approvalController = (
    //   Engine.context as { ApprovalController: ApprovalController }
    // ).ApprovalController;
    // // Request new otp
    // // TODO check if an approval is already in progress or add it.
    // const type = ApprovalTypes.CONNECT_ACCOUNTS;
    // if (approvalController.has({ origin: this.host, type })) {
    //   // Request already pending, nothing todo.
    //   Logger.log(`Approval request already pending.`);
    //   // Clear prev requests.
    //   await approvalController.clear(ethErrors.provider.userRejectedRequest());
    //   return;
    // }

    // // Need to update the preference controller as well.
    // Logger.log(`OOOOOOOOO\n\n`);
    // // Prevent future requests until channel is manually approved or via deeplink.
    // this.disapprove(this.channelId);

    // let approvalResult;
    // try {
    //   const approvalId = random();
    //   approvalResult = await approvalController.add({
    //     origin: this.host,
    //     type,
    //     requestData: {
    //       hostname: this.originatorInfo?.title ?? '',
    //       pageMeta: {
    //         url: this.originatorInfo?.url ?? '',
    //         title: this.originatorInfo?.title ?? '',
    //         icon: '',
    //         analytics: {
    //           request_source: AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN,
    //           request_platform: parseSource(
    //             this.originatorInfo?.platform ?? CONNECTION_CONFIG.unknownParam,
    //           ),
    //         },
    //       },
    //     },
    //     id: approvalId,
    //   });

    //   this.revalidate({ channelId: this.channelId });
    // } catch (err) {
    //   // rejected approval
    // }
    // // Clear requests
    // // approvalController.

    // const preferencesController = (
    //   Engine.context as { PreferencesController: PreferencesController }
    // ).PreferencesController;
    // preferencesController.state.selectedAddress;

    // Logger.log(`approval_result`, approvalResult);
  }

  pause() {
    this.remote.pause();
  }

  resume() {
    this.remote.resume();
  }

  disconnect({ terminate }: { terminate: boolean }) {
    if (terminate) {
      this.remote.sendMessage({ type: MessageType.TERMINATE });
    }
    this.remote.disconnect();
  }

  removeConnection() {
    this.isReady = false;
    this.disconnect({ terminate: true });
    this.backgroundBridge?.onDisconnect();
  }

  sendMessage(msg: any) {
    Logger.log(
      `Connection::sendMessage requestsToRedirect`,
      this.requestsToRedirect,
    );
    this.remote.sendMessage(msg);
    if (!this.requestsToRedirect[msg?.data?.id]) return;
    delete this.requestsToRedirect[msg?.data?.id];

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    setTimeout(() => {
      if (!Object.keys(this.requestsToRedirect).length) Minimizer.goBack();
    }, 500);
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
  /**
   * Flag to detect if the app has already been active.
   * Useful to detect if it was previously killed or sent to sleep from background task.
   */
  private wasActive = false;
  private connected: ConnectedSessions = {};
  private connections: SDKSessions = {};
  private approvedHosts: ApprovedHosts = {};
  // Contains the list of hosts that have been temporarily disabled because of a re-connection.
  // This is a security measure to prevent session hi-jacking.
  private disabledHosts: ApprovedHosts = {};

  private SDKConnect() {
    // Keep empty to manage singleton
  }

  public async connectToChannel({
    id,
    otherPublicKey,
    origin,
  }: ConnectionProps) {
    // Skip if already connected
    if (this.connections[id]) {
      Logger.log(
        `SDKConnect::connectToChannel() id=${id} -- skip already connecting/connected.`,
      );
      return;
    }

    // Adding a connecting check because connectToChannel can be doubled called from deeplink.
    // The second calls happen before SDK.connected[id] is set and thus creating double connection.
    this.connections[id] = {
      id,
      otherPublicKey,
      origin,
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
    };
    Logger.log(
      `SDKConnect::connectToChannel() id=${id}, origin=${origin}`,
      otherPublicKey,
    );
    this.connected[id] = new Connection({
      ...this.connections[id],
      updateOriginatorInfos: this.updateOriginatorInfos.bind(this),
      approveHost: this._approveHost.bind(this),
      disapprove: this.disapprove.bind(this),
      getApprovedHosts: this.getApprovedHosts.bind(this),
      revalidate: this.revalidateChannel.bind(this),
      isApproved: this.isApproved.bind(this),
      onTerminate: ({ channelId }) => {
        this.removeChannel(channelId);
      },
    });
    this.watchConnection(this.connected[id]);
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.connections),
    );
    this.emit('refresh');
  }

  private watchConnection(connection: Connection) {
    connection.remote.on(
      EventType.CONNECTION_STATUS,
      (connectionStatus: ConnectionStatus) => {
        if (connectionStatus === ConnectionStatus.TERMINATED) {
          Logger.log(`SHOULD DISCONNECT channel=${connection.channelId} HERE`);
          this.removeChannel(connection.channelId);
        }
      },
    );
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
    Logger.log(`SDKConnect::resume() channelId=${channelId}`);
    if (this.connected[channelId]) {
      this.connected[channelId].resume();
    }
  }

  async reconnect({ channelId }: { channelId: string }) {
    if (!this.connected) {
      Logger.log(
        `JJJJJJJJJJJJJJJJJJJJJJJJJJ invalid sdk state ${channelId} not found.`,
      );
      return;
    }
    const existingConnection = this.connected[channelId];
    if (existingConnection?.remote.isReady()) {
      Logger.log(`this::reconnect() interrupted - already connected.`);
      return;
    }

    const connection = this.connections[channelId];

    this.connected[channelId] = new Connection({
      ...connection,
      reconnect: this.wasActive,
      approveHost: this._approveHost.bind(this),
      disapprove: this.disapprove.bind(this),
      getApprovedHosts: this.getApprovedHosts.bind(this),
      revalidate: this.revalidateChannel.bind(this),
      isApproved: this.isApproved.bind(this),
      updateOriginatorInfos: this.updateOriginatorInfos.bind(this),
      // eslint-disable-next-line @typescript-eslint/no-shadow
      onTerminate: ({ channelId }) => {
        this.removeChannel(channelId);
      },
    });
    this.watchConnection(this.connected[channelId]);
    this.emit('refresh');
  }

  async reconnectAll() {
    Logger.log(
      `SDKConnect::reconnect() this.reconnected=${this.reconnected}`,
      JSON.stringify(this.connections, null, 4),
    );
    if (this.reconnected) return;

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
    Logger.log(`SDKConnect::pause()`);
    if (this.paused) return;

    for (const id in this.connected) {
      this.connected[id].pause();
    }
    this.paused = true;
  }

  public removeChannel(channelId: string) {
    if (this.connected[channelId]) {
      this.connected[channelId].removeConnection();
      delete this.connected[channelId];
      delete this.connections[channelId];
      delete this.approvedHosts[MM_SDK_REMOTE_ORIGIN + channelId];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(this.connections),
      );
      this.emit('refresh');
    }
  }

  public removeAll() {
    Logger.log(`SDKConnect::removeAll()`);
    for (const id in this.connections) {
      this.removeChannel(id);
    }
    // Also remove approved hosts that may have been skipped.
    this.approvedHosts = {};
    this.connections = {};
    this.connected = {};
    DefaultPreference.clear(AppConstants.MM_SDK.SDK_CONNECTIONS);
  }

  public getConnected() {
    return this.connected;
  }

  public getConnections() {
    return this.connections;
  }

  public getApprovedHosts(context?: string) {
    Logger.log(`SDKConnnect::getApprovedHosts() context=${context} `);
    return this.approvedHosts || {};
  }

  public disapprove(channelId: string) {
    const hostname = MM_SDK_REMOTE_ORIGIN + channelId;
    Logger.log(
      `SDKConnect::disapprove hostname=${hostname}`,
      this.approvedHosts,
    );
    delete this.approvedHosts[hostname];
    this.emit('refresh');
  }

  public async revalidateChannel({ channelId }: { channelId: string }) {
    Logger.log(`SDKConnect::revalidateChannel() channelId=${channelId}`);
    const hostname = MM_SDK_REMOTE_ORIGIN + channelId;
    // if (this.disabledHosts[hostname]) {
    this._approveHost({ host: hostname, hostname });
    // this.connected[channelId]?.resume();
    // } else {
    //   // this is not supposed to happen
    //   Logger.log(`SDKConnect::revalidateChannel invalid channel ${channelId}`);
    // }
    this.emit('refresh');
  }

  public isApproved({ channelId }: { channelId: string }) {
    const hostname = MM_SDK_REMOTE_ORIGIN + channelId;
    const isApproved = this.approvedHosts[hostname] !== undefined;
    // possible future feature to add multiple approval parameters per channel.
    Logger.log(
      `SDKConnect::isApproved approved=${isApproved} ${channelId} -> ${hostname}`,
    );
    return isApproved;
  }

  private _approveHost({ host, hostname }: approveHostProps) {
    Logger.log(`SDKConnect::_approveHost host=${host} hostname=${hostname}`);
    this.approvedHosts[host] = hostname;
  }

  private _handleAppState(appState: string) {
    Logger.log(
      `SDKConnect::handleAppState() state has changed appState=${appState}`,
    );
    this.appState = appState;
    if (appState === 'active') {
      if (Device.isAndroid()) {
        if (this.timeout) BackgroundTimer.clearInterval(this.timeout);
      } else if (this.timeout) clearTimeout(this.timeout);

      if (this.paused) {
        this.reconnected = false;
        this.paused = false;
        for (const id in this.connected) {
          Logger.log(`SDKConnect::handleAppState resuming ${id}`);
          this.connected[id].resume();
        }
      }
    } else if (appState === 'background') {
      this.wasActive = true;
      if (!this.paused) {
        /**
         * Pause connections after 20 seconds of the app being in background to respect device resources.
         * Also, OS closes the app if after 30 seconds, the connections are still open.
         */
        if (Device.isIos()) {
          BackgroundTimer.start();
          this.timeout = setTimeout(() => {
            Logger.log(
              `SDKConnect::handleAppState::ios -- timeout reached -- calling this.pause()`,
            );
            this.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS) as unknown as number;
          BackgroundTimer.stop();
        } else if (Device.isAndroid()) {
          this.timeout = BackgroundTimer.setTimeout(() => {
            Logger.log(
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
    Logger.log(`SDKConnect::unmount()`);
    AppState.removeEventListener('change', this._handleAppState.bind(this));
    // Disconnect all connections - especially useful during dev otherwise rooms gets full.
    this.pause();
    if (this.timeout) clearTimeout(this.timeout);
    if (this.initTimeout) clearTimeout(this.initTimeout);
  }

  getSessionsStorage() {
    return this.connections;
  }

  public async init() {
    if (this._initialized) {
      Logger.log(`SDKConnect::init already initialized.`);
      return;
    }

    AppState.removeEventListener('change', this._handleAppState.bind(this));
    AppState.addEventListener('change', this._handleAppState.bind(this));

    const [connectionsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
    ]);

    if (connectionsStorage) {
      this.connections = JSON.parse(connectionsStorage);
    }

    // this.initTimeout = setTimeout(() => {
    // Need to use a timeout to avoid race condition of double reconnection
    // - reconnecting from deeplink and reconnecting from being back in foreground.
    // We prioritize the deeplink and thus use the delay on foregroun.
    Logger.log(`SDKConnect::init reconnect`, this.connections);
    this.reconnectAll();
    // }, 1000) as unknown as number;

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
