import RNWalletConnect from '@walletconnect/client';
import { parseWalletConnectUri } from '@walletconnect/utils';
import Engine from './Engine';
import Logger from '../util/Logger';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLIENT_OPTIONS, WALLET_CONNECT_ORIGIN } from '../util/walletconnect';
import { WALLETCONNECT_SESSIONS } from '../constants/storage';
import { WalletDevice } from '@metamask/transaction-controller';
import BackgroundBridge from './BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  checkActiveAccountAndChainId,
} from './RPCMethods/RPCMethodMiddleware';
import { Linking } from 'react-native';
import Minimizer from 'react-native-minimizer';
import AppConstants from './AppConstants';
import { strings } from '../../locales/i18n';
import NotificationManager from './NotificationManager';
import { msBetweenDates, msToHours } from '../util/date';
import URL from 'url-parse';

const hub = new EventEmitter();
let connectors = [];
let initialized = false;
const tempCallIds = [];

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

const persistSessions = async () => {
  const sessions = connectors
    .filter((connector) => connector?.walletConnector?.connected)
    .map((connector) => ({
      ...connector.walletConnector.session,
      autosign: connector.autosign,
      redirectUrl: connector.redirectUrl,
      requestOriginatedFrom: connector.requestOriginatedFrom,
      lastTimeConnected: new Date(),
    }));

  await AsyncStorage.setItem(WALLETCONNECT_SESSIONS, JSON.stringify(sessions));
};

const waitForInitialization = async () => {
  let i = 0;
  while (!initialized) {
    await new Promise((res) => setTimeout(() => res(), 1000));
    if (i++ > 5) initialized = true;
  }
};

const waitForKeychainUnlocked = async () => {
  let i = 0;
  const { KeyringController } = Engine.context;
  while (!KeyringController.isUnlocked()) {
    await new Promise((res) => setTimeout(() => res(), 1000));
    if (i++ > 60) break;
  }
};

class WalletConnect {
  redirectUrl = null;
  autosign = false;
  backgroundBridge = null;
  url = { current: null };
  title = { current: null };
  icon = { current: null };
  dappScheme = { current: null };
  requestsToRedirect = {};
  hostname = null;
  requestOriginatedFrom = null;

  constructor(options, existing) {
    if (options.session.redirectUrl) {
      this.redirectUrl = options.session.redirectUrl;
    }

    if (options.session.autosign) {
      this.autosign = options.session.autosign;
    }

    if (options.session.requestOriginatedFrom) {
      this.requestOriginatedFrom = options.session.requestOriginatedFrom;
    }

    this.walletConnector = new RNWalletConnect({
      ...options,
      ...CLIENT_OPTIONS,
    });
    /**
     *  Subscribe to session requests
     */
    this.walletConnector.on('session_request', async (error, payload) => {
      Logger.log('WC session_request:', payload);
      if (error) {
        throw error;
      }

      await waitForKeychainUnlocked();

      try {
        const sessionData = {
          ...payload.params[0],
          autosign: this.autosign,
          redirectUrl: this.redirectUrl,
          requestOriginatedFrom: this.requestOriginatedFrom,
        };

        Logger.log('WC:', sessionData);

        await waitForInitialization();
        await this.sessionRequest(sessionData);

        await this.startSession(sessionData, existing);

        this.redirect();
      } catch (e) {
        this.walletConnector.rejectSession();
        this.redirect();
      }
    });

    /**
     *  Subscribe to call requests
     */
    this.walletConnector.on('call_request', async (error, payload) => {
      if (tempCallIds.includes(payload.id)) return;
      tempCallIds.push(payload.id);

      await waitForKeychainUnlocked();

      Logger.log('CALL_REQUEST', error, payload);
      if (error) {
        throw error;
      }

      if (payload.method) {
        const payloadUrl = this.walletConnector.session.peerMeta.url;
        const payloadHostname = new URL(payloadUrl).hostname;
        if (payloadHostname === this.backgroundBridge.hostname) {
          if (METHODS_TO_REDIRECT[payload.method]) {
            this.requestsToRedirect[payload.id] = true;
          }

          if (payload.method === 'eth_signTypedData') {
            payload.method = 'eth_signTypedData_v3';
          }

          // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
          if (payload.method === 'eth_sendTransaction') {
            const { TransactionController } = Engine.context;
            try {
              const selectedAddress =
                Engine.context.PreferencesController.state.selectedAddress?.toLowerCase();

              checkActiveAccountAndChainId({
                address: payload.params[0].from,
                chainId: payload.params[0].chainId,
                isWalletConnect: true,
                activeAccounts: [selectedAddress],
                hostname: payloadHostname,
              });

              const hash = await (
                await TransactionController.addTransaction(
                  payload.params[0],
                  this.url.current
                    ? WALLET_CONNECT_ORIGIN + this.url.current
                    : undefined,
                  WalletDevice.MM_MOBILE,
                )
              ).result;
              this.approveRequest({
                id: payload.id,
                result: hash,
              });
            } catch (error) {
              this.rejectRequest({
                id: payload.id,
                error,
              });
            }
            return;
          }

          this.backgroundBridge.onMessage({
            name: 'walletconnect-provider',
            data: payload,
            origin: this.hostname,
          });
        }
      }

      // Clean call ids
      tempCallIds.length = 0;
    });

    /**
     *	Subscribe to disconnect
     */
    this.walletConnector.on('disconnect', (error) => {
      if (error) {
        throw error;
      }
      this.killSession();
      persistSessions();
    });

    this.walletConnector.on('session_update', (error, payload) => {
      Logger.log('WC: Session update', payload);
      if (error) {
        throw error;
      }
    });

    if (existing) {
      this.startSession(options.session, existing);
    }
  }

  redirect = () => {
    if (this.requestOriginatedFrom === AppConstants.DEEPLINKS.ORIGIN_QR_CODE)
      return;

    setTimeout(() => {
      if (this.dappScheme.current || this.redirectUrl) {
        Linking.openURL(
          this.dappScheme.current
            ? `${this.dappScheme.current}://`
            : this.redirectUrl,
        );
      } else {
        Minimizer.goBack();
      }
    }, 300);
  };

  needsRedirect = (id) => {
    if (this.requestsToRedirect[id]) {
      delete this.requestsToRedirect[id];
      this.redirect();
    }
  };

  approveRequest = ({ id, result }) => {
    this.walletConnector.approveRequest({
      id,
      result,
    });
    this.needsRedirect(id);
  };

  rejectRequest = ({ id, error }) => {
    this.walletConnector.rejectRequest({
      id,
      error,
    });
    this.needsRedirect(id);
  };

  updateSession = ({ chainId, accounts }) => {
    this.walletConnector.updateSession({
      chainId,
      accounts,
    });
  };

  startSession = async (sessionData, existing) => {
    const chainId = Engine.context.NetworkController.state.provider.chainId;
    const selectedAddress =
      Engine.context.PreferencesController.state.selectedAddress?.toLowerCase();
    const approveData = {
      chainId: parseInt(chainId, 10),
      accounts: [selectedAddress],
    };
    if (existing) {
      this.walletConnector.updateSession(approveData);
    } else {
      await this.walletConnector.approveSession(approveData);
      persistSessions();
    }

    this.url.current = sessionData.peerMeta.url;
    this.title.current = sessionData.peerMeta?.name;
    this.icon.current = sessionData.peerMeta?.icons?.[0];
    this.dappScheme.current = sessionData.peerMeta?.dappScheme;

    this.hostname = new URL(this.url.current).hostname;

    this.backgroundBridge = new BackgroundBridge({
      webview: null,
      url: this.url.current,
      isWalletConnect: true,
      wcWalletConnector: this.walletConnector,
      wcRequestActions: {
        approveRequest: this.approveRequest,
        rejectRequest: this.rejectRequest,
        updateSession: this.updateSession,
      },
      getRpcMethodMiddleware: ({ hostname, getProviderState }) =>
        getRpcMethodMiddleware({
          hostname: WALLET_CONNECT_ORIGIN + this.hostname,
          getProviderState,
          navigation: null, //props.navigation,
          // Website info
          url: this.url,
          title: this.title,
          icon: this.icon,
          // Bookmarks
          isHomepage: false,
          // Show autocomplete
          fromHomepage: false,
          toggleUrlModal: () => null,
          // Wizard
          wizardScrollAdjusted: () => null,
          tabId: false,
          isWalletConnect: true,
        }),
      isMainFrame: true,
    });
  };

  killSession = () => {
    this.backgroundBridge?.onDisconnect();
    this.walletConnector && this.walletConnector.killSession();
    this.walletConnector = null;
  };

  sessionRequest = (peerInfo) =>
    new Promise((resolve, reject) => {
      hub.emit('walletconnectSessionRequest', peerInfo);

      hub.on('walletconnectSessionRequest::approved', (peerId) => {
        if (peerInfo.peerId === peerId) {
          resolve(true);
        }
      });
      hub.on('walletconnectSessionRequest::rejected', (peerId) => {
        if (peerInfo.peerId === peerId) {
          reject(new Error('walletconnectSessionRequest::rejected'));
        }
      });
    });
}

const instance = {
  async init() {
    const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
    if (sessionData) {
      const sessions = JSON.parse(sessionData);

      sessions.forEach((session) => {
        if (session.lastTimeConnected) {
          const sessionDate = new Date(session.lastTimeConnected);
          const diffBetweenDatesInMs = msBetweenDates(sessionDate);
          const diffInHours = msToHours(diffBetweenDatesInMs);

          if (diffInHours <= AppConstants.WALLET_CONNECT.SESSION_LIFETIME) {
            connectors.push(new WalletConnect({ session }, true));
          } else {
            const connector = new WalletConnect({ session }, true);
            connector.killSession();
          }
        } else {
          connectors.push(new WalletConnect({ session }, true));
        }
      });
    }
    initialized = true;
  },
  connectors() {
    return connectors;
  },
  async newSession(uri, redirectUrl, autosign, requestOriginatedFrom) {
    const alreadyConnected = this.isSessionConnected(uri);
    if (alreadyConnected) {
      NotificationManager.showSimpleNotification({
        duration: 5000,
        title: strings('walletconnect_sessions.session_already_exist'),
        description: strings('walletconnect_sessions.close_current_session'),
        status: 'error',
      });
      return;
    }

    const sessions = connectors
      .filter((connector) => connector?.walletConnector?.connected)
      .map((connector) => ({
        ...connector.walletConnector.session,
      }));
    if (sessions.length >= AppConstants.WALLET_CONNECT.LIMIT_SESSIONS) {
      await this.killSession(sessions[0].peerId);
    }

    const data = { uri, session: {} };
    if (redirectUrl) {
      data.session.redirectUrl = redirectUrl;
    }
    if (autosign) {
      data.session.autosign = autosign;
    }
    if (requestOriginatedFrom) {
      data.session.requestOriginatedFrom = requestOriginatedFrom;
    }
    connectors.push(new WalletConnect(data));
  },
  getSessions: async () => {
    let sessions = [];
    const sessionData = await AsyncStorage.getItem(WALLETCONNECT_SESSIONS);
    if (sessionData) {
      sessions = JSON.parse(sessionData);
    }
    return sessions;
  },
  killSession: async (id) => {
    // 1) First kill the session
    const connectorToKill = connectors.find(
      (connector) =>
        connector &&
        connector.walletConnector &&
        connector.walletConnector.session.peerId === id,
    );
    if (connectorToKill) {
      await connectorToKill.killSession();
    }
    // 2) Remove from the list of connectors
    connectors = connectors.filter(
      (connector) =>
        connector &&
        connector.walletConnector &&
        connector.walletConnector.connected &&
        connector.walletConnector.session.peerId !== id,
    );
    // 3) Persist the list
    await persistSessions();
  },
  hub,
  isValidUri(uri) {
    const result = parseWalletConnectUri(uri);
    if (!result.handshakeTopic || !result.bridge || !result.key) {
      return false;
    }
    return true;
  },
  getValidUriFromDeeplink(uri) {
    const prefix = 'wc://wc?uri=';
    return uri.replace(prefix, '');
  },
  isSessionConnected(uri) {
    const wcUri = parseWalletConnectUri(uri);
    return connectors.some(({ walletConnector }) => {
      if (!walletConnector) {
        return false;
      }
      const { handshakeTopic, key } = walletConnector.session;
      return handshakeTopic === wcUri.handshakeTopic && key === wcUri.key;
    });
  },
};

export default instance;
