import AppConstants from '../AppConstants';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import { Minimizer } from '../NativeModules';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';

import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import Logger from '../../util/Logger';

import { WalletDevice } from '@metamask/transaction-controller';

import { PermissionController } from '@metamask/permission-controller';
import { NavigationContainerRef } from '@react-navigation/native';
import { Core } from '@walletconnect/core';
import { ErrorResponse } from '@walletconnect/jsonrpc-types';
import Client, {
  SingleEthereum,
  SingleEthereumTypes,
} from '@walletconnect/se-sdk';
import { SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';
import { Platform } from 'react-native';
import { updateWC2Metadata } from '../../../app/actions/sdk';
import Routes from '../../../app/constants/navigation/Routes';
import ppomUtil from '../../../app/lib/ppom/ppom-util';
import { WALLET_CONNECT_ORIGIN } from '../../../app/util/walletconnect';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import MMKVWrapper from '../../store/mmkv-wrapper';
import Device from '../../util/device';
import { addTransaction } from '../../util/transaction-controller';
import Engine from '../Engine';
import { getPermittedAccounts } from '../Permissions';
import DevLogger from '../SDKConnect/utils/DevLogger';
import getAllUrlParams from '../SDKConnect/utils/getAllUrlParams.util';
import { wait, waitForKeychainUnlocked } from '../SDKConnect/utils/wait.util';
import WalletConnect from './WalletConnect';
import extractApprovedAccounts from './extractApprovedAccounts';
import METHODS_TO_REDIRECT from './wc-config';
import parseWalletConnectUri, {
  hideWCLoadingState,
  showWCLoadingState,
} from './wc-utils';
import { getDefaultNetworkByChainId } from '../../util/networks';

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
  private navigation?: NavigationContainerRef;
  private web3Wallet: Client;
  private deeplink: boolean;
  // timeoutRef is used on android to prevent automatic redirect on switchChain and wait for wallet_addEthereumChain.
  // If addEthereumChain is not received after 3 seconds, it will redirect.
  private timeoutRef: NodeJS.Timeout | null = null;
  private session: SessionTypes.Struct;
  private requestsToRedirect: { [request: string]: boolean } = {};
  private topicByRequestId: { [requestId: string]: string } = {};
  private requestByRequestId: {
    [requestId: string]: SingleEthereumTypes.SessionRequest;
  } = {};

  constructor({
    web3Wallet,
    session,
    navigation,
    channelId,
    deeplink,
  }: {
    web3Wallet: Client;
    channelId: string;
    session: SessionTypes.Struct;
    deeplink: boolean;
    navigation?: NavigationContainerRef;
  }) {
    this.web3Wallet = web3Wallet;
    this.deeplink = deeplink;
    this.session = session;
    DevLogger.log(
      `WalletConnect2Session::constructor channelId=${channelId} deeplink=${deeplink}`,
      navigation,
    );
    this.navigation = navigation;

    const url = session.peer.metadata.url;
    const name = session.peer.metadata.name;
    const icons = session.peer.metadata.icons;

    DevLogger.log(
      `WalletConnect2Session::constructor topic=${session.topic} pairingTopic=${session.pairingTopic}`,
    );
    this.backgroundBridge = new BackgroundBridge({
      webview: null,
      url,
      isWalletConnect: true,
      channelId,
      wcRequestActions: {
        approveRequest: this.approveRequest.bind(this),
        rejectRequest: this.rejectRequest.bind(this),
        updateSession: this.updateSession.bind(this),
      },
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        hostname: string;
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname: url,
          getProviderState,
          channelId,
          setApprovedHosts: () => false,
          getApprovedHosts: () => false,
          analytics: {},
          isMMSDK: false,
          isHomepage: () => false,
          fromHomepage: { current: false },
          approveHost: () => false,
          injectHomePageScripts: () => false,
          navigation: this.navigation,
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

    // Check for pending unresolved requests
    const pendingSessionRequests = web3Wallet.getPendingSessionRequests();
    if (pendingSessionRequests) {
      pendingSessionRequests.forEach(async (request) => {
        DevLogger.log(
          `WC2::constructor pendingSessionRequests requestId=${request.id}`,
        );
        try {
          if (request.topic === session.topic) {
            await this.handleRequest(request);
          } else {
            console.warn(
              `WC2::constructor invalid request topic=${request.topic}`,
            );
          }
        } catch (error) {
          Logger.error(
            error as Error,
            `WC2::constructor error while handling request`,
          );
        }
      });
    }
  }

  setDeeplink = (deeplink: boolean) => {
    this.deeplink = deeplink;
  };

  redirect = (context?: string) => {
    DevLogger.log(
      `WC2::redirect context=${context} isDeeplink=${
        this.deeplink
      } navigation=${this.navigation !== undefined}`,
    );
    if (!this.deeplink) return;

    const navigation = this.navigation;
    setTimeout(() => {
      if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
        // TODO: implement uri scheme redirection where available
        navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
        });
      } else {
        Minimizer.goBack();
      }
    }, 100);
  };

  needsRedirect = (id: string) => {
    if (this.requestsToRedirect[id]) {
      delete this.requestsToRedirect[id];
      this.redirect(`needsRedirect_${id}`);
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
          // TODO: check what happens after adding a new network -- waiting was initially made to handle that scenario
          DevLogger.log(`SKIP: waitForNetworkModalOnboarding`);
          // await waitForNetworkModalOnboarding({
          //   chainId: parseInt(chainId) + '',
          // });
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

    const requests = this.web3Wallet.getPendingSessionRequests() || [];

    const hasPendingSignRequest =
      requests[0]?.params?.request?.method === 'personal_sign';

    if (!hasPendingSignRequest) {
      this.needsRedirect(id);
    }
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
    chainId: number;
    accounts?: string[];
  }) => {
    try {
      if (!accounts) {
        DevLogger.log(
          `Invalid accounts --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        return;
      }

      if (accounts?.length === 0) {
        console.warn(
          `WC2::updateSession invalid accounts --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        const permissionController = (
          Engine.context as {
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            PermissionController: PermissionController<any, any>;
          }
        ).PermissionController;
        const origin = this.session.peer.metadata.url;
        // Try to find matching permitted accounts
        const approvedAccounts = await getPermittedAccounts(origin);
        if (approvedAccounts.length > 0) {
          DevLogger.log(
            `WC2::updateSession found approved accounts`,
            approvedAccounts,
          );
          accounts = approvedAccounts;
        } else {
          console.warn(
            `WC2::updateSession no permitted accounts found for topic=${this.session.topic} origin=${origin}`,
            permissionController.state,
          );
          return;
        }
      }
      if (chainId === 0) {
        DevLogger.log(
          `WC2::updateSession invalid chainId --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        // overwrite chainId with actual value.
        const selectedChainId = parseInt(selectChainId(store.getState()));
        DevLogger.log(
          `WC2::updateSession overwrite invalid chain Id with selectedChainId=${selectedChainId}`,
        );
        chainId = selectedChainId;
      }
      await this.web3Wallet.updateSession({
        topic: this.session.topic,
        chainId,
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
    DevLogger.log(
      `WalletConnect2Session::handleRequest id=${requestEvent.id} topic=${requestEvent.topic} method=${requestEvent.params.request.method}`,
      requestEvent,
    );
    this.topicByRequestId[requestEvent.id] = requestEvent.topic;
    this.requestByRequestId[requestEvent.id] = requestEvent;
    if (this.timeoutRef) {
      // Always clear the timeout ref on new message, it is only used for wallet_switchEthereumChain auto reject on android
      clearTimeout(this.timeoutRef);
    }

    hideWCLoadingState({ navigation: this.navigation });
    const verified = requestEvent.verifyContext?.verified;
    const hostname = verified?.origin;
    const origin = WALLET_CONNECT_ORIGIN + hostname; // allow correct origin for analytics with eth_sendTtansaction

    let method = requestEvent.params.request.method;
    const chainId = parseInt(requestEvent.params.chainId);

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methodParams = requestEvent.params.request.params as any;

    DevLogger.log(
      `WalletConnect2Session::handleRequest chainId=${chainId} method=${method}`,
      JSON.stringify(methodParams, null, 2),
    );

    // TODO: Misleading variable name, this is not the chain ID. This should be updated to use the chain ID.
    const selectedChainId = parseInt(selectChainId(store.getState()));

    if (selectedChainId !== chainId) {
      DevLogger.log(
        `rejectRequest due to invalid chainId ${chainId} (selectedChainId=${selectedChainId})`,
      );
      await this.web3Wallet.rejectRequest({
        id: requestEvent.id,
        topic: this.session.topic,
        error: { code: 1, message: ERROR_MESSAGES.INVALID_CHAIN },
      });
    }

    // Android specific logic to prevent automatic redirect on switchChain and let the dapp call wallet_addEthereumChain on error.
    if (
      method.toLowerCase() === RPC_WALLET_SWITCHETHEREUMCHAIN.toLowerCase() &&
      Device.isAndroid()
    ) {
      // extract first chainId param from request array
      const params = requestEvent.params.request.params as [
        { chainId?: string },
      ];
      const _chainId = params[0]?.chainId;
      DevLogger.log(
        `formatting chainId=>${chainId} ==> 0x${chainId.toString(16)}`,
      );
      const networkConfigurations = selectNetworkConfigurations(
        store.getState(),
      );
      const existingNetworkDefault = getDefaultNetworkByChainId(_chainId);
      const existingEntry = Object.entries(networkConfigurations).find(
        ([, networkConfiguration]) => networkConfiguration.chainId === _chainId,
      );
      DevLogger.log(
        `rpcMiddleWare -- check for auto rejection (_chainId=${_chainId}) networkConfigurations=${JSON.stringify(
          networkConfigurations,
        )} existingEntry=${existingEntry} existingNetworkDefault=${existingNetworkDefault}`,
      );
      if (!existingEntry && !existingNetworkDefault) {
        DevLogger.log(
          `SKIP rpcMiddleWare -- auto rejection is detected android (_chainId=${_chainId})`,
        );
        await this.web3Wallet.rejectRequest({
          id: requestEvent.id,
          topic: requestEvent.topic,
          error: { code: 32603, message: ERROR_MESSAGES.INVALID_CHAIN },
        });

        showWCLoadingState({ navigation: this.navigation });
        this.timeoutRef = setTimeout(() => {
          DevLogger.log(`wc2::timeoutRef redirecting...`);
          hideWCLoadingState({ navigation: this.navigation });
          // Redirect or do nothing if timer gets cleared upon receiving wallet_addEthereumChain after automatic reject
          this.redirect('handleRequestTimeout');
        }, 3000);
        return;
      }
    }

    // Manage redirects
    if (METHODS_TO_REDIRECT[method]) {
      this.requestsToRedirect[requestEvent.id] = true;
    }

    if (method === 'eth_sendTransaction') {
      try {
        const trx = await addTransaction(methodParams[0], {
          origin,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          securityAlertResponse: undefined,
        });

        const id = trx.transactionMeta.id;
        const reqObject = {
          id: requestEvent.id,
          jsonrpc: '2.0',
          method,
          origin,
          params: [
            {
              from: methodParams[0].from,
              to: methodParams[0].to,
              value: methodParams[0]?.value,
              data: methodParams[0]?.data,
            },
          ],
        };

        ppomUtil.validateRequest(reqObject, id);

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
      origin,
    });
  };
}

export class WC2Manager {
  private static instance: WC2Manager;
  private static _initialized = false;
  private navigation?: NavigationContainerRef;
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
    navigation: NavigationContainerRef,
  ) {
    this.web3Wallet = web3Wallet;
    this.deeplinkSessions = deeplinkSessions;
    this.navigation = navigation;

    const sessions = web3Wallet.getActiveSessions
      ? web3Wallet.getActiveSessions()
      : {};

    DevLogger.log(`WC2Manager::constructor()`, navigation);

    web3Wallet.on('session_proposal', this.onSessionProposal.bind(this));
    web3Wallet.on('session_request', this.onSessionRequest.bind(this));
    web3Wallet.on(
      'session_delete',
      async (event: SingleEthereumTypes.SessionDelete) => {
        const session = sessions?.[event.topic];
        if (session && deeplinkSessions[session?.pairingTopic]) {
          delete deeplinkSessions[session.pairingTopic];
          await MMKVWrapper.setItem(
            AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
            JSON.stringify(this.deeplinkSessions),
          );
        }
      },
    );

    const preferencesController = (
      Engine.context as { PreferencesController: PreferencesController }
    ).PreferencesController;
    const selectedAddress = preferencesController.state.selectedAddress;

    // TODO: Misleading variable name, this is not the chain ID. This should be updated to use the chain ID.
    const chainId = selectChainId(store.getState());
    DevLogger.log(
      `[WC2Manager::constructor chainId=${chainId} type=${typeof chainId}`,
      this.navigation,
    );
    const permissionController = (
      Engine.context as {
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;

    if (sessions) {
      Object.keys(sessions).forEach(async (sessionKey) => {
        try {
          const session = sessions[sessionKey];

          this.sessions[sessionKey] = new WalletConnect2Session({
            web3Wallet,
            channelId: sessionKey,
            navigation: this.navigation,
            deeplink:
              typeof deeplinkSessions[session.pairingTopic] !== 'undefined',
            session,
          });

          // Find approvedAccounts for current sessions
          DevLogger.log(
            `WC2::init getPermittedAccounts for ${sessionKey} origin=${session.peer.metadata.url}`,
            JSON.stringify(permissionController.state, null, 2),
          );
          const accountPermission = permissionController.getPermission(
            session.peer.metadata.url,
            'eth_accounts',
          );

          DevLogger.log(
            `WC2::init accountPermission`,
            JSON.stringify(accountPermission, null, 2),
          );
          let approvedAccounts =
            (await getPermittedAccounts(accountPermission?.id ?? '')) ?? [];
          const fromOrigin = await getPermittedAccounts(
            session.peer.metadata.url,
          );

          DevLogger.log(
            `WC2::init approvedAccounts id ${accountPermission?.id}`,
            approvedAccounts,
          );
          DevLogger.log(
            `WC2::init fromOrigin ${session.peer.metadata.url}`,
            fromOrigin,
          );

          // fallback to origin from metadata url
          if (approvedAccounts.length === 0) {
            DevLogger.log(
              `WC2::init fallback to metadata url ${session.peer.metadata.url}`,
            );
            approvedAccounts =
              (await getPermittedAccounts(session.peer.metadata.url)) ?? [];
          }

          if (approvedAccounts?.length === 0) {
            DevLogger.log(
              `WC2::init fallback to parsing accountPermission`,
              accountPermission,
            );
            // FIXME: Why getPermitted accounts doesn't work???
            approvedAccounts = extractApprovedAccounts(accountPermission);
            DevLogger.log(`WC2::init approvedAccounts`, approvedAccounts);
          }

          const nChainId = parseInt(chainId, 16);
          DevLogger.log(
            `WC2::init updateSession session=${sessionKey} chainId=${chainId} nChainId=${nChainId} selectedAddress=${selectedAddress}`,
            approvedAccounts,
          );
          await this.sessions[sessionKey].updateSession({
            chainId: nChainId,
            accounts: approvedAccounts,
          });
        } catch (err) {
          console.warn(`WC2::init can't update session ${sessionKey}`);
        }
      });
    }
  }

  public static async init({
    navigation,
  }: {
    navigation: NavigationContainerRef;
  }) {
    if (!navigation) {
      console.warn(`WC2::init missing navigation --- SKIP INIT`);
      return;
    }

    if (this.instance || this._initialized) {
      DevLogger.log(`WC2::init already initialized`);
      // already initialized
      return this.instance;
    }
    // Keep at the beginning to prevent double instance from react strict double rendering
    this._initialized = true;

    await wait(1000); // add delay to let the keyringController to be initialized

    // Wait for keychain to be unlocked before initializing WalletConnect
    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    await waitForKeychainUnlocked({
      keyringController,
      context: 'WalletConnectV2::init',
    });
    const currentRouteName = navigation.getCurrentRoute()?.name;

    let core;
    const chainId = parseInt(selectChainId(store.getState()), 16);

    DevLogger.log(
      `WalletConnectV2::init() chainId=${chainId} currentRouteName=${currentRouteName}`,
    );

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
    // Extract chainId from controller
    const options: SingleEthereumTypes.Options = {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      core: core as any,
      chainId,
      metadata: AppConstants.WALLET_CONNECT.METADATA,
    };

    try {
      web3Wallet = await SingleEthereum.init(options);
    } catch (err) {
      DevLogger.log(`WC2::init() failed to init -- Try again`, err);
      // TODO Sometime needs to init twice --- not sure why...
      web3Wallet = await SingleEthereum.init(options);
    }

    let deeplinkSessions = {};
    try {
      const unparsedDeeplinkSessions = await MMKVWrapper.getItem(
        AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
      );

      if (unparsedDeeplinkSessions) {
        deeplinkSessions = JSON.parse(unparsedDeeplinkSessions);
      }
    } catch (err) {
      console.warn(`WC2@init() Failed to parse storage values`);
    }

    try {
      // Add delay before returning instance
      await wait(1000);
      this.instance = new WC2Manager(web3Wallet, deeplinkSessions, navigation);
    } catch (error) {
      Logger.error(error as Error, `WC2@init() failed to create instance`);
    }

    return this.instance;
  }

  public static async getInstance(): Promise<WC2Manager> {
    let waitCount = 1;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.instance) {
          if (waitCount % 10 === 0) {
            DevLogger.log(
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
      // Remove associated permissions
      const permissionsController = (
        Engine.context as {
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          PermissionController: PermissionController<any, any>;
        }
      ).PermissionController;
      DevLogger.log(
        `WC2::removeSession revokeAllPermissions for ${session.topic}`,
        permissionsController.state,
      );
      permissionsController.revokeAllPermissions(session.topic);
    } catch (err) {
      DevLogger.log(`WC2::removeSession error while disconnecting`, err);
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

    await MMKVWrapper.setItem(
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

    const pairingTopic = proposal.params.pairingTopic;
    DevLogger.log(
      `WC2::session_proposal id=${id} pairingTopic=${pairingTopic}`,
      params,
    );

    hideWCLoadingState({ navigation: this.navigation });

    const permissionsController = (
      Engine.context as {
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;

    const { proposer } = params;
    const { metadata } = proposer;
    const url = metadata.url ?? '';
    const name = metadata.description ?? '';
    const icons = metadata.icons;
    const icon = icons?.[0] ?? '';
    // Save Connection info to redux store to be retrieved in ui.
    store.dispatch(updateWC2Metadata({ url, name, icon, id: `${id}` }));

    try {
      await permissionsController.requestPermissions(
        { origin: url },
        { eth_accounts: {} },
        // { id: undefined }, // Don't set id here, it will be set after session is created, identify via origin.
      );
      // Permissions approved.
    } catch (err) {
      // Failed permissions request - reject session
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        error: getSdkError('USER_REJECTED_METHODS'),
      });
      return;
    }

    try {
      // use Permission controller
      const approvedAccounts = await getPermittedAccounts(url);
      // TODO: Misleading variable name, this is not the chain ID. This should be updated to use the chain ID.
      const chainId = selectChainId(store.getState());
      DevLogger.log(
        `WC2::session_proposal getPermittedAccounts for id=${id} hostname=${url}, chainId=${chainId}`,
        approvedAccounts,
      );

      const activeSession = await this.web3Wallet.approveSession({
        id: proposal.id,
        chainId: parseInt(chainId),
        accounts: approvedAccounts,
      });
      const deeplink =
        typeof this.deeplinkSessions[activeSession.pairingTopic] !==
        'undefined';
      const session = new WalletConnect2Session({
        session: activeSession,
        channelId: '' + proposal.id,
        deeplink,
        web3Wallet: this.web3Wallet,
        navigation: this.navigation,
      });

      this.sessions[activeSession.topic] = session;
      if (deeplink) {
        session.redirect('onSessionProposal');
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
    await waitForKeychainUnlocked({
      keyringController,
      context: 'WalletConnectV2::onSessionRequest',
    });

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

  public isWalletConnect(origin: string) {
    const sessions = this.getSessions();
    return sessions.some((session) => session.peer.metadata.url === origin);
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
        `WC2Manager::connect ${wcUri} origin=${origin} redirectUrl=${redirectUrl} navigation=${
          this.navigation !== undefined
        }`,
      );
      const params = parseWalletConnectUri(wcUri);
      const isDeepLink = origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

      const rawParams = getAllUrlParams(wcUri);
      // First check if the url continas sessionTopic, meaning it is only here from an existing connection (so we don't need to create pairing)
      if (rawParams.sessionTopic) {
        const { sessionTopic } = rawParams;
        this.sessions[sessionTopic]?.setDeeplink(true);
        showWCLoadingState({ navigation: this.navigation });
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
        showWCLoadingState({ navigation: this.navigation });

        const paired = await this.web3Wallet.core.pairing.pair({
          uri: cleanUri,
        });
        if (isDeepLink) {
          DevLogger.log(
            `WC2::connect deeplink paired=${paired.topic} show loading modal`,
          );
          this.deeplinkSessions[paired.topic] = {
            redirectUrl,
            origin,
          };
          // keep list of deeplinked origin
          await MMKVWrapper.setItem(
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
