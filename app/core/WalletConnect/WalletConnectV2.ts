import { AccountsController } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { KeyringController } from '@metamask/keyring-controller';
import { PermissionController } from '@metamask/permission-controller';
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { IWalletKit, WalletKit, WalletKitTypes } from '@reown/walletkit';
import { Core } from '@walletconnect/core';
import { SessionTypes } from '@walletconnect/types';
import { getSdkError } from '@walletconnect/utils';

import { updateWC2Metadata } from '../../../app/actions/sdk';
import {
  WC2VerifyContext,
  WC2VerifyValidation,
} from '../../../app/actions/sdk/state';
import { selectEvmChainId } from '../../selectors/networkController';
import { store } from '../../store';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import Engine from '../Engine';
import {
  addPermittedAccounts,
  getDefaultCaip25CaveatValue,
  getPermittedAccounts,
  updatePermittedChains,
} from '../Permissions';
import { INTERNAL_ORIGINS } from '../../constants/transaction';
import DevLogger from '../SDKConnect/utils/DevLogger';
import getAllUrlParams from '../SDKConnect/utils/getAllUrlParams.util';
import { wait, waitForKeychainUnlocked } from '../SDKConnect/utils/wait.util';
import extractApprovedAccounts from './extractApprovedAccounts';
import {
  getHostname,
  normalizeCaipChainIdOutbound,
  getScopedPermissions,
  hideWCLoadingState,
  parseWalletConnectUri,
  showWCLoadingState,
  isValidUrl,
} from './wc-utils';
import {
  getCompatibleTronCaipChainIdsForWalletConnect,
  getChainChangedEmissionForWalletConnect,
  shouldEmitChainChangedForWalletConnect,
} from './WalletConnectMultiChainConnector';

import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import WalletConnect2Session from './WalletConnect2Session';
import { CaipAccountId, CaipChainId } from '@metamask/utils';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
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
  INVALID_ORIGIN: 'Invalid origin',
};

// Safety timeout for the proposal serialization lock.
const PROPOSAL_LOCK_TIMEOUT_MS = 60_000;

// How long a pairing topic stays in seenTopics. Long enough to block the
// OS duplicate-delivery burst (~1 s), short enough to allow manual retries.
const SEEN_TOPIC_TTL_MS = 5_000;

export class WC2Manager {
  private static instance: WC2Manager;
  private static _initialized = false;
  private navigation?: NavigationContainerRef<ParamListBase>;
  private web3Wallet: IWalletKit;
  private sessions: { [topic: string]: WalletConnect2Session };
  private deeplinkSessions: {
    [pairingTopic: string]: { redirectUrl?: string; origin: string };
  } = {};

  // Serializes proposal handling so concurrent proposals don't fight
  // over shared state (wc2Metadata, navigation, approval queue).
  private proposalLock: Promise<void> = Promise.resolve();
  // Deduplicates connect() calls for the same pairing topic.
  // Entries auto-expire after SEEN_TOPIC_TTL_MS to allow manual retries.
  private seenTopics = new Set<string>();
  // Deduplicates session_proposal events (the relay can fire duplicates).
  private handledProposalIds = new Set<number>();

  private constructor(
    web3Wallet: IWalletKit,
    deeplinkSessions: {
      [topic: string]: { redirectUrl?: string; origin: string };
    },
    navigation: NavigationContainerRef<ParamListBase>,
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
  }

  // Milliseconds to wait between consecutive session restorations on startup.
  private static readonly SESSION_RESTORE_STAGGER_MS = 200;

  private async cleanupBrokenRestoredSession(
    session: SessionTypes.Struct,
    error: unknown,
  ): Promise<void> {
    DevLogger.log(
      `WC2::restoreSessions cleaning up broken session topic=${session.topic} pairingTopic=${session.pairingTopic}`,
      error,
    );

    try {
      this.sessions[session.topic]?.removeListeners();
      delete this.sessions[session.topic];
    } catch (cleanupError) {
      DevLogger.log(
        `WC2::restoreSessions failed to cleanup local session topic=${session.topic}`,
        cleanupError,
      );
    }

    try {
      const permissionsController = (
        Engine.context as {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          PermissionController: PermissionController<any, any>;
        }
      ).PermissionController;
      permissionsController.revokeAllPermissions(session.pairingTopic);
    } catch (revokeError) {
      DevLogger.log(
        `WC2::restoreSessions failed to revoke permissions for pairingTopic=${session.pairingTopic}`,
        revokeError,
      );
    }

    try {
      await this.web3Wallet.disconnectSession({
        topic: session.topic,
        reason: { code: 1, message: ERROR_MESSAGES.AUTO_REMOVE },
      });
    } catch (disconnectError) {
      DevLogger.log(
        `WC2::restoreSessions failed to disconnect stale session topic=${session.topic}`,
        disconnectError,
      );
    }
  }

  /**
   * Restores all active WalletConnect sessions one at a time.
   *
   * This method processes sessions serially with a small delay between
   * each one so that relay traffic is smoothed out over time.
   */
  private async restoreSessions(): Promise<void> {
    const activeSessions = this.getSessions();
    if (!activeSessions?.length) {
      return;
    }

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

    for (const session of activeSessions) {
      if (INTERNAL_ORIGINS.includes(session.peer.metadata.url)) {
        DevLogger.log(
          `WC2::init skipping session with invalid url: ${session.topic}`,
        );
        continue;
      }

      const sessionKey = session.topic;
      const pairingTopic = session.pairingTopic;
      try {
        const wcSession = new WalletConnect2Session({
          web3Wallet: this.web3Wallet,
          channelId: pairingTopic,
          navigation: this.navigation,
          deeplink:
            typeof this.deeplinkSessions[session.pairingTopic] !== 'undefined',
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

        updatePermittedChains(pairingTopic, wcSession.getAllowedChainIds, true);

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
        DevLogger.log(`WC2::init can't update session ${sessionKey}`);
        await this.cleanupBrokenRestoredSession(session, err);
      }
      await wait(WC2Manager.SESSION_RESTORE_STAGGER_MS);
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
      DevLogger.log(`WC2::init Init failed due to ${err}`);
      throw err;
    }
  }

  public static async init({
    sessions = {},
  }: {
    sessions?: { [topic: string]: WalletConnect2Session };
  }) {
    if (!isWC2Enabled) {
      DevLogger.log(`WC2::init WC2 is not enabled --- SKIP INIT`);

      //If WC is not enabled, we don't need to initialize it
      return;
    }

    const navigation = NavigationService.navigation;

    if (!navigation) {
      DevLogger.log(`WC2::init missing navigation --- SKIP INIT`);
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
      DevLogger.log(`WC2@init() Failed to parse storage values`);
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
      await this.instance.restoreSessions();
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
        `WC2::removeSession revokeAllPermissions for ${session.pairingTopic}`,
        permissionsController.state,
      );
      permissionsController.revokeAllPermissions(session.pairingTopic);
    } catch (err) {
      DevLogger.log(`WC2::removeSession error while disconnecting`, err);
    }
  }

  public async removeAll() {
    this.deeplinkSessions = {};
    // Tear down WalletConnect2Session (Redux subscription, BackgroundBridge)
    // before clearing the map. Otherwise session_delete may run after this.sessions
    // is empty and skip removeListeners(), leaking listeners and relay churn.
    const wcSessions = Object.values(this.sessions);
    await Promise.allSettled(
      wcSessions.map((wcSession) => wcSession.removeListeners()),
    );
    this.sessions = {};

    const actives = this.web3Wallet.getActiveSessions() || {};
    const permissionsController = (
      Engine.context as {
        // TODO: Replace 'any' with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;

    Object.values(actives).forEach(async (session) => {
      try {
        permissionsController.revokeAllPermissions(session.pairingTopic);
      } catch (err) {
        DevLogger.log(
          `WC2::removeAll revokeAllPermissions failed for ${session.pairingTopic}`,
          err,
        );
      }

      this.web3Wallet
        .disconnectSession({
          topic: session.topic,
          reason: { code: 1, message: ERROR_MESSAGES.MANUAL_DISCONNECT },
        })
        .catch((err) => {
          DevLogger.log(`Can't remove active session ${session.topic}`, err);
        });
    });

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
          DevLogger.log(`Can't remove pending session ${session.id}`, err);
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
        DevLogger.log(`Can't remove request ${request.id}`, err);
      }
    });
  }

  async onSessionProposal(proposal: WalletKitTypes.SessionProposal) {
    const handle = () =>
      Promise.race([
        this._handleSessionProposal(proposal),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            DevLogger.log(
              `WC2::session_proposal lock timeout for id=${proposal.id}`,
            );
            resolve();
          }, PROPOSAL_LOCK_TIMEOUT_MS),
        ),
      ]);

    // Chain onto the lock. The error handler ensures a failed proposal
    // doesn't prevent subsequent proposals from being processed.
    this.proposalLock = this.proposalLock.then(handle, handle);
    await this.proposalLock;
  }

  private async _handleSessionProposal(
    proposal: WalletKitTypes.SessionProposal,
  ) {
    DevLogger.log(`WC2::session_proposal proposal`, proposal);
    if (this.handledProposalIds.has(proposal.id)) {
      return;
    }
    this.handledProposalIds.add(proposal.id);

    //  Open session proposal modal for confirmation / rejection
    const { id, params } = proposal;

    const pairingTopic = proposal.params.pairingTopic;
    const channelId = `${pairingTopic}`;
    DevLogger.log(`WC2::session_proposal channelId=${channelId}`);
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

    // Extract WalletConnect Verify API context for domain risk detection.
    // If unavailable (error, timeout), default to undefined so the UI
    // treats it as a clean connection (no malicious warnings).
    let verifyContext: WC2VerifyContext | undefined;
    try {
      const rawVerify = (
        proposal as WalletKitTypes.SessionProposal & {
          verifyContext?: {
            verified?: {
              isScam?: boolean;
              validation?: string;
              origin?: string;
            };
          };
        }
      ).verifyContext;
      if (rawVerify?.verified) {
        verifyContext = {
          isScam: rawVerify.verified.isScam === true,
          validation:
            (rawVerify.verified.validation as WC2VerifyValidation) ??
            WC2VerifyValidation.UNKNOWN,
          verifiedOrigin: rawVerify.verified.origin,
        };
        DevLogger.log(
          `WC2::session_proposal verifyContext`,
          JSON.stringify(verifyContext),
        );
      }
    } catch (verifyErr) {
      DevLogger.log(
        `WC2::session_proposal failed to extract verifyContext`,
        verifyErr,
      );
      // Verify failures must not block the connection
    }

    // Validate new session proposal URL without normalizing - reject if invalid.
    if (!isValidUrl(url)) {
      console.warn(`WC2::session_proposal rejected - invalid dApp URL: ${url}`);
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });
      return;
    }

    // Prevent external connections from using internal origins
    // This is an external connection (WalletConnect), so block any internal origin
    if (INTERNAL_ORIGINS.includes(url)) {
      console.warn(`WC2::session_proposal rejected - invalid url: ${url}`);
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });
      return;
    }

    // Extract the hostname to ensure we're consistent with permission checks
    const hostname = getHostname(url);
    // Keep the full url for logging and UI display
    const origin = url;

    DevLogger.log(
      `WC2::session_proposal metadata url=${origin} hostname=${hostname}`,
    );

    // Save connection info to redux store for the approval UI.
    store.dispatch(
      updateWC2Metadata({ url, name, icon, id: `${id}`, verifyContext }),
    );

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

      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      // Register Tron accounts in the permission system so the CAIP-25 caveat
      // reflects Tron authorization alongside EVM.
      try {
        const tronAccounts =
          Engine.context.AccountsController.listAccounts().filter(
            (account: { type: string }) => account.type === TrxAccountType.Eoa,
          );
        if (tronAccounts.length > 0) {
          const tronCaipAccountIds = tronAccounts.map(
            (account: { address: string }) =>
              `${TrxScope.Mainnet}:${account.address}` as CaipAccountId,
          );
          addPermittedAccounts(channelId, tronCaipAccountIds);
          DevLogger.log(
            `WC2::session_proposal Tron accounts added to permissions`,
            tronCaipAccountIds,
          );
        }
      } catch (err) {
        DevLogger.log(
          `WC2::session_proposal error adding Tron account permissions`,
          err,
        );
      }
      ///: END:ONLY_INCLUDE_IF
    } catch (err) {
      DevLogger.log(`WC2::session_proposal requestPermissions error`, {
        err,
      });
      await this.web3Wallet.rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });
      // Clear stale metadata so it doesn't bleed into the next proposal.
      store.dispatch(
        updateWC2Metadata({ url: '', name: '', icon: '', id: '' }),
      );
      return;
    }

    try {
      const approvedAccounts = getPermittedAccounts(channelId);

      DevLogger.log(`WC2::session_proposal getScopedPermissions`, {
        hostname,
        approvedAccounts,
        walletChainIdHex,
        walletChainIdDecimal,
      });

      // Use getScopedPermissions to get properly formatted namespaces
      const namespaces = await getScopedPermissions({ channelId });

      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      // Ensure Tron namespace is present when requested by the dapp proposal.
      // In some flows, permission-derived namespaces can temporarily contain only eip155.
      const requiredNamespaces = proposal.params.requiredNamespaces ?? {};
      const optionalNamespaces = proposal.params.optionalNamespaces ?? {};
      const requiredKeys = Object.keys(requiredNamespaces);
      const optionalKeys = Object.keys(optionalNamespaces);
      const allProposalNamespaces = {
        ...optionalNamespaces,
        ...requiredNamespaces,
      } as Record<
        string,
        { chains?: string[]; methods?: string[]; events?: string[] }
      >;
      const proposalChains = Object.values(allProposalNamespaces).flatMap(
        (ns) => ns?.chains ?? [],
      );
      const requestedTronNamespace =
        allProposalNamespaces.tron ??
        (proposalChains.some((chain) => chain.startsWith('tron:'))
          ? {
              chains: proposalChains.filter((chain) =>
                chain.startsWith('tron:'),
              ),
              methods: ['tron_signTransaction', 'tron_signMessage'],
              events: [],
            }
          : undefined);

      DevLogger.log('[wc][WC2Manager.session_proposal] proposal namespaces', {
        topic: proposal.params.pairingTopic,
        requiredKeys,
        optionalKeys,
        proposalChains,
      });

      if (requestedTronNamespace && !namespaces.tron) {
        const tronAccounts = Engine.context.AccountsController.listAccounts()
          .filter(
            (account: { type: string }) => account.type === TrxAccountType.Eoa,
          )
          .map((account: { address: string }) => account.address);

        const requestedTronChains = requestedTronNamespace.chains ?? [];
        const requestedTronMethods = requestedTronNamespace.methods ?? [];
        const tronChains =
          requestedTronChains.length > 0
            ? Array.from(
                new Set(
                  requestedTronChains.flatMap((chain) =>
                    getCompatibleTronCaipChainIdsForWalletConnect(
                      normalizeCaipChainIdOutbound(chain),
                    ),
                  ),
                ),
              )
            : getCompatibleTronCaipChainIdsForWalletConnect(
                normalizeCaipChainIdOutbound(TrxScope.Mainnet),
              );
        namespaces.tron = {
          chains: tronChains,
          methods:
            requestedTronMethods.length > 0
              ? requestedTronMethods
              : ['tron_signTransaction', 'tron_signMessage'],
          events: requestedTronNamespace.events ?? [],
          // A namespace requested by the dapp must still be structurally present,
          // even if there are temporarily no local Tron accounts selected yet.
          accounts: tronAccounts.flatMap((address) =>
            tronChains.map(
              (chainId) =>
                `${chainId}:${address}` as `${string}:${string}:${string}`,
            ),
          ),
        };
        DevLogger.log(
          '[wc][WC2Manager.session_proposal] injected tron namespace from proposal',
          {
            topic: proposal.params.pairingTopic,
            chains: namespaces.tron.chains,
            accountsCount: namespaces.tron.accounts.length,
          },
        );
      }
      ///: END:ONLY_INCLUDE_IF

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

      await this.enforceSessionLimit();

      DevLogger.log(`WC2::session_proposal updateSession`, {
        chainId: walletChainIdDecimal,
        accounts: approvedAccounts,
      });

      // Immediately notify dapp of wallet's active chain
      await session.updateSession({
        chainId: walletChainIdDecimal,
        accounts: approvedAccounts,
      });

      const activeNamespaces = activeSession.namespaces ?? {};
      const chainChangedEmission = getChainChangedEmissionForWalletConnect({
        namespaces: activeNamespaces,
        fallbackEvmDecimal: walletChainIdDecimal,
        fallbackEvmHex: walletChainIdHex,
      });

      const approvedChains = activeNamespaces?.eip155?.chains || [];
      const emitDecision = shouldEmitChainChangedForWalletConnect({
        chainId: String(chainChangedEmission.chainId),
        namespaces: activeNamespaces,
      });

      DevLogger.log(`WC2::session_proposal emitSessionEvent`, {
        topic: activeSession.topic,
        event: {
          name: 'chainChanged',
          data: chainChangedEmission.data,
        },
        chainId: chainChangedEmission.chainId as CaipChainId,
        approvedChains,
      });

      if (
        !emitDecision.shouldEmit &&
        emitDecision.reason === 'chain_not_in_session'
      ) {
        DevLogger.log(
          '[wc][WC2Manager.session_proposal] skip chainChanged emit; chain not in active session',
          {
            topic: activeSession.topic,
            attemptedChainId: chainChangedEmission.chainId,
            activeSessionChains: emitDecision.activeSessionChains,
          },
        );
      } else if (
        !emitDecision.shouldEmit &&
        emitDecision.reason === 'event_not_supported'
      ) {
        DevLogger.log(
          '[wc][WC2Manager.session_proposal] skip chainChanged emit; event not supported by namespace',
          {
            topic: activeSession.topic,
            chainId: chainChangedEmission.chainId,
            chainChangedNamespace: emitDecision.namespace,
            chainChangedEventsForNamespace: emitDecision.namespaceEvents,
          },
        );
      } else {
        await this.web3Wallet.emitSessionEvent({
          topic: activeSession.topic,
          event: {
            name: 'chainChanged',
            data: chainChangedEmission.data,
          },
          chainId: chainChangedEmission.chainId as CaipChainId,
        });
      }

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

  private async enforceSessionLimit() {
    const activeSessions = this.getSessions();
    const limit = AppConstants.WALLET_CONNECT.LIMIT_SESSIONS;

    if (activeSessions.length <= limit) {
      return;
    }

    const oldestSession = activeSessions.reduce((oldest, session) =>
      session.expiry < oldest.expiry ? session : oldest,
    );

    DevLogger.log(
      `WC2::enforceSessionLimit removing oldest session topic=${oldestSession.topic} (${activeSessions.length} sessions exceed limit of ${limit})`,
    );

    await this.removeSession(oldestSession);
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

      const wcUriPreview =
        wcUri.length > 160 ? `${wcUri.slice(0, 160)}...` : wcUri;
      DevLogger.log('[wc][WC2Manager.connect] start', {
        origin,
        redirectUrl,
        navigationDefined: this.navigation !== undefined,
        wcUriPreview,
      });

      const params = parseWalletConnectUri(wcUri);
      const isDeepLink = origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

      DevLogger.log('[wc][WC2Manager.connect] parsed wc uri', {
        protocol: params.protocol,
        version: params.version,
        topic: params.topic,
      });

      const rawParams = getAllUrlParams(wcUri);
      // First check if the url continas sessionTopic, meaning it is only here from an existing connection (so we don't need to create pairing)
      if (rawParams.sessionTopic) {
        DevLogger.log('[wc][WC2Manager.connect] found sessionTopic in uri', {
          sessionTopic: rawParams.sessionTopic,
        });
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
        DevLogger.log(
          `WC2Manager::connect session not found for sessionTopic=${sessionTopic}`,
        );
      }

      if (params.version === 1) {
        // WalletConnect V1 was shut down on June 28, 2023. V1 URIs are no longer supported.
        console.warn(
          '[wc][WC2Manager.connect] walletconnect v1 uri not supported',
          {
            wcUriPreview,
          },
        );
        console.warn(
          `WalletConnect V1 is no longer supported. V1 was shut down on June 28, 2023. URI: ${wcUri}`,
        );
        return;
      }

      if (params.version === 2) {
        // check if already connected
        const activeSession = this.getSessions().find(
          (session) =>
            session.topic === params.topic ||
            session.pairingTopic === params.topic,
        );
        if (activeSession) {
          DevLogger.log(
            '[wc][WC2Manager.connect] active session already exists',
            {
              topic: activeSession.topic,
            },
          );
          this.sessions[activeSession.topic]?.setDeeplink(isDeepLink);
          return;
        }

        // Deduplicate: the OS can deliver the same deeplink multiple times.
        if (this.seenTopics.has(params.topic)) {
          DevLogger.log('[wc][WC2Manager.connect] duplicate topic deduped', {
            topic: params.topic,
          });
          return;
        }
        this.seenTopics.add(params.topic);
        setTimeout(
          () => this.seenTopics.delete(params.topic),
          SEEN_TOPIC_TTL_MS,
        );

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
        return;
      }

      console.warn(`Invalid wallet connect uri`, wcUri);
      DevLogger.log(
        '[wc][WC2Manager.connect] invalid parsed wallet connect uri',
        {
          version: params.version,
          topic: params.topic,
          protocol: params.protocol,
          wcUriPreview,
        },
      );
    } catch (err) {
      const wcUriPreviewCatch =
        wcUri.length > 160 ? `${wcUri.slice(0, 160)}...` : wcUri;
      console.error('[wc][WC2Manager.connect] failed', {
        wcUriPreview: wcUriPreviewCatch,
        err,
      });
    }
  }
}

export default WC2Manager;
