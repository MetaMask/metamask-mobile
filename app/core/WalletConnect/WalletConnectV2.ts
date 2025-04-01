import { AccountsController } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { KeyringController } from '@metamask/keyring-controller';
import { PermissionController } from '@metamask/permission-controller';
import { NavigationContainerRef } from '@react-navigation/native';
import { IWalletKit, WalletKit, WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';

import { updateWC2Metadata } from '../../../app/actions/sdk';
import { selectEvmChainId } from '../../selectors/networkController';
import { store } from '../../store';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import Engine from '../Engine';
import { getPermittedAccounts } from '../Permissions';
import DevLogger from '../SDKConnect/utils/DevLogger';
import getAllUrlParams from '../SDKConnect/utils/getAllUrlParams.util';
import { wait, waitForKeychainUnlocked } from '../SDKConnect/utils/wait.util';
import extractApprovedAccounts from './extractApprovedAccounts';
import WalletConnect from './WalletConnect';
import {
  getScopedPermissions,
  hideWCLoadingState,
  parseWalletConnectUri,
  showWCLoadingState,
  // normalizeOrigin,
  getHostname
} from './wc-utils';

import WalletConnect2Session from './WalletConnect2Session';
const { PROJECT_ID } = AppConstants.WALLET_CONNECT;
export const isWC2Enabled =
  typeof PROJECT_ID === 'string' && PROJECT_ID?.length > 0;

export const ERROR_MESSAGES = {
  INVALID_CHAIN: 'Invalid chainId',
  MANUAL_DISCONNECT: 'Manual disconnect',
  USER_REJECT: 'User reject',
  AUTO_REMOVE: 'Automatic removal',
  INVALID_ID: 'Invalid Id',
};

export class WC2Manager {
  private static instance: WC2Manager;
  private static _initialized = false;
  private navigation?: NavigationContainerRef;
  private web3Wallet: IWalletKit;
  private sessions: { [topic: string]: WalletConnect2Session };
  private deeplinkSessions: {
    [pairingTopic: string]: { redirectUrl?: string; origin: string };
  } = {};

  private constructor(
    web3Wallet: IWalletKit,
    deeplinkSessions: {
      [topic: string]: { redirectUrl?: string; origin: string };
    },
    navigation: NavigationContainerRef,
    sessions: { [topic: string]: WalletConnect2Session } = {},
  ) {
    this.web3Wallet = web3Wallet;
    this.deeplinkSessions = deeplinkSessions;
    this.navigation = navigation;
    this.sessions = sessions;

    DevLogger.log(`WC2Manager::constructor()`, navigation);

    web3Wallet.on('session_proposal', this.onSessionProposal.bind(this));
    web3Wallet.on('session_request', this.onSessionRequest.bind(this));
    web3Wallet.on(
      'session_delete',
      async (event: WalletKitTypes.SessionDelete) => {
        const session =
          this.getSession(event.topic) || this.sessions[event.topic]?.session;
        if (session && deeplinkSessions[session?.pairingTopic]) {
          delete deeplinkSessions[session.pairingTopic];
          await StorageWrapper.setItem(
            AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
            JSON.stringify(this.deeplinkSessions),
          );
        }
        // Remove session from local list
        this.sessions[event.topic]?.removeListeners();
        delete this.sessions[event.topic];
      },
    );

    const accountsController = (
      Engine.context as {
        AccountsController: AccountsController;
      }
    ).AccountsController;

    const selectedInternalAccountChecksummedAddress = toChecksumHexAddress(
      accountsController.getSelectedAccount().address,
    );

    // TODO: Misleading variable name, this is not the chain ID. This should be updated to use the chain ID.
    const chainId = selectEvmChainId(store.getState());
    DevLogger.log(
      `[WC2Manager::constructor chainId=${chainId} type=${typeof chainId}`,
      this.navigation,
    );
    const permissionController = (
      Engine.context as {
        // TODO: Replace 'any' with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;

    const activeSessions = this.getSessions();

    if (activeSessions) {
      activeSessions.forEach(async (session) => {
        const sessionKey = session.topic;
        try {
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
            `WC2::init getPermittedAccounts for ${sessionKey} origin=${getHostname(session.peer.metadata.url)}`,
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
            (await getPermittedAccounts((session.peer.metadata.url))) ?? [];
          const fromOrigin = await getPermittedAccounts(
            (session.peer.metadata.url),
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
              (await getPermittedAccounts(getHostname(session.peer.metadata.url))) ?? [];
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
            `WC2::init updateSession session=${sessionKey} chainId=${chainId} nChainId=${nChainId} selectedAddress=${selectedInternalAccountChecksummedAddress}`,
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

  protected static async initCore(projectId: string | undefined) {
    try {
      if (typeof projectId === 'string' && projectId.length > 0) {
        return new Core({
          projectId,
          logger: 'fatal',
        });
      }
      throw new Error('WC2::init Init Missing projectId');
    } catch (err) {
      console.warn(`WC2::init Init failed due to ${err}`);
      throw err;
    }
  }

  public static async init({
    navigation,
    sessions = {},
  }: {
    navigation: NavigationContainerRef;
    sessions?: { [topic: string]: WalletConnect2Session };
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

    const chainId = parseInt(selectEvmChainId(store.getState()), 16);

    DevLogger.log(
      `WalletConnectV2::init() chainId=${chainId} currentRouteName=${currentRouteName}`,
    );

    const core = await WC2Manager.initCore(PROJECT_ID);

    let web3Wallet;
    // Extract chainId from controller
    const options: WalletKitTypes.Options = {
      core,
      metadata: AppConstants.WALLET_CONNECT.METADATA,
    };

    try {
      web3Wallet = await WalletKit.init(options);
    } catch (err) {
      DevLogger.log(`WC2::init() failed to init -- Try again`, err);
      // TODO Sometime needs to init twice --- not sure why...
      web3Wallet = await WalletKit.init(options);
    }

    let deeplinkSessions = {};
    try {
      const unparsedDeeplinkSessions = await StorageWrapper.getItem(
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
      this.instance = new WC2Manager(web3Wallet, deeplinkSessions, navigation, sessions);
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
    return Object.values(this.web3Wallet.getActiveSessions() || {});
  }

  public getSession(topic: string): SessionTypes.Struct | undefined {
    return this.getSessions().find((session) => session.topic === topic);
  }

  public async removeSession(session: SessionTypes.Struct) {
    try {
      // Use disconnectSession directly
      await this.web3Wallet.disconnectSession({
        topic: session.topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });

      // Remove session from local list
      this.sessions[session.topic]?.removeListeners();
      delete this.sessions[session.topic];

      // Remove associated permissions
      const permissionsController = (
        Engine.context as {
          // TODO: Replace 'any' with type
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
    }
  }

  public async removeAll() {
    this.deeplinkSessions = {};
    const actives = this.web3Wallet.getActiveSessions() || {};
    Object.values(actives).forEach(async (session) => {
      this.web3Wallet
        .disconnectSession({
          topic: session.topic,
          reason: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT },
        })
        .catch((err) => {
          console.warn(`Can't remove active session ${session.topic}`, err);
        });
    });

    // Clear local sessions
    this.sessions = {};

    await StorageWrapper.setItem(
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
          reason: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE },
        })
        .catch((err) => {
          console.warn(`Can't remove pending session ${session.id}`, err);
        });
    });

    const requests = this.web3Wallet.getPendingSessionRequests() || [];
    requests.forEach(async (request) => {
      try {
        await this.web3Wallet.respondSessionRequest({
          topic: request.topic,
          response: {
            id: request.id,
            jsonrpc: '2.0',
            error: { code: 1, message: ERROR_MESSAGES.INVALID_ID },
          },
        });
      } catch (err) {
        console.warn(`Can't remove request ${request.id}`, err);
      }
    });
  }

  async onSessionProposal(proposal: WalletKitTypes.SessionProposal) {
    //console.log('🔵 onSessionProposal proposal', JSON.stringify(proposal, null, 2));

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
        // TODO: Replace 'any' with type
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

    // Normalize origin once
    // const origin = normalizeOrigin(url);
    // Normalizing origin is not working, so we're just using the url as the origin
    const origin = url;
    //console.log('🔴 onSessionProposal origin', origin);

    DevLogger.log(
      `WC2::session_proposal metadata ${url} normalized to ${origin}`,
    );

    // Save Connection info to redux store to be retrieved in ui.
    store.dispatch(updateWC2Metadata({ url, name, icon, id: `${id}` }));

    try {
      await permissionsController.requestPermissions(
        { origin: url },
        {
          eth_accounts: {},
        },
      );
    } catch (err) {
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });
      return;
    }

    try {
      const approvedAccounts = await getPermittedAccounts(origin);
      //console.log('🔵 onSessionProposal approvedAccounts', JSON.stringify(approvedAccounts, null, 2));
      const walletChainIdHex = selectEvmChainId(store.getState());
      const walletChainIdDecimal = parseInt(walletChainIdHex, 16);
      //console.log('🔵 onSessionProposal walletChainIdDecimal', walletChainIdDecimal);

      // Use getScopedPermissions to get properly formatted namespaces
      const namespaces = await getScopedPermissions({ origin });
      //console.log('🔵 onSessionProposal namespaces', JSON.stringify(namespaces, null, 2));

      DevLogger.log(`WC2::session_proposal namespaces`, namespaces);

      const activeSession = await this.web3Wallet.approveSession({
        id: proposal.id,
        namespaces,
      });

      const deeplink = !!this.deeplinkSessions[activeSession.pairingTopic];
      const session = new WalletConnect2Session({
        session: activeSession,
        channelId: `${proposal.id}`,
        deeplink,
        web3Wallet: this.web3Wallet,
        navigation: this.navigation,
      });

      this.sessions[activeSession.topic] = session;

      // Immediately notify dapp of wallet's active chain
      await session.updateSession({
        chainId: walletChainIdDecimal,
        accounts: approvedAccounts,
      });
      await this.web3Wallet.emitSessionEvent({
        topic: activeSession.topic,
        event: {
          name: 'chainChanged',
          data: walletChainIdHex,
        },
        chainId: `eip155:${walletChainIdDecimal}`,
      });

      if (deeplink) {
        session.redirect('onSessionProposal');
      }
    } catch (err) {
      console.error(`invalid wallet status`, err);
    } finally {
      store.dispatch(
        updateWC2Metadata({
          url: '',
          name: '',
          icon: '',
          id: '',
        }),
      );
    }
  }

  private async onSessionRequest(requestEvent: WalletKitTypes.SessionRequest) {
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
        await this.web3Wallet.respondSessionRequest({
          topic: requestEvent.topic,
          response: {
            id: requestEvent.id,
            jsonrpc: '2.0',
            error: { code: 1, message: ERROR_MESSAGES.INVALID_ID },
          },
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
        const session = this.sessions[sessionTopic];
        if (session) {
          session.setDeeplink(true);

          if (!session.isHandlingRequest()) {
            showWCLoadingState({ navigation: this.navigation });
          }
          return;
        }

        // If the session is not found, we need to create a new session
        // but this should never happen?
        console.warn(`WC2Manager::connect session not found for sessionTopic=${sessionTopic}`);
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
          await StorageWrapper.setItem(
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
