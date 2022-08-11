//import { store } from '../store';
import BackgroundBridge from './BackgroundBridge';
import RemoteCommunication from './RemoteCommunication';
import getRpcMethodMiddleware from './RPCMethods/RPCMethodMiddleware';
//import { approveHost } from '../actions/privacy';
import AppConstants from './AppConstants';
import Minimizer from 'react-native-minimizer';
import Engine from './Engine';
import { WalletDevice } from '@metamask/controllers';

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
import AsyncStorage from '@react-native-community/async-storage';
import { AppState } from 'react-native';
import Device from '../util/device';

import BackgroundTimer from 'react-native-background-timer';

export const MM_SDK_REMOTE_ORIGIN = 'MMSDKREMOTE::';

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
const METHODS_TO_REDIRECT = {
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

let connections = {};
const connected = {};

// Temporary hosts for now, persistance will be worked on for future versions
let approvedHosts = {};

const approveHost = ({ host, hostname }) => {
  approvedHosts[host] = hostname;

  AsyncStorage.setItem('sdkApprovedHosts', JSON.stringify(approvedHosts));
};

const parseSource = (source) => {
  if (source === 'web-desktop') return 'web-desktop';
  if (source === 'web-mobile') return 'web-mobile';
  if (source === 'nodejs') return 'nodejs';
  if (source === 'unity') return 'unity';
  return 'undefined';
};

class Connection {
  channelId = null;
  RemoteConn = null;
  requestsToRedirect = {};
  origin = null;
  host = null;
  isReady = null;

  constructor({ id, otherPublicKey, commLayer, origin, reconnect }) {
    this.origin = origin;
    this.channelId = id;
    this.host = `${MM_SDK_REMOTE_ORIGIN}${this.channelId}`;

    this.RemoteConn = new RemoteCommunication({
      commLayer,
      otherPublicKey,
      webRTCLib: webrtc,
      reconnect,
    });

    this.requestsToRedirect = [];

    this.sendMessage = this.sendMessage.bind(this);

    this.RemoteConn.on('clients_disconnected', () => {
      this.removeConnection();
    });

    if (reconnect) {
      this.RemoteConn.on('clients_waiting_to_join', (numberUsers) => {
        this.removeConnection();
      });
    }

    this.RemoteConn.on('clients_ready', ({ isOriginator, originatorInfo }) => {
      if (this.isReady) return;
      this.backgroundBridge = new BackgroundBridge({
        webview: null,
        url: originatorInfo?.url,
        isRemoteConn: true,
        sendMessage: this.sendMessage,
        getApprovedHosts: () => approvedHosts,
        remoteConnHost: this.host,
        getRpcMethodMiddleware: ({ hostname, getProviderState }) =>
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
            icon: { current: null },
            // Bookmarks
            isHomepage: false,
            // Show autocomplete
            fromHomepage: false,
            setAutocompleteValue: () => null,
            setShowUrlModal: () => null,
            // Wizard
            wizardScrollAdjusted: () => null,
            tabId: false,
            isWalletConnect: false,
            analytics: {
              isRemoteConn: true,
              platform: parseSource(originatorInfo?.platform),
            },
          }),
        isMainFrame: true,
      });

      this.RemoteConn.on('message', async ({ message }) => {
        if (METHODS_TO_REDIRECT[message?.method]) {
          this.requestsToRedirect[message?.id] = true;
        }

        // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
        if (message.method === 'eth_sendTransaction') {
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

        this.backgroundBridge.onMessage({
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
    AsyncStorage.setItem('sdkApprovedHosts', JSON.stringify(approvedHosts));
    AsyncStorage.setItem('sdkConnections', JSON.stringify(connections));
  }

  sendMessage(msg) {
    this.RemoteConn.sendMessage(msg);
    if (!this.requestsToRedirect[msg?.data?.id]) return;

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    setTimeout(() => {
      Minimizer.goBack();
    }, 300);
  }
}

const SDKConnect = {
  reconnected: false,
  async connectToChannel({ id, commLayer, otherPublicKey, origin }) {
    connected[id] = new Connection({
      id,
      commLayer,
      otherPublicKey,
      origin,
    });
    connections[id] = { id, commLayer, otherPublicKey, origin };
    AsyncStorage.setItem('sdkConnections', JSON.stringify(connections));
  },
  async reconnect() {
    if (this.reconnected) return;

    const [connectionsStorage, approvedHostsStorage] = await Promise.all([
      AsyncStorage.getItem('sdkConnections'),
      AsyncStorage.getItem('sdkApprovedHosts'),
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
  handleAppState(appState) {
    if (appState === 'active') {
      if (Device.isAndroid()) {
        BackgroundTimer.clearInterval(this.timeout);
      } else {
        clearTimeout(this.timeout);
      }

      if (this.paused) {
        this.reconnected = false;
        this.paused = false;
        for (const id in connected) {
          connected[id].resume();
        }
      }
    } else if (appState === 'background' && !this.paused) {
      if (Device.isIos()) {
        BackgroundTimer.start();
        this.timeout = setTimeout(() => {
          this.pause();
        }, 20000);
        BackgroundTimer.stop();
      } else if (Device.isAndroid()) {
        this.timeout = BackgroundTimer.setTimeout(() => {
          this.pause();
        }, 20000);
      }
    }
  },
  async init() {
    /*AsyncStorage.setItem('sdkConnections', JSON.stringify({}));
    AsyncStorage.setItem('sdkApprovedHosts', JSON.stringify({}));*/

    this.handleAppState = this.handleAppState.bind(this);
    AppState.removeEventListener('change', this.handleAppState);
    AppState.addEventListener('change', this.handleAppState);

    this.reconnect();
  },
};

export default SDKConnect;
