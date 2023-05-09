import AppConstants from '../AppConstants';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';
import Minimizer from 'react-native-minimizer';

import { ApprovalController } from '@metamask/approval-controller';
import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import Logger from '../../util/Logger';

import { NetworkController } from '@metamask/network-controller';
import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';

// disable linting as core is included from se-sdk,
// including it in package.json overwrites sdk deps and create error
// eslint-disable-next-line import/no-extraneous-dependencies
import { Core } from '@walletconnect/core';
import { ErrorResponse } from '@walletconnect/jsonrpc-types';
import Client, {
  SingleEthereum,
  SingleEthereumTypes,
} from '@walletconnect/se-sdk';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import Engine from '../Engine';
import { wait, waitForKeychainUnlocked } from '../SDKConnect/utils/wait.util';
import WalletConnect from '../WalletConnect';
import parseWalletConnectUri from './wc-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import METHODS_TO_REDIRECT from './wc-config';

const ERROR_MESSAGES = {
  INVALID_CHAIN: 'Invalid chainId',
  MANUAL_DISCONNECT: 'Manual disconnect',
  USER_REJECT: 'User reject',
  AUTO_REMOVE: 'Automatic removal',
  INVALID_ID: 'Invalid Id',
};

class WalletConnect2Session {
  private backgroundBridge: BackgroundBridge;
  private web3Wallet: Client;
  private deeplink: boolean;
  private session: SessionTypes.Struct;
  private requestsToRedirect: { [request: string]: boolean } = {};
  private topicByRequestId: { [requestId: string]: string } = {};

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

  redirect = () => {
    if (!this.deeplink) return;

    setTimeout(() => {
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

    try {
      await this.web3Wallet.rejectRequest({
        id: parseInt(id),
        topic,
        error: error as ErrorResponse,
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
      console.warn(`WC2::updateSession can't update session`, this.session);
    }
  };

  handleRequest = async (
    requestEvent: SignClientTypes.EventArguments['session_request'],
  ) => {
    this.topicByRequestId[requestEvent.id] = requestEvent.topic;

    const hostname = requestEvent.context.verified.origin;
    let method = requestEvent.params.request.method;
    const chainId = requestEvent.params.chainId;
    const methodParams = requestEvent.params.request.params;
    Logger.log(
      `WalletConnect2Session::handleRequest chainId=${chainId} method=${method}`,
      methodParams,
    );

    const networkController = (
      Engine.context as { NetworkController: NetworkController }
    ).NetworkController;
    const selectedChainId = networkController.state.network;

    if (selectedChainId !== chainId) {
      await this.web3Wallet.rejectRequest({
        id: parseInt(chainId),
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
          methodParams,
          hostname,
          WalletDevice.MM_MOBILE,
        );
        const hash = trx.result;

        this.approveRequest({ id: requestEvent.id + '', result: hash });
      } catch (error) {
        this.rejectRequest({ id: requestEvent.id + '', error });
      }

      return;
    } else if (method === 'eth_signTypedData') {
      // Overwrite 'eth_signTypedData' because otherwise metamask use incorrect param order to parse the request.
      method = 'eth_signTypedData_v3';
    }

    const origin = requestEvent.context.verified.origin;

    this.backgroundBridge.onMessage({
      name: 'walletconnect-provider',
      data: {
        id: requestEvent.id,
        topic: requestEvent.topic,
        method,
        params: methodParams,
      },
      origin,
    });
  };
}

export class WC2Manager {
  private static instance: WC2Manager;
  private static _initialized = false;
  private web3Wallet: Client;
  private sessions: { [topic: string]: WalletConnect2Session } = {};
  private deeplinkSessions: { [pairingTopic: string]: boolean } = {};

  private constructor(
    web3Wallet: Client,
    deeplinkSessions: { [topic: string]: boolean },
  ) {
    this.web3Wallet = web3Wallet;
    this.deeplinkSessions = deeplinkSessions;

    const sessions = web3Wallet.getActiveSessions() || {};

    web3Wallet.on('session_proposal', this.onSessionProposal.bind(this));
    web3Wallet.on('session_request', this.onSessionRequest.bind(this));
    web3Wallet.on(
      'session_delete',
      (event: SingleEthereumTypes.SessionDelete) => {
        const session = sessions[event.topic];
        if (session && deeplinkSessions[session?.pairingTopic]) {
          delete deeplinkSessions[session.pairingTopic];
          AsyncStorage.setItem(
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
          deeplink: deeplinkSessions[session.pairingTopic],
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
    if (this._initialized) {
      // already initialized
      return;
    }

    // Keep at the beginning to prevent double instance from react strict double rendering
    this._initialized = true;

    // Give time for the wallet to initialize.
    await wait(3000);

    // needs text-encoding package
    const core = new Core({
      projectId: AppConstants.WALLET_CONNECT.PROJECT_ID,
      // logger: 'debug',
    });

    const web3Wallet = await SingleEthereum.init({
      core,
      metadata: AppConstants.WALLET_CONNECT.METADATA,
    });

    const unparsedDeeplinkSessions = await AsyncStorage.getItem(
      AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
    );
    let deeplinkSessions = {};
    if (unparsedDeeplinkSessions) {
      deeplinkSessions = JSON.parse(unparsedDeeplinkSessions);
    }

    this.instance = new WC2Manager(web3Wallet, deeplinkSessions);

    // Remove pending requests
    await this.instance.removePendings();
  }

  public static getInstance(): WC2Manager {
    if (!WC2Manager.instance) {
      throw new Error(`WalletConnectV2 manager not initalized`);
    }

    return WC2Manager.instance;
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
    await this.web3Wallet.disconnectSession({
      topic: session.topic,
      error: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT },
    });
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

    AsyncStorage.setItem(
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

  async onSessionProposal(
    proposal: SignClientTypes.EventArguments['session_proposal'],
  ) {
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
              request_platform: '',
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

      const deeplink = this.deeplinkSessions[activeSession.pairingTopic];
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
    requestEvent: SignClientTypes.EventArguments['session_request'],
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

      session.handleRequest(requestEvent);
    } catch (err) {
      console.error(`Error while handling request`, err);
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
    // request deeplink format:
    // metamask:///wc?requestId=undefined&sessionTopic=ee0efc673575ab2279f3c76e496f8da48b9acc39fb3af24d4eb8b99cb62d954f
    try {
      Logger.log(`WC2Manager::connect ${wcUri} origin=${origin}`, redirectUrl);
      const params = parseWalletConnectUri(wcUri);

      if (params.version === 1) {
        await WalletConnect.newSession(wcUri, redirectUrl, false, origin);
      } else if (params.version === 2) {
        const paired = await this.web3Wallet.core.pairing.pair({
          uri: wcUri,
        });
        if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
          this.deeplinkSessions[paired.topic] = true;
          // keep list of deeplinked origin
          AsyncStorage.setItem(
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
