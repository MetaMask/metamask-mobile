import { AccountsController } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { KeyringController } from '@metamask/keyring-controller';
import { PermissionController } from '@metamask/permission-controller';
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
import {
  getDefaultCaip25CaveatValue,
  getPermittedAccounts,
  updatePermittedChains,
} from '../Permissions';
import DevLogger from '../SDKConnect/utils/DevLogger';
import getAllUrlParams from '../SDKConnect/utils/getAllUrlParams.util';
import { wait, waitForKeychainUnlocked } from '../SDKConnect/utils/wait.util';
import extractApprovedAccounts from './extractApprovedAccounts';
import WalletConnect from './WalletConnect';
import {
  getHostname,
  getScopedPermissions,
  hideWCLoadingState,
  parseWalletConnectUri,
  showWCLoadingState,
} from './wc-utils';

import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import WalletConnect2Session from './WalletConnect2Session';
import { CaipChainId } from '@metamask/utils';
import NavigationService from '../NavigationService';
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
  private navigation?: TypedNavigationContainerRef;
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
    navigation: TypedNavigationContainerRef,
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
        const pairingTopic = session.pairingTopic;
        try {
          const wcSession = new WalletConnect2Session({
            web3Wallet,
            channelId: pairingTopic,
            navigation: this.navigation,
            deeplink:
              typeof deeplinkSessions[session.pairingTopic] !== 'undefined',
            session,
          });
          this.sessions[sessionKey] = wcSession;

          // Find approvedAccounts for current sessions
          DevLogger.log(
            `WC2::init getPermittedAccounts for ${sessionKey} origin=${sessionKey}`,
            JSON.stringify(permissionController.state, null, 2),
          );
          const accountPermission = permissionController.getPermission(
            pairingTopic,
            'eth_accounts',
          );

          DevLogger.log(
            `WC2::init accountPermission`,
            JSON.stringify(accountPermission, null, 2),
          );

          let approvedAccounts = getPermittedAccounts(pairingTopic) ?? [];

          DevLogger.log(
            `WC2::init approvedAccounts id ${accountPermission?.id}`,
            approvedAccounts,
          );

          if (approvedAccounts?.length === 0) {
            DevLogger.log(
              `WC2::init fallback to parsing accountPermission`,
              accountPermission,
            );
            // FIXME: Why getPermitted accounts doesn't work???
            approvedAccounts = extractApprovedAccounts(accountPermission);
            DevLogger.log(`WC2::init approvedAccounts`, approvedAccounts);
          }

          updatePermittedChains(
            pairingTopic,
            wcSession.getAllowedChainIds,
            true,
          );

          const chainId = wcSession.getCurrentChainId();

          const nChainId = parseInt(chainId, 16);
          DevLogger.log(
            `WC2::init updateSession session=${pairingTopic} chainId=${chainId} nChainId=${nChainId} selectedAddress=${selectedInternalAccountChecksummedAddress}`,
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
    sessions = {},
  }: {
    sessions?: { [topic: string]: WalletConnect2Session };
  }) {
    if (!isWC2Enabled) {
      console.warn(`WC2::init WC2 is not enabled --- SKIP INIT`);

      //If WC is not enabled, we don't need to initialize it
      return;
    }

    const navigation = NavigationService.navigation;

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
      this.instance = new WC2Manager(
        web3Wallet,
        deeplinkSessions,
        navigation,
        sessions,
      );
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
    //  Open session proposal modal for confirmation / rejection
    const { id, params } = proposal;

    const pairingTopic = proposal.params.pairingTopic;
    const channelId = `${pairingTopic}`;
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

    // Extract the hostname to ensure we're consistent with permission checks
    const hostname = getHostname(url);
    // Keep the full url for logging and UI display
    const origin = url;

    DevLogger.log(
      `WC2::session_proposal metadata url=${origin} normalized to hostname=${hostname}`,
    );

    // Save Connection info to redux store to be retrieved in ui.
    store.dispatch(updateWC2Metadata({ url, name, icon, id: `${id}` }));

    // Get the current chain ID to include in permissions
    const walletChainIdHex = selectEvmChainId(store.getState());
    const walletChainIdDecimal = parseInt(walletChainIdHex, 16);

    try {
      // Create a modified CAIP-25 caveat value that includes the current chain
      const caveatValue = getDefaultCaip25CaveatValue();

      // Important: Use hostname as the origin for permission request to ensure consistency
      DevLogger.log(
        `WC2::session_proposal requestPermissions for hostname and channelId`,
        {
          hostname,
          caveatValue,
          channelId,
        },
      );

      // Request permissions via the permissions controller
      await permissionsController.requestPermissions(
        { origin: channelId },
        {
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: caveatValue,
              },
            ],
          },
        },
      );

      // Add a small delay to ensure permission is fully recorded
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Explicitly add the current chain to permissions
      try {
        const hexChainId = `0x${walletChainIdDecimal.toString(
          16,
        )}` as `0x${string}`;
        DevLogger.log(
          `WC2::session_proposal ensuring chain ${hexChainId} is permitted for ${hostname}`,
        );

        updatePermittedChains(channelId, [`eip155:${walletChainIdDecimal}`]);
        DevLogger.log(
          `WC2::session_proposal chain permission added successfully`,
        );
      } catch (err) {
        DevLogger.log(
          `WC2::session_proposal error adding chain permission`,
          err,
        );
      }
    } catch (err) {
      DevLogger.log(`WC2::session_proposal requestPermissions error`, {
        err,
      });
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });
      return;
    }

    try {
      // Use the hostname for consistent permissions
      const approvedAccounts = getPermittedAccounts(channelId);

      DevLogger.log(`WC2::session_proposal getScopedPermissions`, {
        hostname,
        approvedAccounts,
        walletChainIdHex,
        walletChainIdDecimal,
      });

      // Use getScopedPermissions to get properly formatted namespaces
      const namespaces = await getScopedPermissions({ channelId });

      DevLogger.log(`WC2::session_proposal namespaces`, namespaces);

      const activeSession = await this.web3Wallet.approveSession({
        id: proposal.id,
        namespaces,
      });

      const deeplink = !!this.deeplinkSessions[activeSession.pairingTopic];
      const session = new WalletConnect2Session({
        session: activeSession,
        channelId,
        deeplink,
        web3Wallet: this.web3Wallet,
        navigation: this.navigation,
      });

      this.sessions[activeSession.topic] = session;

      DevLogger.log(`WC2::session_proposal updateSession`, {
        chainId: walletChainIdDecimal,
        accounts: approvedAccounts,
      });

      // Immediately notify dapp of wallet's active chain
      await session.updateSession({
        chainId: walletChainIdDecimal,
        accounts: approvedAccounts,
      });

      // Check if the chain is in the approved chains list before emitting event
      const caipChainId = `eip155:${walletChainIdDecimal}` as CaipChainId;
      const approvedChains = namespaces?.eip155?.chains || [];

      DevLogger.log(`WC2::session_proposal emitSessionEvent`, {
        topic: activeSession.topic,
        event: {
          name: 'chainChanged',
          data: walletChainIdHex,
        },
        chainId: caipChainId,
        approvedChains,
      });

      await this.web3Wallet.emitSessionEvent({
        topic: activeSession.topic,
        event: {
          name: 'chainChanged',
          data: walletChainIdHex,
        },
        chainId: caipChainId,
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
        console.warn(
          `WC2Manager::connect session not found for sessionTopic=${sessionTopic}`,
        );
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
