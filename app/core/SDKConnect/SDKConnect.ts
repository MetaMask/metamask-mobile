import {
  CommunicationLayerMessage,
  CommunicationLayerPreference,
  ConnectionStatus,
  MessageType,
  OriginatorInfo,
  RemoteCommunication,
  ServiceStatus,
} from '@metamask/sdk-communication-layer';
import BackgroundTimer from 'react-native-background-timer';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../AppConstants';

import { WalletDevice } from '@metamask/transaction-controller';
import { AppState } from 'react-native';
import Minimizer from 'react-native-minimizer';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';

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

export interface SDKSessions {
  [id: string]: ConnectionProps;
}
export interface ConnectedSessions {
  [id: string]: Connection;
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

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
}

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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { KeyringController } = Engine.context;
  while (!KeyringController.isUnlocked()) {
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    if (i++ > 60) break;
  }
};

export class Connection extends EventEmitter2 {
  channelId;
  remote: RemoteCommunication;
  requestsToRedirect: { [request: string]: boolean } = {};
  origin: string;
  host: string;
  originatorInfo?: OriginatorInfo;
  isReady = false;
  backgroundBridge?: BackgroundBridge;

  constructor({
    id,
    otherPublicKey,
    origin,
    reconnect,
    approveHost,
    approvedHosts,
  }: ConnectionProps & {
    approveHost: ({ host, hostname }: approveHostProps) => void;
    approvedHosts: ApprovedHosts;
  }) {
    super();

    this.origin = origin;
    this.channelId = id;
    this.host = `${MM_SDK_REMOTE_ORIGIN}${this.channelId}`;

    this.remote = new RemoteCommunication({
      platform: CONNECTION_CONFIG.platform,
      communicationServerUrl: CONNECTION_CONFIG.serverUrl,
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect: true,
      context: CONNECTION_CONFIG.context,
      analytics: true,
      developerMode: true,
      storage: {
        debug: true,
      },
    });

    this.requestsToRedirect = {};

    this.sendMessage = this.sendMessage.bind(this);

    this.remote.on('clients_disconnected', () => {
      Logger.log(`Connection::on::clients_disconnected `);
    });

    if (reconnect) {
      this.remote.on('clients_waiting_to_join', () => {
        // Always disconnect - this should not happen, DAPP should always init the connection.
        // A new channelId should be created after connection is removed.
        Logger.log(
          `Connection::on 'clients_waiting_to_join' removing connection`,
        );
        this.removeConnection();
      });
    }

    this.remote.on(
      MessageType.CLIENTS_READY,
      (clientsReadyMsg: { originatorInfo: OriginatorInfo }) => {
        Logger.log(
          `Connection::on::cliensts_ready this.isReady=${this.isReady}`,
          clientsReadyMsg,
        );
        if (this.isReady) {
          Logger.log(
            `Connection skip 'clients_ready' -- connection already ready!`,
          );
          return;
        }

        const originatorInfo = clientsReadyMsg?.originatorInfo;
        this.originatorInfo = originatorInfo;
        Logger.log(
          `Connection::on::clients_Ready initialize BackgroundBridge`,
          originatorInfo,
        );

        Logger.log(`Connection::on clients_ready setting up background bridge`);
        this.backgroundBridge = new BackgroundBridge({
          webview: null,
          url: originatorInfo?.url,
          isRemoteConn: true,
          sendMessage: this.sendMessage,
          getApprovedHosts: () => approvedHosts,
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
              getApprovedHosts: () => approvedHosts,
              setApprovedHosts: () => null,
              approveHost: (approveHostname) =>
                approveHost({ host: this.host, hostname: approveHostname }),
              // Website info
              url: {
                current: originatorInfo?.url ?? CONNECTION_CONFIG.unknownParam,
              },
              title: {
                current:
                  originatorInfo?.title ?? CONNECTION_CONFIG.unknownParam,
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

        this.isReady = true;

        this.remote.on(
          MessageType.MESSAGE,
          async (message: CommunicationLayerMessage) => {
            Logger.log(
              `Connection::on 'message' --> this.ready=${this.isReady}`,
            );
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
              return;
            }

            await waitForKeychainUnlocked();

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

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              const { TransactionController } = Engine.context;
              try {
                const hash = await (
                  await TransactionController.addTransaction(
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

            this.backgroundBridge?.onMessage({
              name: 'metamask-provider',
              data: message,
              origin: 'sdk',
            });
          },
        );
      },
    );

    this.remote.on('conncection_status', (status: ConnectionStatus) => {
      Logger.log(`Connection::on::conncection_status ${status} `);
    });

    this.remote.connectToChannel(id);
  }

  pause() {
    this.remote.pause();
  }

  resume() {
    this.remote.resume();
  }

  disconnect() {
    this.remote.disconnect();
  }

  removeConnection() {
    this.isReady = false;
    this.disconnect();
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

export class SDKConnect {
  private static reconnected: boolean;
  private static timeout?: number;
  private static paused: boolean;
  private static appState?: string;

  // TODO better use an external storage layer
  private static connections: SDKSessions = {};
  private static connected: ConnectedSessions = {};
  public static approvedHosts: ApprovedHosts = {};

  private static sdkEventListeners: SDKEventListener[] = [];

  private SDKConnect() {
    // Don't instanciate, static class to group sdk static actions together
  }

  static async connectToChannel({
    id,
    otherPublicKey,
    origin,
  }: ConnectionProps) {
    Logger.log(
      `SDKConnect::connectToChannel() id=${id}, origin=${origin}`,
      otherPublicKey,
    );
    SDKConnect.connected[id] = new Connection({
      id,
      otherPublicKey,
      origin,
      approveHost: SDKConnect._approveHost,
      approvedHosts: SDKConnect.approvedHosts,
    });
    SDKConnect.connections[id] = { id, otherPublicKey, origin };
    this.watchConnection(SDKConnect.connected[id]);
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(SDKConnect.connections),
    );
  }

  private static watchConnection(connection: Connection) {
    connection.remote.on(
      MessageType.CONNECTION_STATUS,
      (connectionStatus: ConnectionStatus) => {
        if (connectionStatus === ConnectionStatus.TERMINATED) {
          Logger.log(`SHOULD DISCONNECT channel=${connection.channelId} HERE`);
          SDKConnect.removeChannel(connection.channelId);
        }
      },
    );
  }

  static async reconnect({ channelId }: { channelId: string }) {
    const connection = SDKConnect.connections[channelId];
    if (!connection) {
      Logger.log(`invalid channel ${channelId}`);
      return;
    }
    Logger.log(`SDKConnect::reconnect() channelId=${channelId}`, connection);
    SDKConnect.connected[channelId] = new Connection({
      ...connection,
      reconnect: true,
      approveHost: SDKConnect._approveHost,
      approvedHosts: SDKConnect.approvedHosts,
    });
    this.watchConnection(SDKConnect.connected[channelId]);
  }

  static async reconnectAll() {
    Logger.log(
      `SDKConnect::reconnect() SDKConnect.reconnected=${SDKConnect.reconnected}`,
    );
    if (SDKConnect.reconnected) return;

    const [connectionsStorage, approvedHostsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
      DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
    ]);

    if (connectionsStorage) {
      SDKConnect.connections = JSON.parse(connectionsStorage);
    }

    if (approvedHostsStorage) {
      SDKConnect.approvedHosts = JSON.parse(approvedHostsStorage);
    }

    for (const id in SDKConnect.connections) {
      SDKConnect.reconnect({ channelId: id });
    }
    SDKConnect.reconnected = true;
  }

  //FIXME replace with a hook methods
  static registerEventListener(listener: SDKEventListener) {
    //TODO remove after debugging session persistence, refactor with a hook
    SDKConnect.sdkEventListeners.push(listener);
  }

  private static emit(eventName: string) {
    Logger.log(`SDKConnect::emit() event ${eventName}`);
    SDKConnect.sdkEventListeners.forEach((listener) => {
      listener(eventName);
    });
  }

  static pause() {
    Logger.log(`SDKConnect::pause()`);
    if (SDKConnect.paused) return;

    for (const id in SDKConnect.connected) {
      SDKConnect.connected[id].pause();
    }
    SDKConnect.paused = true;
  }

  static removeChannel(channelId: string) {
    if (SDKConnect.connected[channelId]) {
      SDKConnect.connected[channelId].removeConnection();
      delete SDKConnect.connected[channelId];
      delete SDKConnect.connections[channelId];
      // TODO update
      // delete SDKConnect.approvedHosts[this.host];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(SDKConnect.approvedHosts),
      );
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(SDKConnect.connections),
      );
      SDKConnect.emit('disconnect');
    }
  }

  static removeAll() {
    Logger.log(`SDKConnect::removeAll()`);
    for (const id in SDKConnect.connected) {
      SDKConnect.removeChannel(id);
    }
    SDKConnect.emit('removeAll');
  }

  static getConnections() {
    return SDKConnect.connections;
  }

  static getConnected() {
    return SDKConnect.connected;
  }

  private static _handleAppState(appState: string) {
    Logger.log(
      `SDKConnect::handleAppState() state has changed paused=${SDKConnect.paused}`,
      appState,
    );
    SDKConnect.appState = appState;
    if (appState === 'active') {
      if (Device.isAndroid()) {
        if (SDKConnect.timeout)
          BackgroundTimer.clearInterval(SDKConnect.timeout);
      } else if (SDKConnect.timeout) clearTimeout(SDKConnect.timeout);

      if (SDKConnect.paused) {
        SDKConnect.reconnected = false;
        SDKConnect.paused = false;
        for (const id in SDKConnect.connected) {
          SDKConnect.connected[id].resume();
        }
      }
    } else if (appState === 'background' && !SDKConnect.paused) {
      /**
       * Pause connections after 20 seconds of the app being in background to respect device resources.
       * Also, OS closes the app if after 30 seconds, the connections are still open.
       */
      if (Device.isIos()) {
        BackgroundTimer.start();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        SDKConnect.timeout = setTimeout(() => {
          Logger.log(
            `SDKConnect::handleAppState::ios -- timeout reached -- calling this.pause()`,
          );
          SDKConnect.pause();
        }, TIMEOUT_PAUSE_CONNECTIONS);
        BackgroundTimer.stop();
      } else if (Device.isAndroid()) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        SDKConnect.timeout = BackgroundTimer.setTimeout(() => {
          Logger.log(
            `SDKConnect::handleAppState::android -- timeout reached -- calling this.pause()`,
          );
          SDKConnect.pause();
        }, TIMEOUT_PAUSE_CONNECTIONS);
        // TODO manage interval clearTimeout
      }
    }
  }

  private static _approveHost({ host, hostname }: approveHostProps) {
    SDKConnect.approvedHosts[host] = hostname;

    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(SDKConnect.approvedHosts),
    );
  }

  static async init() {
    Logger.log(`SDKConnect::init set listeners and reconnect`);
    AppState.removeEventListener('change', SDKConnect._handleAppState);
    AppState.addEventListener('change', SDKConnect._handleAppState);
    SDKConnect.reconnectAll();
  }
}

export default SDKConnect;
