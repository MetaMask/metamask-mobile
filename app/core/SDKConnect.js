//import { store } from '../store';
import BackgroundBridge from './BackgroundBridge';
import RemoteCommunication from '@metamask/sdk-communication-layer';
import getRpcMethodMiddleware from './RPCMethods/RPCMethodMiddleware';
//import { approveHost } from '../actions/privacy';
import AppConstants from './AppConstants';
import Minimizer from 'react-native-minimizer';
import Engine from './Engine';
import { WALLET_CONNECT_ORIGIN } from '../util/walletconnect';
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

// Temporary hosts for now, persistance will be worked on for future versions
const approvedHosts = {};

const approveHost = (host) => {
  approvedHosts[host] = true;
};

const removeHost = (host) => {
  delete approvedHosts[host];
};

class Connection {
  channelId = null;
  RemoteConn = null;
  requestsToRedirect = {};
  origin = null;
  host = null;

  constructor({ id, otherPublicKey, commLayer, origin }) {
    this.origin = origin;
    this.channelId = id;

    this.RemoteConn = new RemoteCommunication({
      commLayer,
      otherPublicKey,
      webRTCLib: webrtc,
    });

    this.requestsToRedirect = [];

    this.sendMessage = this.sendMessage.bind(this);

    this.RemoteConn.on('clients_disconnected', () => {
      removeHost(this.host);
      this.backgroundBridge?.onDisconnect?.();
    });

    this.RemoteConn.on('clients_ready', ({ isOriginator, originatorInfo }) => {
      this.backgroundBridge = new BackgroundBridge({
        webview: null,
        url: originatorInfo?.url,
        isRemoteConn: true,
        sendMessage: this.sendMessage,
        getRpcMethodMiddleware: ({ hostname, getProviderState }) => {
          this.host = `SDK:${this.channelId}:` + hostname;

          return getRpcMethodMiddleware({
            hostname: this.host,
            getProviderState,
            navigation: null, //props.navigation,
            getApprovedHosts: () => approvedHosts,
            setApprovedHosts: () => null,
            approveHost: (hostname) => approveHost(hostname), //props.approveHost,
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
          });
        },
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
                  ? WALLET_CONNECT_ORIGIN + originatorInfo?.url
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
    });

    this.RemoteConn.connectToChannel(id);
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
  connectToChannel({ id, commLayer, otherPublicKey, origin }) {
    new Connection({ id, commLayer, otherPublicKey, origin });
  },
};

export default SDKConnect;
