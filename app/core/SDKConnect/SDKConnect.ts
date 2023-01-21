import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import {
  RemoteCommunication,
  ConnectionStatus,
  KeyInfo,
  MessageType,
  OriginatorInfo,
  CommunicationLayerPreference,
  CommunicationLayerMessage,
} from '@metamask/sdk-communication-layer';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';
import AppConstants from '../AppConstants';
import Minimizer from 'react-native-minimizer';
import BackgroundTimer from 'react-native-background-timer';
import Engine from '../Engine';
import { WalletDevice } from '@metamask/transaction-controller';
import DefaultPreference from 'react-native-default-preference';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from 'react-native-webrtc';
import { AppState } from 'react-native';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import { EventEmitter2 } from 'eventemitter2';

export const MM_SDK_REMOTE_ORIGIN = 'MMSDKREMOTE::';

const TIMEOUT_PAUSE_CONNECTIONS = 20000;

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
const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
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

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
}

export interface SDKSessions {
  [id: string]: ConnectionProps;
}
export interface ConnectedSessions {
  [id: string]: Connection;
}

export interface ApprovedHosts {
  [host: string]: string;
}

export enum Sources {
  'web-desktop' = 'web-desktop',
  'web-mobile' = 'web-mobile',
  'nodejs' = 'nodejs',
  'unity' = 'unity',
}

export type SDKEventListener = (event: string) => void;

let connections: { [id: string]: ConnectionProps } = {};
const connected: { [id: string]: Connection } = {};

// Temporary hosts for now, persistance will be worked on for future versions
let approvedHosts: { [host: string]: string } = {};

const approveHost = ({
  host,
  hostname,
}: {
  host: string;
  hostname: string;
}) => {
  approvedHosts[host] = hostname;

  DefaultPreference.set(
    AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
    JSON.stringify(approvedHosts),
  );
};

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

  constructor({ id, otherPublicKey, origin, reconnect }: ConnectionProps) {
    super();
    this.origin = origin;
    this.channelId = id;
    this.host = `${MM_SDK_REMOTE_ORIGIN}${this.channelId}`;

    this.remote = new RemoteCommunication({
      platform: 'metamask-mobile',
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      communicationServerUrl: 'https://af75-1-36-226-145.ap.ngrok.io',
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect,
      context: 'metamask-mobile',
      enableDebug: true,
      ecies: {
        enabled: true,
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
      'clients_ready',
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
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
            getProviderState: any;
          }) =>
            getRpcMethodMiddleware({
              hostname: this.host,
              getProviderState,
              navigation: null, //props.navigation,
              getApprovedHosts: () => approvedHosts,
              setApprovedHosts: () => null,
              approveHost: (hostname) =>
                approveHost({ host: this.host, hostname }), //props.approveHost,
              // Website info
              url: { current: originatorInfo?.url },
              title: { current: originatorInfo?.title },
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
                platform: parseSource(originatorInfo?.platform),
              },
              toggleUrlModal: () => null,
              injectHomePageScripts: () => null,
            }),
          isMainFrame: true,
        });

        this.isReady = true;
      },
    );

    this.remote.on('message', async (message: CommunicationLayerMessage) => {
      Logger.log(
        `Connection::on 'message' --> this.ready=${this.isReady}`,
        message,
      );
      if (!this.isReady) {
        Logger.log(`Connection::on 'message' connection not ready`);
        return;
      }

      // ignore anything other than RPC methods.
      if (!message.method || !message.id) {
        Logger.log(`received invalid rpc message`);
        return;
      }

      await waitForKeychainUnlocked();

      if (METHODS_TO_REDIRECT[message?.method]) {
        this.requestsToRedirect[message?.id] = true;
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
    delete connected[this.channelId];
    this.backgroundBridge?.onDisconnect?.();
    delete connections[this.channelId];
    delete approvedHosts[this.host];
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(approvedHosts),
    );
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(connections),
    );
  }

  sendMessage(msg: any) {
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
    connected[id] = new Connection({
      id,
      otherPublicKey,
      origin,
      // approveHost,
      // approvedHosts: SDKConnect.approvedHosts,
    });
    connections[id] = { id, otherPublicKey, origin };
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(connections),
    );
    connected[id].on(
      MessageType.CONNECTION_STATUS,
      (connectionStatus: ConnectionStatus) => {
        this._connectionStatusHandler({ channelId: id, connectionStatus });
      },
    );
  }

  static async reconnect() {
    Logger.log(
      `SDKConnect::reconnect() SDKConnect.reconnected=${SDKConnect.reconnected}`,
    );
    if (SDKConnect.reconnected) return;

    const [connectionsStorage, approvedHostsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
      DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
    ]);

    if (connectionsStorage) {
      connections = JSON.parse(connectionsStorage);
    }

    if (approvedHostsStorage) {
      approvedHosts = JSON.parse(approvedHostsStorage);
    }

    for (const id in connections) {
      connected[id] = new Connection({
        ...connections[id],
        reconnect: true,
        // approveHost,
        // approvedHosts: approvedHosts,
      });
      connected[id].on(
        MessageType.CONNECTION_STATUS,
        (connectionStatus: ConnectionStatus) => {
          SDKConnect._connectionStatusHandler({
            channelId: id,
            connectionStatus,
          });
        },
      );
    }
    SDKConnect.reconnected = true;
  }

  //FIXME replace with a hook methods
  static addEventListener(listener: SDKEventListener) {
    //TODO remove after debugging session persistence
    if (SDKConnect.sdkEventListeners.length === 1) {
      SDKConnect.sdkEventListeners[0] = listener;
    } else {
      SDKConnect.sdkEventListeners.push(listener);
    }
  }

  private static _connectionStatusHandler({
    channelId,
    connectionStatus,
  }: {
    channelId: string;
    connectionStatus: ConnectionStatus;
  }) {
    if (connectionStatus === ConnectionStatus.DISCONNECTED) {
      Logger.log(`SHOULD DISCONNECT channel=${channelId} HERE`);
      // connected[channelId].removeConnection();
    }
    SDKConnect.emit(connectionStatus);
  }

  private static emit(eventName: string) {
    SDKConnect.sdkEventListeners.forEach((listener) => {
      listener(eventName);
    });
  }

  static pause() {
    Logger.log(`SDKConnect::pause()`);
    if (SDKConnect.paused) return;

    for (const id in connected) {
      connected[id].pause();
    }
    SDKConnect.paused = true;
  }

  static removeChannel(channelId: string) {
    if (connected[channelId]) {
      connected[channelId].removeConnection();
      delete connected[channelId];
      delete connections[channelId];
      // TODO update
      // delete approvedHosts[this.host];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(approvedHosts),
      );
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(connections),
      );
      SDKConnect.emit('disconnect');
    }
  }

  static removeAll() {
    Logger.log(`SDKConnect::removeAll()`);
    for (const id in connected) {
      SDKConnect.removeChannel(id);
    }
    SDKConnect.emit('removeAll');
  }

  static disconnectAll() {
    Logger.log(`SDKConnect::removeAll()`);
    for (const id in connected) {
      SDKConnect.removeChannel(id);
    }
    SDKConnect.emit('removeAll');
  }

  static getConnections() {
    return connections;
  }

  static getConnected() {
    return connected;
  }

  private static handleAppState(appState: string) {
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

  static async init() {
    Logger.log(`SDKConnect::init set listeners and reconnect`);
    AppState.removeEventListener('change', this.handleAppState);
    AppState.addEventListener('change', this.handleAppState);
    SDKConnect.reconnect();
  }
}

export default SDKConnect;
