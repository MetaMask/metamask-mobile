import WalletConnectClient from '@walletconnect/client';
import { v1 as random } from 'uuid';
import Engine from '../Engine';
import Logger from '../../util/Logger';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
import StorageWrapper from '../../store/storage-wrapper';
import { WALLET_CONNECT_ORIGIN } from '../../util/walletconnect';
import { WALLETCONNECT_SESSIONS } from '../../constants/storage';
import { WalletDevice } from '@metamask/transaction-controller';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  checkActiveAccountAndChainId,
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';
import { Linking } from 'react-native';
import { Minimizer } from '../NativeModules';
import AppConstants from '../AppConstants';
import { strings } from '../../../locales/i18n';
import NotificationManager from '../NotificationManager';
import { msBetweenDates, msToHours } from '../../util/date';
import { addTransaction } from '../../util/transaction-controller';
import parseWalletConnectUri from './wc-utils';
import { store } from '../../store';
import { selectChainId } from '../../selectors/networkController';
import ppomUtil, { PPOMRequest } from '../../../app/lib/ppom/ppom-util';

export interface TransactionParams {
  from: string;
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

// Custom type definitions
interface IClientMeta {
  description: string;
  url: string;
  icons: string[];
  name: string;
  dappScheme?: string;
}

interface IWalletConnectSession {
  connected: boolean;
  accounts: string[];
  chainId: number;
  bridge: string;
  key: string;
  clientId: string;
  clientMeta: IClientMeta;
  peerId: string;
  peerMeta: IClientMeta;
  handshakeId: number;
  handshakeTopic: string;
}

interface IWalletConnectOptions {
  uri?: string;
  session?: Partial<IWalletConnectSession> & {
    redirectUrl?: string;
    autosign?: boolean;
    requestOriginatedFrom?: string;
  };
  clientMeta?: IClientMeta;
}

interface WalletConnectSession extends IWalletConnectSession {
  redirectUrl?: string;
  autosign?: boolean;
  requestOriginatedFrom?: string;
}

// Removed ExtendedWalletConnectSession interface as it's unused

// Removed RPCMethodsMiddleParameters interface as it's unused

let connectors: WalletConnect[] = [];
const tempCallIds: string[] = [];
const hub = new EventEmitter();
let initialized = false;

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

  await StorageWrapper.setItem(
    WALLETCONNECT_SESSIONS,
    JSON.stringify(sessions),
  );
};

const waitForInitialization = async (): Promise<void> => {
  let i = 0;
  while (!initialized) {
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    if (i++ > 5) initialized = true;
  }
};

const waitForKeychainUnlocked = async (): Promise<void> => {
  let i = 0;
  const { KeyringController } = Engine.context;
  while (!KeyringController.isUnlocked()) {
    await new Promise<void>((res) => setTimeout(() => res(), 1000));
    if (i++ > 60) break;
  }
};

class WalletConnect {
  redirectUrl: string | null = null;
  autosign = false;
  backgroundBridge: BackgroundBridge | null = null;
  url: { current: string | null } = { current: null };
  title: { current: string | null } = { current: null };
  icon: { current: string | null } = { current: null };
  dappScheme: { current: string | null } = { current: null };
  requestsToRedirect: Record<string, boolean> = {};
  hostname: string | null = null;
  requestOriginatedFrom: string | null = null;
  walletConnector: WalletConnectClient;
  session: WalletConnectSession = {} as WalletConnectSession;
  private approvedHosts: Record<string, boolean> = {};

  constructor(options: IWalletConnectOptions, existing = false) {
    if (options.session) {
      this.redirectUrl = options.session.redirectUrl ?? null;
      this.autosign = options.session.autosign ?? false;
      this.requestOriginatedFrom =
        options.session.requestOriginatedFrom ?? null;
    }

    this.walletConnector = new WalletConnectClient({
      uri: options.uri,
      clientMeta: options.clientMeta,
      session: options.session as IWalletConnectSession,
    });

    this.subscribeToSessionRequests();
    this.subscribeToCallRequests();
    this.subscribeToDisconnect();
    this.subscribeToSessionUpdate();

    if (existing) {
      this.startSession(options.session as WalletConnectSession, existing);
    }
  }

  private subscribeToSessionRequests(): void {
    this.walletConnector.on(
      'session_request',
      async (
        error: Error | null,
        payload: { params: [{ peerId: string; peerMeta: IClientMeta }] },
      ) => {
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

          const typedSessionData = this.createTypedSessionData(sessionData);

          await this.startSession(typedSessionData, true);

          this.redirect();
        } catch (e) {
          this.walletConnector.rejectSession();
          this.redirect();
        }
      },
    );
  }

  private createTypedSessionData(sessionData: {
    peerId: string;
    peerMeta: IClientMeta;
    autosign?: boolean;
    redirectUrl?: string | null;
    requestOriginatedFrom?: string | null;
  }): WalletConnectSession {
    return {
      connected: false,
      accounts: [],
      chainId: 0,
      bridge: '',
      key: '',
      clientId: '',
      clientMeta: {
        description: sessionData.peerMeta.description,
        url: sessionData.peerMeta.url,
        icons: sessionData.peerMeta.icons,
        name: sessionData.peerMeta.name,
      },
      peerId: sessionData.peerId,
      peerMeta: sessionData.peerMeta,
      handshakeId: 0,
      handshakeTopic: '',
      redirectUrl: sessionData.redirectUrl ?? undefined,
      autosign: sessionData.autosign ?? false,
      requestOriginatedFrom: sessionData.requestOriginatedFrom ?? undefined,
    };
  }

  private subscribeToCallRequests(): void {
    this.walletConnector.on(
      'call_request',
      async (
        error: Error | null,
        payload: { id: number; method: string; params: unknown[] },
      ) => {
        if (tempCallIds.includes(payload.id.toString())) return;
        tempCallIds.push(payload.id.toString());

        await waitForKeychainUnlocked();

        Logger.log('CALL_REQUEST', error, payload);
        if (error) {
          throw error;
        }

        if (payload.method) {
          await this.handleCallRequest(payload);
        }

        tempCallIds.length = 0;
      },
    );
  }

  private async handleCallRequest(payload: {
    id: number;
    method: string;
    params: unknown[];
  }): Promise<void> {
    const payloadUrl = this.walletConnector?.session?.peerMeta?.url;
    const payloadHostname = payloadUrl ? new URL(payloadUrl).hostname : '';

    if (payloadHostname === this.backgroundBridge?.hostname) {
      if (
        METHODS_TO_REDIRECT[payload.method as keyof typeof METHODS_TO_REDIRECT]
      ) {
        this.requestsToRedirect[payload.id] = true;
      }

      if (payload.method === 'eth_signTypedData') {
        payload.method = 'eth_signTypedData_v3';
      }

      if (payload.method === 'eth_sendTransaction') {
        await this.handleEthSendTransaction(payload, payloadHostname);
        return;
      }

      this.backgroundBridge.onMessage({
        name: 'walletconnect-provider',
        data: payload,
        origin: this.hostname,
      });
    }
  }

  private async handleEthSendTransaction(
    payload: { id: number; method: string; params: unknown[] },
    payloadHostname: string,
  ): Promise<void> {
    try {
      const transactionParams = payload.params[0] as TransactionParams;
      await checkActiveAccountAndChainId({
        address: transactionParams.from,
        chainId: transactionParams.chainId,
        isWalletConnect: true,
        hostname: payloadHostname,
      });

      // Create a new object that matches the expected TransactionParams type
      const compatibleTransactionParams = {
        from: transactionParams.from,
        to: transactionParams.to,
        value: transactionParams.value,
        data: transactionParams.data,
        gas: transactionParams.gas,
        gasPrice: transactionParams.gasPrice,
        maxFeePerGas: transactionParams.maxFeePerGas,
        maxPriorityFeePerGas: transactionParams.maxPriorityFeePerGas,
      };

      const trx = await addTransaction(compatibleTransactionParams, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        origin: this.url.current
          ? WALLET_CONNECT_ORIGIN + this.url.current
          : undefined,
      });

      const id = trx.transactionMeta.id;
      const reqObject: PPOMRequest & { jsonrpc: string } = {
        jsonrpc: '2.0',
        method: payload.method,
        origin: this.url.current ?? '',
        params: [compatibleTransactionParams],
      };

      ppomUtil.validateRequest(reqObject, id);

      const hash = await trx.result;
      this.approveRequest({
        id: payload.id.toString(),
        result: hash,
      });
    } catch (error) {
      this.rejectRequest({
        id: payload.id.toString(),
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private subscribeToDisconnect(): void {
    this.walletConnector.on('disconnect', (error: Error | null) => {
      if (error) {
        throw error;
      }
      this.killSession();
      persistSessions();
    });
  }

  private subscribeToSessionUpdate(): void {
    this.walletConnector.on(
      'session_update',
      (error: Error | null, payload: unknown) => {
        Logger.log('WC: Session update', payload);
        if (error) {
          throw error;
        }
      },
    );
  }

  redirect = () => {
    if (this.requestOriginatedFrom === AppConstants.DEEPLINKS.ORIGIN_QR_CODE)
      return;

    setTimeout(() => {
      if (this.dappScheme.current || this.redirectUrl) {
        Linking.openURL(
          this.dappScheme.current
            ? `${this.dappScheme.current}://`
            : this.redirectUrl || '',
        );
      } else {
        Minimizer.goBack();
      }
    }, 300);
  };

  needsRedirect = (id: string): void => {
    if (this.requestsToRedirect[id]) {
      delete this.requestsToRedirect[id];
      this.redirect();
    }
  };

  approveRequest = ({
    id,
    result,
  }: {
    id: string | number;
    result: unknown;
  }): void => {
    this.walletConnector.approveRequest({
      id: typeof id === 'string' ? parseInt(id, 10) : id,
      result,
    });
    this.needsRedirect(id.toString());
  };

  rejectRequest = ({
    id,
    error,
  }: {
    id: string | number;
    error: Error;
  }): void => {
    this.walletConnector.rejectRequest({
      id: typeof id === 'string' ? parseInt(id, 10) : id,
      error,
    });
    this.needsRedirect(id.toString());
  };

  updateSession = ({
    chainId,
    accounts,
  }: {
    chainId: number;
    accounts: string[];
  }): void => {
    this.walletConnector.updateSession({
      chainId,
      accounts,
    });
  };

  startSession = async (
    sessionData: WalletConnectSession,
    existing: boolean,
  ) => {
    const chainId = selectChainId(store.getState());
    const selectedAddress =
      Engine.context.AccountsController.getSelectedAccount().address?.toLowerCase();
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

    this.url.current = sessionData.peerMeta?.url ?? null;
    this.title.current = sessionData.peerMeta?.name ?? null;
    this.icon.current = sessionData.peerMeta?.icons?.[0] ?? null;
    this.dappScheme.current = sessionData.peerMeta?.dappScheme ?? null;

    this.hostname = this.url.current
      ? new URL(this.url.current).hostname
      : null;

    this.backgroundBridge = new BackgroundBridge({
      webview: null,
      url: this.url.current,
      isWalletConnect: true,
      wcRequestActions: {
        approveRequest: this.approveRequest,
        rejectRequest: this.rejectRequest,
        updateSession: this.updateSession,
      },
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        getProviderState: () => unknown;
      }) =>
        getRpcMethodMiddleware({
          hostname: WALLET_CONNECT_ORIGIN + (this.hostname || ''),
          channelId: this.session.peerId,
          getProviderState,
          navigation: null,
          url: { current: this.url.current || '' },
          title: { current: this.title.current || '' },
          icon: { current: this.icon.current || '' },
          isHomepage: () => false,
          fromHomepage: { current: false },
          toggleUrlModal: () => null,
          wizardScrollAdjusted: { current: false },
          tabId: false,
          isWalletConnect: true,
          isMMSDK: false,
          getApprovedHosts: () => this.approvedHosts,
          setApprovedHosts: this.setApprovedHosts,
          approveHost: this.approveHost,
          injectHomePageScripts: () => null,
          analytics: {
            request_source: AppConstants.REQUEST_SOURCES.WC,
            request_platform: '',
          },
        }),
      isMainFrame: true,
      isRemoteConn: false,
      sendMessage: () => undefined,
      getApprovedHosts: () => this.approvedHosts,
      remoteConnHost: '',
      isMMSDK: false,
      channelId: this.session.peerId,
    });
  };

  killSession = () => {
    this.backgroundBridge?.onDisconnect();
    this.walletConnector?.killSession();
    this.walletConnector = null as unknown as WalletConnectClient;
  };

  sessionRequest = async (peerInfo: { peerMeta: { url: string } }) => {
    const { ApprovalController } = Engine.context;
    try {
      const { host } = new URL(peerInfo.peerMeta.url);
      return await ApprovalController.add({
        id: random(),
        origin: host,
        requestData: peerInfo,
        type: ApprovalTypes.WALLET_CONNECT,
      });
    } catch (error) {
      throw new Error('WalletConnect session request rejected');
    }
  };

  setApprovedHosts = (hosts: Record<string, boolean>): void => {
    this.approvedHosts = { ...this.approvedHosts, ...hosts };
    // Persist the approved hosts to storage
    StorageWrapper.setItem(
      'WALLET_CONNECT_APPROVED_HOSTS',
      JSON.stringify(this.approvedHosts),
    );
  };

  approveHost = (host: string): void => {
    this.approvedHosts[host] = true;
    // Persist the updated approved hosts to storage
    StorageWrapper.setItem(
      'WALLET_CONNECT_APPROVED_HOSTS',
      JSON.stringify(this.approvedHosts),
    );
  };
}

const instance = {
  async init() {
    const sessionData = await StorageWrapper.getItem(WALLETCONNECT_SESSIONS);
    if (sessionData) {
      const sessions = JSON.parse(sessionData);

      sessions.forEach(
        (session: WalletConnectSession & { lastTimeConnected?: string }) => {
          const sessionOptions = {
            redirectUrl: session.redirectUrl,
            autosign: session.autosign,
            requestOriginatedFrom: session.requestOriginatedFrom,
          };

          if (session.lastTimeConnected) {
            const sessionDate = new Date(session.lastTimeConnected);
            const diffBetweenDatesInMs = msBetweenDates(sessionDate);
            const diffInHours = msToHours(diffBetweenDatesInMs);

            if (diffInHours <= AppConstants.WALLET_CONNECT.SESSION_LIFETIME) {
              connectors.push(
                new WalletConnect(
                  {
                    session: sessionOptions,
                  },
                  true,
                ),
              );
            } else {
              const connector = new WalletConnect(
                {
                  session: sessionOptions,
                },
                true,
              );
              connector.killSession();
            }
          } else {
            connectors.push(
              new WalletConnect(
                {
                  session: sessionOptions,
                },
                true,
              ),
            );
          }
        },
      );
    }
    initialized = true;
  },
  connectors() {
    return connectors;
  },
  async newSession(
    uri: string,
    redirectUrl: string | undefined,
    autosign: boolean | undefined,
    requestOriginatedFrom: string | undefined,
  ) {
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

    interface WalletConnectData {
      uri: string;
      session: {
        redirectUrl?: string;
        autosign?: boolean;
        requestOriginatedFrom?: string;
      };
    }

    const data: WalletConnectData = { uri, session: {} };
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
  getSessions: async (): Promise<WalletConnectSession[]> => {
    let sessions: WalletConnectSession[] = [];
    const sessionData = await StorageWrapper.getItem(WALLETCONNECT_SESSIONS);
    if (sessionData) {
      sessions = JSON.parse(sessionData);
    }
    return sessions;
  },
  killSession: async (id: string): Promise<void> => {
    // 1) First kill the session
    const connectorToKill = connectors.find(
      (connector) => connector?.walletConnector?.session.peerId === id,
    );
    if (connectorToKill) {
      await connectorToKill.killSession();
    }
    // 2) Remove from the list of connectors
    connectors = connectors.filter(
      (connector) =>
        connector?.walletConnector?.connected &&
        connector.walletConnector.session.peerId !== id,
    );
    // 3) Persist the list
    await persistSessions();
  },
  hub,
  isValidUri(uri: string): boolean {
    const result = parseWalletConnectUri(uri);
    return !!(result.handshakeTopic && result.bridge && result.key);
  },
  getValidUriFromDeeplink(uri: string): string {
    const prefix = 'wc://wc?uri=';
    return uri.replace(prefix, '');
  },
  isSessionConnected(uri: string): boolean {
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
