import AppConstants from '../AppConstants';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import { Minimizer } from '../NativeModules';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';

import { ApprovalController } from '@metamask/approval-controller';
import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import Logger from '../../util/Logger';

import { NetworkController } from '@metamask/network-controller';
import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Core } from '@walletconnect/core';
import { ErrorResponse } from '@walletconnect/jsonrpc-types';
import Client, {
  SingleEthereum,
  SingleEthereumTypes,
} from '@walletconnect/se-sdk';
import { SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import Engine from '../Engine';
import getAllUrlParams from '../SDKConnect/utils/getAllUrlParams.util';
import { waitForKeychainUnlocked } from '../SDKConnect/utils/wait.util';
import WalletConnect from './WalletConnect';
import METHODS_TO_REDIRECT from './wc-config';
import parseWalletConnectUri, {
  waitForNetworkModalOnboarding,
} from './wc-utils';

const { PROJECT_ID } = AppConstants.WALLET_CONNECT;
export const isWC2Enabled =
  typeof PROJECT_ID === 'string' && PROJECT_ID?.length > 0;

const ERROR_MESSAGES = {
  INVALID_CHAIN: 'Invalid chainId',
  MANUAL_DISCONNECT: 'Manual disconnect',
  USER_REJECT: 'User reject',
  AUTO_REMOVE: 'Automatic removal',
  INVALID_ID: 'Invalid Id',
};

const ERROR_CODES = {
  USER_REJECT_CODE: 5000,
};

const RPC_WALLET_SWITCHETHEREUMCHAIN = 'wallet_switchEthereumChain';

class WalletConnect2Session {
  private backgroundBridge: BackgroundBridge;
  private web3Wallet: Client;
  private deeplink: boolean;
  private session: SessionTypes.Struct;
  private requestsToRedirect: { [request: string]: boolean } = {};
  private topicByRequestId: { [requestId: string]: string } = {};
  private requestByRequestId: {
    [requestId: string]: SingleEthereumTypes.SessionRequest;
  } = {};

  constructor({
    web3Wallet,
    session,
    deeplink,
  }: {
    web3Wallet: Client;
    session: SessionTypes.Struct;
    deeplink: boolean;
  }) {
    this.web3Wallet = web3Wallet;
    this.deeplink = deeplink;
    this.session = session;

    const url = session.self.metadata.url;
    const name = session.self.metadata.name;
    const icons = session.self.metadata.icons;

    this.backgroundBridge = new BackgroundBridge({
      webview: null,
      url,
      isWalletConnect: true,
      wcRequestActions: {
        approveRequest: this.approveRequest.bind(this),
        rejectRequest: this.rejectRequest.bind(this),
        updateSession: this.updateSession.bind(this),
      },
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        hostname: string;
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname: url,
          getProviderState,
          setApprovedHosts: () => false,
          getApprovedHosts: () => false,
          analytics: {},
          isMMSDK: false,
          isHomepage: () => false,
          fromHomepage: { current: false },
          approveHost: () => false,
          injectHomePageScripts: () => false,
          navigation: null, //props.navigation,
          // Website info
          url: {
            current: url,
          },
          title: {
            current: name,
          },
          icon: {
            current: icons?.[0],
          },
          toggleUrlModal: () => null,
          wizardScrollAdjusted: { current: false },
          tabId: '',
          isWalletConnect: true,
        }),
      isMMSDK: false,
      isMainFrame: true,
      getApprovedHosts: undefined,
      isRemoteConn: false,
      sendMessage: undefined,
      remoteConnHost: undefined,
    });
  }

  setDeeplink = (deeplink: boolean) => {
    this.deeplink = deeplink;
  };

  redirect = () => {
    if (!this.deeplink) return;

    setTimeout(() => {
      // Reset the status of deeplink after each redirect
      this.deeplink = false;
      Minimizer.goBack();
    }, 300);
  };

  needsRedirect = (id: string) => {
    if (this.requestsToRedirect[id]) {
      delete this.requestsToRedirect[id];
      this.redirect();
    }
  };

  approveRequest = async ({ id, result }: { id: string; result: unknown }) => {
    const topic = this.topicByRequestId[id];
    const initialRequest = this.requestByRequestId[id];

    // Special case for eth_switchNetwork to wait for the modal to be closed
    if (
      initialRequest?.params.request.method === RPC_WALLET_SWITCHETHEREUMCHAIN
    ) {
      try {
        const params = initialRequest.params.request.params as unknown[];
        const { chainId } = params[0] as { chainId: string };

        if (chainId) {
          await waitForNetworkModalOnboarding({
            chainId: parseInt(chainId) + '',
          });
        }
      } catch (err) {
        // Ignore error as it is not critical when timeout for modal is reached
        // It allows to safely continue and prevent pilling up the requests.
      }
    }

    try {
      await this.web3Wallet.approveRequest({
        id: parseInt(id),
        topic,
        result,
      });
    } catch (err) {
      console.warn(
        `WC2::approveRequest error while approving request id=${id} topic=${topic}`,
        err,
      );
    }

    this.needsRedirect(id);
  };

  rejectRequest = async ({ id, error }: { id: string; error: unknown }) => {
    const topic = this.topicByRequestId[id];

    let errorMsg = '';
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    } else {
      errorMsg = JSON.stringify(error);
    }

    // Convert error to correct format
    const errorResponse: ErrorResponse = {
      code: ERROR_CODES.USER_REJECT_CODE,
      message: errorMsg,
    };

    try {
      await this.web3Wallet.rejectRequest({
        id: parseInt(id),
        topic,
        error: errorResponse,
      });
    } catch (err) {
      console.warn(
        `WC2::rejectRequest error while rejecting request id=${id} topic=${topic}`,
        err,
      );
    }

    this.needsRedirect(id);
  };

  updateSession = async ({
    chainId,
    accounts,
  }: {
    chainId: string;
    accounts: string[];
  }) => {
    try {
      await this.web3Wallet.updateSession({
        topic: this.session.topic,
        chainId: parseInt(chainId),
        accounts,
      });
    } catch (err) {
      console.warn(
        `WC2::updateSession can't update session topic=${this.session.topic}`,
        err,
      );
    }
  };

  handleRequest = async (requestEvent: SingleEthereumTypes.SessionRequest) => {
    this.topicByRequestId[requestEvent.id] = requestEvent.topic;
    this.requestByRequestId[requestEvent.id] = requestEvent;

    const verified = requestEvent.verifyContext?.verified;
    const hostname = verified?.origin;

    let method = requestEvent.params.request.method;
    const chainId = parseInt(requestEvent.params.chainId);
    const methodParams = requestEvent.params.request.params as any;
    Logger.log(
      `WalletConnect2Session::handleRequest chainId=${chainId} method=${method}`,
      methodParams,
    );

    const networkController = (
      Engine.context as { NetworkController: NetworkController }
    ).NetworkController;
    const selectedChainId = parseInt(networkController.state.network);

    if (selectedChainId !== chainId) {
      await this.web3Wallet.rejectRequest({
        id: chainId,
        topic: this.session.topic,
        error: { code: 1, message: ERROR_MESSAGES.INVALID_CHAIN },
      });
    }

    // Manage redirects
    if (METHODS_TO_REDIRECT[method]) {
      this.requestsToRedirect[requestEvent.id] = true;
    }

    if (method === 'eth_sendTransaction') {
      try {
        const transactionController = (
          Engine.context as { TransactionController: TransactionController }
        ).TransactionController;

        const trx = await transactionController.addTransaction(
          methodParams[0],
          hostname,
          WalletDevice.MM_MOBILE,
        );
        const hash = await trx.result;

        await this.approveRequest({ id: requestEvent.id + '', result: hash });
      } catch (error) {
        await this.rejectRequest({ id: requestEvent.id + '', error });
      }

      return;
    } else if (method === 'eth_signTypedData') {
      // Overwrite 'eth_signTypedData' because otherwise metamask use incorrect param order to parse the request.
      method = 'eth_signTypedData_v3';
    }

    this.backgroundBridge.onMessage({
      name: 'walletconnect-provider',
      data: {
        id: requestEvent.id,
        topic: requestEvent.topic,
        method,
        params: methodParams,
      },
      origin: hostname,
    });
  };
}

export class WC2Manager {
  private static instance: WC2Manager;
  private static _initialized = false;
  private web3Wallet: Client;
  private sessions: { [topic: string]: WalletConnect2Session } = {};
  private deeplinkSessions: {
    [pairingTopic: string]: { redirectUrl?: string; origin: string };
  } = {};

  private constructor(
    web3Wallet: Client,
    deeplinkSessions: {
      [topic: string]: { redirectUrl?: string; origin: string };
    },
  ) {
    this.web3Wallet = web3Wallet;
    this.deeplinkSessions = deeplinkSessions;

    const sessions = web3Wallet.getActiveSessions() || {};

    web3Wallet.on('session_proposal', this.onSessionProposal.bind(this));
    web3Wallet.on('session_request', this.onSessionRequest.bind(this));
    web3Wallet.on(
      'session_delete',
      async (event: SingleEthereumTypes.SessionDelete) => {
        const session = sessions[event.topic];
        if (session && deeplinkSessions[session?.pairingTopic]) {
          delete deeplinkSessions[session.pairingTopic];
          await AsyncStorage.setItem(
            AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
            JSON.stringify(this.deeplinkSessions),
          );
        }
      },
    );

    const preferencesController = (
      Engine.context as { PreferencesController: PreferencesController }
    ).PreferencesController;

    const networkController = (
      Engine.context as { NetworkController: NetworkController }
    ).NetworkController;
    const selectedAddress = preferencesController.state.selectedAddress;
    const chainId = networkController.state.network;

    Object.keys(sessions).forEach(async (sessionKey) => {
      try {
        const session = sessions[sessionKey];

        this.sessions[sessionKey] = new WalletConnect2Session({
          web3Wallet,
          deeplink:
            typeof deeplinkSessions[session.pairingTopic] !== 'undefined',
          session,
        });

        await this.sessions[sessionKey].updateSession({
          chainId,
          accounts: [selectedAddress],
        });
      } catch (err) {
        console.warn(`WC2::init can't update session ${sessionKey}`);
      }
    });
  }

  public static async init() {
    if (this.instance) {
      // already initialized
      return this.instance;
    }

    // Keep at the beginning to prevent double instance from react strict double rendering
    this._initialized = true;

    Logger.log(`WalletConnectV2::init()`);

    let core;
    try {
      if (typeof PROJECT_ID === 'string') {
        core = new Core({
          projectId: PROJECT_ID,
          logger: 'fatal',
        });
      } else {
        throw new Error('WC2::init Init Missing projectId');
      }
    } catch (err) {
      console.warn(`WC2::init Init failed due to ${err}`);
      throw err;
    }

    let web3Wallet;
    const options: SingleEthereumTypes.Options = {
      core: core as any,
      metadata: AppConstants.WALLET_CONNECT.METADATA,
    };
    try {
      web3Wallet = await SingleEthereum.init(options);
    } catch (err) {
      // TODO Sometime needs to init twice --- not sure why...
      web3Wallet = await SingleEthereum.init(options);
    }

    let deeplinkSessions = {};
    try {
      const unparsedDeeplinkSessions = await AsyncStorage.getItem(
        AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
      );

      if (unparsedDeeplinkSessions) {
        deeplinkSessions = JSON.parse(unparsedDeeplinkSessions);
      }
    } catch (err) {
      console.warn(`WC2@init() Failed to parse storage values`);
    }
    this.instance = new WC2Manager(web3Wallet, deeplinkSessions);

    return this.instance;
  }

  public static async getInstance(): Promise<WC2Manager> {
    let waitCount = 1;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.instance) {
          if (waitCount % 10 === 0) {
            Logger.log(
              `WalletConnectV2::getInstance() slow waitCount=${waitCount}`,
            );
          }
          clearInterval(interval);
          resolve(this.instance);
        }
        waitCount += 1;
      }, 100);
    });
  }

  public getSessions(): SessionTypes.Struct[] {
    const actives = this.web3Wallet.getActiveSessions() || {};
    const sessions: SessionTypes.Struct[] = [];
    Object.keys(actives).forEach(async (sessionKey) => {
      const session = actives[sessionKey];
      sessions.push(session);
    });
    return sessions;
  }

  public async removeSession(session: SessionTypes.Struct) {
    try {
      await this.web3Wallet.disconnectSession({
        topic: session.topic,
        error: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT },
      });
    } catch (err) {
      // Fallback method because of bug in wc2 sdk
      await this.web3Wallet.engine.web3wallet.engine.signClient.session.delete(
        session.topic,
        getSdkError('USER_DISCONNECTED'),
      );
    }
  }

  public async removeAll() {
    this.deeplinkSessions = {};
    const actives = this.web3Wallet.getActiveSessions() || {};
    Object.values(actives).forEach(async (session) => {
      this.web3Wallet
        .disconnectSession({
          topic: session.topic,
          error: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT },
        })
        .catch((err) => {
          console.warn(`Can't remove active session ${session.topic}`, err);
        });
    });

    await AsyncStorage.setItem(
      AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
      JSON.stringify(this.deeplinkSessions),
    );
  }

  public async removePendings() {
    const pending = this.web3Wallet.getPendingSessionProposals() || {};
    Object.values(pending).forEach(async (session) => {
      this.web3Wallet
        .rejectSession({
          id: session.id,
          error: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE },
        })
        .catch((err) => {
          console.warn(`Can't remove pending session ${session.id}`, err);
        });
    });

    const requests = this.web3Wallet.getPendingSessionRequests() || [];
    requests.forEach(async (request) => {
      try {
        await this.web3Wallet.rejectRequest({
          id: request.id,
          topic: request.topic,
          error: { code: 1, message: ERROR_MESSAGES.USER_REJECT },
        });
      } catch (err) {
        console.warn(`Can't remove request ${request.id}`, err);
      }
    });
  }

  async onSessionProposal(proposal: SingleEthereumTypes.SessionProposal) {
    //  Open session proposal modal for confirmation / rejection
    const { id, params } = proposal;
    const {
      proposer,
      // requiredNamespaces,
      // optionalNamespaces,
      // sessionProperties,
      // relays,
    } = params;

    Logger.log(`WC2::session_proposal id=${id}`, params);
    const url = proposer.metadata.url ?? '';
    const name = proposer.metadata.description ?? '';
    const icons = proposer.metadata.icons;

    const approvalController = (
      Engine.context as { ApprovalController: ApprovalController }
    ).ApprovalController;

    try {
      await approvalController.add({
        id: `${id}`,
        origin: url,
        requestData: {
          hostname: url,
          peerMeta: {
            url,
            name,
            icons,
            analytics: {
              request_source: AppConstants.REQUEST_SOURCES.WC2,
              request_platform: '', // FIXME use mobile for deeplink or QRCODE
            },
          },
        },
        type: ApprovalTypes.WALLET_CONNECT,
      });
      // Permissions approved.
    } catch (err) {
      // Failed permissions request - reject session
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        error: getSdkError('USER_REJECTED_METHODS'),
      });
    }

    try {
      const preferencesController = (
        Engine.context as { PreferencesController: PreferencesController }
      ).PreferencesController;

      const networkController = (
        Engine.context as { NetworkController: NetworkController }
      ).NetworkController;
      const selectedAddress = preferencesController.state.selectedAddress;
      const chainId = networkController.state.network;

      const activeSession = await this.web3Wallet.approveSession({
        id: proposal.id,
        chainId: parseInt(chainId),
        accounts: [selectedAddress],
      });

      const deeplink =
        typeof this.deeplinkSessions[activeSession.pairingTopic] !==
        'undefined';
      const session = new WalletConnect2Session({
        session: activeSession,
        deeplink,
        web3Wallet: this.web3Wallet,
      });

      this.sessions[activeSession.topic] = session;
      if (deeplink) {
        session.redirect();
      }
    } catch (err) {
      console.error(`invalid wallet status`, err);
    }
  }

  private async onSessionRequest(
    requestEvent: SingleEthereumTypes.SessionRequest,
  ) {
    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    await waitForKeychainUnlocked({ keyringController });

    try {
      const session = this.sessions[requestEvent.topic];

      if (!session) {
        console.warn(`WC2 invalid session topic ${requestEvent.topic}`);
        await this.web3Wallet.rejectRequest({
          topic: requestEvent.topic,
          id: requestEvent.id,
          error: { code: 1, message: ERROR_MESSAGES.INVALID_ID },
        });

        return;
      }

      await session.handleRequest(requestEvent);
    } catch (err) {
      console.error(
        `WC2::onSessionRequest() Error while handling request`,
        err,
      );
    }
  }

  public async connect({
    wcUri,
    redirectUrl,
    origin,
  }: {
    wcUri: string;
    redirectUrl?: string;
    origin: string; // deeplink or qrcode
  }) {
    try {
      Logger.log(
        `WC2Manager::connect ${wcUri} origin=${origin} redirectUrl=${redirectUrl}`,
      );
      const params = parseWalletConnectUri(wcUri);
      const isDeepLink = origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

      const rawParams = getAllUrlParams(wcUri);
      // First check if the url continas sessionTopic, meaning it is only here from an existing connection (so we don't need to create pairing)
      if (rawParams.sessionTopic) {
        const { sessionTopic } = rawParams;
        this.sessions[sessionTopic]?.setDeeplink(true);
        return;
      }

      if (params.version === 1) {
        await WalletConnect.newSession(wcUri, redirectUrl, false, origin);
      } else if (params.version === 2) {
        // check if already connected
        const activeSession = this.getSessions().find(
          (session) =>
            session.topic === params.topic ||
            session.pairingTopic === params.topic,
        );
        if (activeSession) {
          this.sessions[activeSession.topic]?.setDeeplink(isDeepLink);
          return;
        }

        // cleanup uri before pairing.
        const cleanUri = wcUri.startsWith('wc://')
          ? wcUri.replace('wc://', 'wc:')
          : wcUri;
        const paired = await this.web3Wallet.core.pairing.pair({
          uri: cleanUri,
        });
        if (isDeepLink) {
          this.deeplinkSessions[paired.topic] = {
            redirectUrl,
            origin,
          };
          // keep list of deeplinked origin
          await AsyncStorage.setItem(
            AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
            JSON.stringify(this.deeplinkSessions),
          );
        }
      } else {
        console.warn(`Invalid wallet connect uri`, wcUri);
      }
    } catch (err) {
      console.error(`Failed to connect uri=${wcUri}`, err);
    }
  }
}

export default WC2Manager;
