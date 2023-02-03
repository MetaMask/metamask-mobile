import BackgroundBridge from './BackgroundBridge/BackgroundBridge';
import RemoteCommunication, {
  CommunicationLayerPreference,
} from '@metamask/sdk-communication-layer';
import getRpcMethodMiddleware from './RPCMethods/RPCMethodMiddleware';
import AppConstants from './AppConstants';
import Minimizer from 'react-native-minimizer';
import BackgroundTimer from 'react-native-background-timer';
import Engine from './Engine';
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
import Device from '../util/device';

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

interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  commLayer: CommunicationLayerPreference;
  origin: string;
  reconnect?: boolean;
}

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

enum Sources {
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

class Connection {
  channelId;
  RemoteConn;
  requestsToRedirect: { [request: string]: boolean } = {};
  origin;
  host;
  isReady = false;
  backgroundBridge: BackgroundBridge | undefined;

  constructor({
    id,
    otherPublicKey,
    commLayer,
    origin,
    reconnect,
  }: ConnectionProps) {
    this.origin = origin;
    this.channelId = id;
    this.host = `${MM_SDK_REMOTE_ORIGIN}${this.channelId}`;

    this.RemoteConn = new RemoteCommunication({
      platform: 'metamask-mobile',
      commLayer,
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect,
    });

    this.requestsToRedirect = {};

    this.sendMessage = this.sendMessage.bind(this);

    this.RemoteConn.on('clients_disconnected', () => {
      this.removeConnection();
    });

    if (reconnect) {
      this.RemoteConn.on('clients_waiting_to_join', () => {
        this.removeConnection();
      });
    }

    this.RemoteConn.on('clients_ready', ({ originatorInfo }) => {
      const isMMSDK = true;
      if (this.isReady) return;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.backgroundBridge = new BackgroundBridge({
        webview: null,
        url: originatorInfo?.url,
        isRemoteConn: true,
        sendMessage: this.sendMessage,
        getApprovedHosts: () => approvedHosts,
        remoteConnHost: this.host,
        isMMSDK,
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
            isMMSDK,
            analytics: {
              isRemoteConn: true,
              platform: parseSource(originatorInfo?.platform),
            },
            toggleUrlModal: () => null,
            injectHomePageScripts: () => null,
          }),
        isMainFrame: true,
      });

      this.RemoteConn.on('message', async ({ message }) => {
        await waitForKeychainUnlocked();

        if (METHODS_TO_REDIRECT[message?.method]) {
          this.requestsToRedirect[message?.id] = true;
        }

        // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
        if (message.method === 'eth_sendTransaction') {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const { TransactionController } = Engine.context;
          try {
            const hash = await (
              await TransactionController.addTransaction(
                message.params[0],
                originatorInfo?.url
                  ? MM_SDK_REMOTE_ORIGIN + originatorInfo?.url
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

      this.isReady = true;
    });

    this.RemoteConn.connectToChannel(id);
  }

  pause() {
    this.RemoteConn.pause();
  }

  resume() {
    this.RemoteConn.resume();
  }

  disconnect() {
    this.RemoteConn.disconnect();
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
    this.RemoteConn.sendMessage(msg);
    if (!this.requestsToRedirect[msg?.data?.id]) return;
    delete this.requestsToRedirect[msg?.data?.id];

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    setTimeout(() => {
      if (!Object.keys(this.requestsToRedirect).length) Minimizer.goBack();
    }, 500);
  }
}

const SDKConnect = {
  reconnected: false,
  async connectToChannel({
    id,
    commLayer,
    otherPublicKey,
    origin,
  }: ConnectionProps) {
    connected[id] = new Connection({
      id,
      commLayer,
      otherPublicKey,
      origin,
    });
    connections[id] = { id, commLayer, otherPublicKey, origin };
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(connections),
    );
  },
  async reconnect() {
    if (this.reconnected) return;

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
      });
    }
    this.reconnected = true;
  },
  timeout: null,
  paused: false,
  pause() {
    if (this.paused) return;

    for (const id in connected) {
      connected[id].pause();
    }
    this.paused = true;
  },
  disconnectAll() {
    for (const id in connected) {
      connected[id].removeConnection();
    }
  },
  handleAppState(appState: string) {
    if (appState === 'active') {
      if (Device.isAndroid()) {
        if (this.timeout) BackgroundTimer.clearInterval(this.timeout);
      } else if (this.timeout) clearTimeout(this.timeout);

      if (this.paused) {
        this.reconnected = false;
        this.paused = false;
        for (const id in connected) {
          connected[id].resume();
        }
      }
    } else if (appState === 'background' && !this.paused) {
      /**
       * Pause connections after 20 seconds of the app being in background to respect device resources.
       * Also, OS closes the app if after 30 seconds, the connections are still open.
       */
      if (Device.isIos()) {
        BackgroundTimer.start();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.timeout = setTimeout(() => {
          this.pause();
        }, TIMEOUT_PAUSE_CONNECTIONS);
        BackgroundTimer.stop();
      } else if (Device.isAndroid()) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.timeout = BackgroundTimer.setTimeout(() => {
          this.pause();
        }, TIMEOUT_PAUSE_CONNECTIONS);
      }
    }
  },
  async init() {
    this.handleAppState = this.handleAppState.bind(this);
    AppState.removeEventListener('change', this.handleAppState);
    AppState.addEventListener('change', this.handleAppState);

    this.reconnect();
  },
};

export default SDKConnect;
