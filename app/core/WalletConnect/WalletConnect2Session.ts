import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { IWalletKit, WalletKitTypes } from '@reown/walletkit';
import { SessionTypes } from '@walletconnect/types';
import { ImageSourcePropType, Linking, Platform } from 'react-native';

import {
  CaipAccountId,
  CaipChainId,
  Hex,
  KnownCaipNamespace,
} from '@metamask/utils';
import Routes from '../../../app/constants/navigation/Routes';
import { selectEvmChainId } from '../../selectors/networkController';
import { store } from '../../store';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import { Minimizer } from '../NativeModules';
import { getPermittedAccounts } from '../Permissions';
import { INTERNAL_ORIGINS } from '../../constants/transaction';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { ERROR_MESSAGES } from './WalletConnectV2';
import {
  hideWCLoadingState,
  getUnverifiedRequestOrigin,
  getHostname,
  normalizeDappUrl,
} from './wc-utils';
import {
  buildApprovedNamespaces,
  filterToRequestedNamespaces,
  getChainChangedEmission,
  getEventEmissionChainId,
  getRedirectMethodsForChain,
  isEmptyApprovedNamespaces,
  mergeApprovedWithSession,
  normalizeCaipChainId,
  normalizeSessionNamespaces,
  shouldEmitChainChanged,
} from './multichain';
import type { ProposalLike } from './multichain/types';
import { switchToChain } from './WalletConnect2Session.chain';
import { routeToSnap } from './WalletConnect2Session.routing';
import { handleEvmRequest } from './multichain/eip155';
import { selectPerOriginChainId } from '../../selectors/selectedNetworkController';
import { errorCodes } from '@metamask/rpc-errors';

const ERROR_CODES = {
  USER_REJECT_CODE: 5000,
};

interface BackgroundBridgeFactory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (options: any) => BackgroundBridge;
}

class WalletConnect2Session {
  private channelId: string;
  private backgroundBridge: BackgroundBridge;
  private navigation?: NavigationContainerRef<ParamListBase>;
  private web3Wallet: IWalletKit;
  private deeplink: boolean;
  // timeoutRef is used on android to prevent automatic redirect on switchChain and wait for wallet_addEthereumChain.
  // If addEthereumChain is not received after 3 seconds, it will redirect.
  private timeoutRef: NodeJS.Timeout | null = null;
  private requestsToRedirect: { [request: string]: boolean } = {};
  private topicByRequestId: { [requestId: string]: string } = {};
  private lastChainId: Hex;
  private isHandlingChainChange = false;
  private storeUnsubscribe: (() => void) | null = null;

  private _isHandlingRequest = false;

  public session: SessionTypes.Struct;

  constructor({
    web3Wallet,
    session,
    navigation,
    channelId,
    deeplink,
    backgroundBridgeFactory = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: (options: any) => new BackgroundBridge(options),
    },
  }: {
    web3Wallet: IWalletKit;
    channelId: string;
    session: SessionTypes.Struct;
    deeplink: boolean;
    navigation?: NavigationContainerRef<ParamListBase>;
    backgroundBridgeFactory?: BackgroundBridgeFactory;
  }) {
    this.channelId = channelId;
    this.web3Wallet = web3Wallet;
    this.deeplink = deeplink;
    this.session = {
      ...session,
      namespaces: normalizeSessionNamespaces(session.namespaces),
    };
    this.navigation = navigation;

    DevLogger.log(
      `WalletConnect2Session::constructor channelId=${channelId} deeplink=${deeplink}`,
      navigation,
    );

    const rawUrl = session.peer.metadata.url;
    const name = session.peer.metadata.name;
    const icons = session.peer.metadata.icons;

    // Normalize URL to handle legacy sessions that may have URLs without protocol.
    const url = normalizeDappUrl(rawUrl);
    if (!url) {
      throw new Error(`Invalid dApp URL in session metadata: ${rawUrl}`);
    }

    DevLogger.log(
      `WalletConnect2Session::constructor topic=${session.topic} pairingTopic=${session.pairingTopic} url=${url} name=${name} icons=${icons}`,
    );

    this.backgroundBridge = this.createBackgroundBridge(
      backgroundBridgeFactory,
      { url, name, icons, channelId },
    );

    this.checkPendingRequests();
    this.lastChainId = this.getCurrentChainId();
    this.storeUnsubscribe = store.subscribe(this.onStoreChange.bind(this));
  }

  /**
   * The dapp URL from the WalletConnect session metadata.
   *
   * WARNING: This value is **self-reported** by the dapp in the WC session
   * proposal and is NOT independently verified. It MUST NOT be used as a
   * trusted origin identifier. It is shown in the confirmation/approval UI to
   * indicate the claimed source of the request, and used as a fallback when
   * `verifyContext` is unavailable. It should therefore not be treated as
   * equivalent to the verified origin/hostname of the request.
   */
  private createBackgroundBridge(
    factory: BackgroundBridgeFactory,
    {
      url,
      name,
      icons,
      channelId,
    }: { url: string; name: string; icons: string[]; channelId: string },
  ): BackgroundBridge {
    return factory.create({
      webview: null,
      url,
      isWalletConnect: true,
      channelId,
      wcRequestActions: {
        approveRequest: this.approveRequest.bind(this),
        rejectRequest: this.rejectRequest.bind(this),
        updateSession: this.updateSession.bind(this),
        emitEvent: this.emitEvent.bind(this),
      },
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        hostname: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname: this.selfReportedHostname,
          getProviderState,
          channelId,
          analytics: {},
          isMMSDK: false,
          navigation: this.navigation,
          url: { current: url },
          title: { current: name },
          icon: { current: icons?.[0] as ImageSourcePropType },
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

  private get selfReportedUrl() {
    return this.session.peer.metadata.url;
  }

  /**
   * Hostname derived from the self-reported dapp URL.
   * See {@link selfReportedUrl} for trust caveats.
   */
  private get selfReportedHostname() {
    return getHostname(this.selfReportedUrl);
  }

  private onStoreChange() {
    const newChainId = this.getCurrentChainId();
    if (newChainId !== this.lastChainId && !this.isHandlingChainChange) {
      const decimalChainId = Number.parseInt(newChainId, 16);
      this.handleChainChange(decimalChainId)
        .then(() => {
          // Only advance the local marker after session sync succeeds.
          // This allows retrying the same chain if updateSession fails.
          this.lastChainId = newChainId;
        })
        .catch((error) => {
          DevLogger.log(
            'WC2::store.subscribe Error handling chain change:',
            error,
          );
        });
    }
  }
  public getCurrentChainId() {
    const perOriginChainId = selectPerOriginChainId(
      store.getState(),
      this.channelId,
    );
    return perOriginChainId;
  }

  /** Check for pending unresolved requests */
  private checkPendingRequests = async () => {
    const pendingSessionRequests = this.web3Wallet.getPendingSessionRequests();
    if (pendingSessionRequests) {
      for (const request of pendingSessionRequests) {
        DevLogger.log(
          `WC2::constructor pendingSessionRequests requestId=${request.id}`,
        );
        try {
          if (request.topic === this.session.topic) {
            await this.handleRequest(request);
          } else {
            DevLogger.log(
              `WC2::constructor invalid request topic=${request.topic}`,
            );
          }
        } catch (error) {
          Logger.error(
            error as Error,
            'WC2::constructor error while handling request',
          );
        }
      }
    }
  };

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

    const showReturnNotification = () => {
      navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
      });
    };

    setTimeout(() => {
      const redirect = this.session.peer.metadata.redirect;

      if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
        const peerLink = redirect?.native || redirect?.universal;
        if (peerLink) {
          Linking.openURL(peerLink).catch((error) => {
            DevLogger.log(
              `WC2::redirect error while opening ${peerLink} with error ${error}`,
            );
            showReturnNotification();
          });
          return;
        }
      } else if (redirect) {
        Minimizer.goBack();
        return;
      }

      showReturnNotification();
    }, 100);
  };

  needsRedirect = (id: string) => {
    if (this.requestsToRedirect[id]) {
      delete this.requestsToRedirect[id];
      this.redirect(`needsRedirect_${id}`);
    }
  };

  isHandlingRequest = () => this._isHandlingRequest;

  emitEvent = async (eventName: string, data: unknown) => {
    const chainIdForEvent =
      eventName === 'chainChanged'
        ? getChainChangedEmission({
            namespaces: this.session.namespaces ?? {},
            fallbackEvmDecimal: Number(data),
            fallbackEvmHex: String(data),
          }).chainId
        : getEventEmissionChainId({
            eventName,
            namespaces: this.session.namespaces ?? {},
            fallbackEvmDecimal: Number.parseInt(this.getCurrentChainId(), 16),
          }).chainId;

    await this.web3Wallet.emitSessionEvent({
      topic: this.session.topic,
      event: { name: eventName, data },
      chainId: chainIdForEvent,
    });
  };

  public get getAllowedChainIds(): CaipChainId[] {
    return Object.values(this.session.namespaces).flatMap(
      (ns) => ns?.chains?.map((chain) => chain as CaipChainId) ?? [],
    );
  }

  /** Handle chain change by updating session namespaces and emitting event */
  private async handleChainChange(chainIdDecimal: number) {
    if (this.isHandlingChainChange) return;
    this.isHandlingChainChange = true;

    try {
      // Update session namespaces
      const currentNamespaces = normalizeSessionNamespaces(
        this.session.namespaces,
      );
      const newChainId = `eip155:${chainIdDecimal}`;
      const updatedChains = [
        ...new Set([...(currentNamespaces?.eip155?.chains || []), newChainId]),
      ];

      const accounts = [
        ...new Set(
          (currentNamespaces?.eip155?.accounts || []).map(
            (acc) => acc.split(':')[2],
          ),
        ),
      ].map((account) => `${newChainId}:${account}`);

      const updatedAccounts = [
        ...new Set([
          ...(currentNamespaces?.eip155?.accounts || []),
          ...accounts,
        ]),
      ];

      const updatedNamespaces = {
        ...currentNamespaces,
        eip155: {
          ...(currentNamespaces?.eip155 || {}),
          chains: updatedChains,
          methods: currentNamespaces?.eip155?.methods || [],
          events: currentNamespaces?.eip155?.events || [],
          accounts: updatedAccounts,
        },
      };

      DevLogger.log(
        `WC2::handleChainChange updating session with namespaces`,
        updatedNamespaces,
      );

      await this.web3Wallet.updateSession({
        topic: this.session.topic,
        namespaces: updatedNamespaces,
      });
      // await acknowledged();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Emit chainChanged event
      await this.emitEvent('chainChanged', chainIdDecimal);
    } catch (error) {
      DevLogger.log(
        `WC2::handleChainChange error while updating session`,
        error,
      );
      throw error;
    } finally {
      this.isHandlingChainChange = false;
    }
  }
  approveRequest = async ({ id, result }: { id: string; result: unknown }) => {
    const topic = this.topicByRequestId[id];

    try {
      await this.web3Wallet.respondSessionRequest({
        topic,
        response: {
          id: parseInt(id),
          jsonrpc: '2.0',
          result,
        },
      });
      this._isHandlingRequest = false;
    } catch (err) {
      DevLogger.log(
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

    const errorResponse = {
      code: ERROR_CODES.USER_REJECT_CODE,
      message: errorMsg,
    };

    try {
      await this.web3Wallet.respondSessionRequest({
        topic,
        response: {
          id: parseInt(id),
          jsonrpc: '2.0',
          error: errorResponse,
        },
      });
      this._isHandlingRequest = false;
    } catch (err) {
      DevLogger.log(
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

      DevLogger.log(
        `WC2::updateSession selfReportedUrl=${this.selfReportedUrl} selfReportedHostname=${this.selfReportedHostname} - chainId=${chainId} - accounts=${accounts}`,
      );

      accounts = this.resolveEffectiveAccounts(accounts);

      if (chainId === 0) {
        DevLogger.log(
          `WC2::updateSession invalid chainId --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        chainId = parseInt(selectEvmChainId(store.getState()), 16);
        DevLogger.log(
          `WC2::updateSession overwrite invalid chain Id with selectedChainId=${chainId}`,
        );
      }

      const mergedNamespaces = await this.computeMergedNamespaces();
      if (!mergedNamespaces) return;

      await this.web3Wallet.updateSession({
        topic: this.session.topic,
        namespaces: mergedNamespaces,
      });

      await this.syncAndEmitChainChanged(chainId);
    } catch (err) {
      DevLogger.log(
        `WC2::updateSession can't update session topic=${this.session.topic}`,
        err,
      );
    }
  };

  /**
   * Resolve the effective accounts for a session update. When the caller
   * provides an empty array, falls back to permitted accounts from the
   * session topic or channelId.
   */
  private resolveEffectiveAccounts(accounts: string[]): string[] {
    if (accounts.length > 0) return accounts;

    const sessionTopicAccounts = getPermittedAccounts(this.session.topic);
    const fallbackAccounts = getPermittedAccounts(this.channelId);
    const effective =
      sessionTopicAccounts.length > 0 ? sessionTopicAccounts : fallbackAccounts;

    if (effective.length > 0) {
      if (sessionTopicAccounts.length === 0 && fallbackAccounts.length > 0) {
        DevLogger.log(
          '[wc][WC2Session.updateSession] no accounts on session topic; using channelId fallback',
          {
            sessionTopic: this.session.topic,
            channelId: this.channelId,
            fallbackAccountsCount: fallbackAccounts.length,
          },
        );
      }
      DevLogger.log(`WC2::updateSession found approved accounts`, effective);
      return effective;
    }

    DevLogger.log(
      `WC2::updateSession no permitted accounts found for sessionTopic=${this.session.topic} and channelId=${this.channelId} selfReportedUrl=${this.selfReportedUrl}`,
    );
    // Even if EVM accounts aren't permitted, non-EVM (e.g. Tron)
    // sessions can still succeed: their chain adapter populates its
    // own namespace via `buildApprovedNamespaces`. Avoid aborting here.
    return accounts;
  }

  /**
   * Rebuild approved namespaces from registered adapters and merge with
   * the current session state. Returns `undefined` when the merge yields
   * no approved namespaces (caller should bail out).
   */
  private async computeMergedNamespaces() {
    const currentNamespaces = normalizeSessionNamespaces(
      this.session.namespaces,
    );

    // Treat the active session as the effective proposal: rebuild approved
    // namespaces from registered adapters using the same required/optional
    // scopes the dapp originally handshook with.
    const sessionProposal: ProposalLike = {
      requiredNamespaces: this.session.requiredNamespaces,
      optionalNamespaces: this.session.optionalNamespaces,
    };

    const computedNamespaces = await buildApprovedNamespaces({
      proposal: sessionProposal,
      channelId: this.channelId,
    });

    // Merge current (already-approved) on the bottom with freshly computed
    // on top, then drop anything the dapp did not request (preserving
    // whatever was already in the session so we don't strip a previously
    // approved namespace).
    const merged = filterToRequestedNamespaces(
      mergeApprovedWithSession(currentNamespaces, computedNamespaces),
      sessionProposal,
      { preserveKeys: Object.keys(currentNamespaces) },
    );

    if (isEmptyApprovedNamespaces(merged)) {
      DevLogger.log(
        '[wc][WC2Session.updateSession] no approved namespaces after merge',
        { topic: this.session.topic },
      );
      return undefined;
    }

    return merged;
  }

  /**
   * Sync the local session with WalletConnect's canonical state and emit
   * a `chainChanged` event if the target chain is valid and the namespace
   * supports the event.
   */
  private async syncAndEmitChainChanged(chainId: number) {
    const activeSession =
      this.web3Wallet.getActiveSessions?.()?.[this.session.topic];
    if (activeSession) {
      this.session = {
        ...activeSession,
        namespaces: normalizeSessionNamespaces(activeSession.namespaces),
      };
    }

    const chainChangedEmission = getChainChangedEmission({
      namespaces: this.session.namespaces ?? {},
      fallbackEvmDecimal: chainId,
      fallbackEvmHex: `0x${chainId.toString(16)}`,
    });

    const emitDecision = shouldEmitChainChanged({
      chainId: String(chainChangedEmission.chainId),
      namespaces: this.session.namespaces ?? {},
    });

    if (
      !emitDecision.shouldEmit &&
      emitDecision.reason === 'chain_not_in_session'
    ) {
      DevLogger.log(
        '[wc][WC2Session.updateSession] skip chainChanged emit; chain not in active session',
        {
          topic: this.session.topic,
          activeSessionChainIds: emitDecision.activeSessionChains,
          attemptedChainId: chainChangedEmission.chainId,
        },
      );
      return;
    }

    if (
      !emitDecision.shouldEmit &&
      emitDecision.reason === 'event_not_supported'
    ) {
      DevLogger.log(
        '[wc][WC2Session.updateSession] skip chainChanged emit; event not supported by namespace',
        {
          topic: this.session.topic,
          targetNamespace: emitDecision.namespace,
          targetNamespaceEvents: emitDecision.namespaceEvents,
          chainId: chainChangedEmission.chainId,
        },
      );
      return;
    }

    await this.web3Wallet.emitSessionEvent({
      topic: this.session.topic,
      event: { name: 'chainChanged', data: chainChangedEmission.data },
      chainId: chainChangedEmission.chainId as CaipChainId,
    });
  }

  switchToChain = (
    caip2ChainId: CaipChainId,
    originFromRequest?: string,
    allowSwitchingToNewChain = false,
  ): Promise<void> =>
    switchToChain({
      caip2ChainId,
      session: this.session,
      channelId: this.channelId,
      selfReportedUrl: this.selfReportedUrl,
      currentChainIdHex: this.getCurrentChainId(),
      originFromRequest,
      allowSwitchingToNewChain,
    });

  handleRequest = async (requestEvent: WalletKitTypes.SessionRequest) => {
    DevLogger.log(
      'WC2::handleRequest requestEvent',
      JSON.stringify(requestEvent, null, 2),
    );
    this.topicByRequestId[requestEvent.id] = requestEvent.topic;

    if (this.timeoutRef) {
      // Always clear the timeout ref on new message, it is only used for wallet_switchEthereumChain auto reject on android
      clearTimeout(this.timeoutRef);
    }

    // Set this to true before handling the request
    // So we know whether to show the loading state
    this._isHandlingRequest = true;

    hideWCLoadingState({ navigation: this.navigation });

    // NOTE: unverifiedOrigin may come from WC verifyContext (partially trusted)
    // or fall back to self-reported session metadata URL (untrusted).
    const unverifiedOrigin = getUnverifiedRequestOrigin(
      requestEvent,
      this.selfReportedUrl,
    );

    // Prevent external transactions from using internal origins.
    // This is an external connection (WalletConnect), so block any internal origin.
    // NOTE: unverifiedOrigin is self-reported by the dapp.
    if (INTERNAL_ORIGINS.includes(unverifiedOrigin)) {
      this._isHandlingRequest = false;
      return this.web3Wallet.respondSessionRequest({
        topic: this.session.topic,
        response: {
          id: requestEvent.id,
          jsonrpc: '2.0',
          error: {
            code: errorCodes.provider.unauthorized,
            message: ERROR_MESSAGES.INVALID_ORIGIN,
          },
        },
      });
    }

    const method = requestEvent.params.request.method;
    const requestChainId = normalizeCaipChainId(
      requestEvent.params.chainId,
    ) as CaipChainId;
    const requestNamespace = requestChainId?.split(':')?.[0];

    // Mark redirect before any routing so all namespaces benefit from it.
    if (getRedirectMethodsForChain(requestChainId).includes(method)) {
      this.requestsToRedirect[requestEvent.id] = true;
    }

    // Non-EVM namespace routing: delegate to MultichainRoutingService which
    // resolves the correct Snap internally via the SnapKeyring.
    if (
      requestNamespace &&
      requestNamespace !== KnownCaipNamespace.Eip155 &&
      requestNamespace !== KnownCaipNamespace.Wallet
    ) {
      return this.routeToSnap(requestEvent, requestChainId);
    }

    // EVM namespace routing: delegate to eip155 routing module which owns
    // chain validation, auto-switching, and BackgroundBridge dispatch.
    try {
      await handleEvmRequest({
        requestEvent,
        method,
        unverifiedOrigin,
        host: {
          approveRequest: this.approveRequest,
          rejectRequest: this.rejectRequest,
          channelId: this.channelId,
          session: this.session,
          backgroundBridge: this.backgroundBridge,
          getCurrentChainId: () => this.getCurrentChainId(),
          switchToChain: (caip2, origin, allowNew) =>
            this.switchToChain(caip2, origin, allowNew),
          respondSessionError: (requestId, code, message) =>
            this.web3Wallet.respondSessionRequest({
              topic: this.session.topic,
              response: {
                id: requestId,
                jsonrpc: '2.0',
                error: { code, message },
              },
            }),
          setHandlingRequest: (v) => {
            this._isHandlingRequest = v;
          },
        },
      });
    } catch (error) {
      this._isHandlingRequest = false;
      throw error;
    }
  };

  /** Route a non-EVM WalletConnect request through MultichainRoutingService. */
  private routeToSnap = async (
    requestEvent: WalletKitTypes.SessionRequest,
    scope: CaipChainId,
  ) => {
    const namespace = scope.split(':')[0];
    const connectedAddresses = (this.session.namespaces?.[namespace]
      ?.accounts ?? []) as CaipAccountId[];

    try {
      await routeToSnap({
        requestEvent,
        connectedAddresses,
        scope,
        host: {
          approveRequest: this.approveRequest,
          rejectRequest: this.rejectRequest,
        },
      });
    } finally {
      this._isHandlingRequest = false;
    }
  };

  removeListeners = async () => {
    this.storeUnsubscribe?.();
    this.storeUnsubscribe = null;
    this.backgroundBridge.onDisconnect();
  };
}

export default WalletConnect2Session;
