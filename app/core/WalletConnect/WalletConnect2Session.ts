import { WalletDevice } from '@metamask/transaction-controller';
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
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import Routes from '../../../app/constants/navigation/Routes';
import ppomUtil from '../../../app/lib/ppom/ppom-util';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../selectors/networkController';
import { store } from '../../store';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import { addTransaction } from '../../util/transaction-controller';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import { Minimizer } from '../NativeModules';
import { getPermittedAccounts, getPermittedChains } from '../Permissions';
import { INTERNAL_ORIGINS } from '../../constants/transaction';
import getRpcMethodMiddleware, {
  getRpcMethodMiddlewareHooks,
} from '../RPCMethods/RPCMethodMiddleware';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { ERROR_MESSAGES } from './WalletConnectV2';
import { REDIRECT_METHODS_BY_NAMESPACE } from './wc-config';
import {
  getScopedPermissions,
  hideWCLoadingState,
  isSwitchingChainRequest,
  getUnverifiedRequestOrigin,
  hasPermissionsToSwitchChainRequest,
  getNetworkClientIdForCaipChainId,
  getChainIdForCaipChainId,
  getHostname,
  normalizeDappUrl,
  normalizeCaipChainIdInbound,
  getChainChangedEmissionForWalletConnect,
  shouldEmitChainChangedForWalletConnect,
} from './wc-utils';
import {
  buildAdapterNamespaces,
  callMultichainRoutingService,
  getCompatibleCaipChainIdsForWalletConnect,
  mapRequestForSnap,
  normalizeSnapResponse,
  proposalReferencedAdapterNamespaces,
} from './multichain';
import { selectPerOriginChainId } from '../../selectors/selectedNetworkController';
import { errorCodes, providerErrors, rpcErrors } from '@metamask/rpc-errors';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';
import { switchToNetwork } from '../RPCMethods/lib/ethereum-chain-utils';
import { updateWC2Metadata } from '../../actions/sdk';
import AppConstants from '../AppConstants';
import Engine from '../Engine';

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

  private _isHandlingRequest = false;

  public session: SessionTypes.Struct;

  private normalizeSessionNamespaces(
    namespaces: SessionTypes.Namespaces | undefined,
  ): SessionTypes.Namespaces {
    const normalizedNamespaces: SessionTypes.Namespaces = {};

    Object.entries(namespaces ?? {}).forEach(([namespace, config]) => {
      const accounts = Array.isArray(config?.accounts) ? config.accounts : [];
      const derivedChains = Array.from(
        new Set(
          accounts.flatMap((account) => {
            try {
              return [parseCaipAccountId(account as CaipAccountId).chainId];
            } catch {
              return [];
            }
          }),
        ),
      );
      const chains =
        Array.isArray(config?.chains) && config.chains.length > 0
          ? config.chains
          : derivedChains;

      normalizedNamespaces[namespace] = {
        chains,
        methods: Array.isArray(config?.methods) ? config.methods : [],
        events: Array.isArray(config?.events) ? config.events : [],
        accounts,
      };
    });

    return normalizedNamespaces;
  }

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
      namespaces: this.normalizeSessionNamespaces(session.namespaces),
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

    this.backgroundBridge = backgroundBridgeFactory.create({
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
        // TODO: Replace 'any' with type
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
          // Website info — self-reported by dapp via WC session metadata, shown in
          // confirmation/approval UI to indicate the claimed source of the request.
          // Not equivalent to a verified origin/hostname.
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

    this.checkPendingRequests();
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
    const numericChainId =
      typeof data === 'number' ? data : Number.parseInt(String(data), 10);
    const fallbackEvmHex = Number.isFinite(numericChainId)
      ? `0x${numericChainId.toString(16)}`
      : String(data);
    let chainIdForEvent = `eip155:${data}`;
    let eventDataForEvent = data;
    if (eventName === 'chainChanged') {
      const eip155ChainId = `eip155:${numericChainId}`;
      const emitDecision = shouldEmitChainChangedForWalletConnect({
        chainId: eip155ChainId,
        namespaces: this.session.namespaces,
      });
      if (!emitDecision.shouldEmit) {
        return;
      }
      chainIdForEvent = eip155ChainId;
      eventDataForEvent = fallbackEvmHex;
    }

    await this.web3Wallet.emitSessionEvent({
      topic: this.session.topic,
      event: { name: eventName, data: eventDataForEvent },
      chainId: chainIdForEvent,
    });
  };

  public get getAllowedChainIds(): CaipChainId[] {
    return Object.values(this.session.namespaces).flatMap(
      (ns) => ns?.chains?.map((chain) => chain as CaipChainId) ?? [],
    );
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
      const sessionTopic = this.session.topic;
      if (!accounts) {
        DevLogger.log(
          `Invalid accounts --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        return;
      }

      DevLogger.log(
        `WC2::updateSession selfReportedUrl=${this.selfReportedUrl} selfReportedHostname=${this.selfReportedHostname} - chainId=${chainId} - accounts=${accounts}`,
      );

      if (accounts.length === 0) {
        const effectiveApprovedAccounts = getPermittedAccounts(this.channelId);
        if (effectiveApprovedAccounts.length > 0) {
          DevLogger.log(
            `WC2::updateSession found approved accounts`,
            effectiveApprovedAccounts,
          );
          accounts = effectiveApprovedAccounts;
        } else {
          const referencedAdapterNamespaces =
            proposalReferencedAdapterNamespaces({
              requiredNamespaces: this.session.requiredNamespaces,
              optionalNamespaces: this.session.optionalNamespaces,
            });
          DevLogger.log(
            `WC2::updateSession no permitted accounts found for sessionTopic=${sessionTopic} and channelId=${this.channelId} selfReportedUrl=${this.selfReportedUrl}`,
          );
          // Keep legacy behavior for EVM-only sessions: do not update a session
          // with empty account lists. Non-EVM adapter sessions may still build
          // valid namespaces from adapter-managed permissions/accounts.
          if (referencedAdapterNamespaces.length === 0) {
            return;
          }
        }
      }

      if (chainId === 0) {
        DevLogger.log(
          `WC2::updateSession invalid chainId --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        chainId = parseInt(selectEvmChainId(store.getState()), 16);
        DevLogger.log(
          `WC2::updateSession overwrite invalid chain Id with selectedChainId=${chainId}`,
        );
      }

      const currentNamespaces = this.normalizeSessionNamespaces(
        this.session.namespaces,
      );
      const namespaces = this.normalizeSessionNamespaces(
        await getScopedPermissions({ channelId: this.channelId }),
      );
      DevLogger.log(
        `🔴🔴 WC2::updateSession updating with namespaces`,
        namespaces,
      );

      // Preserve already-approved namespaces (e.g. tron) if the freshly
      // computed permissions payload is temporarily partial (e.g. only eip155).
      const mergedNamespaces = {
        ...currentNamespaces,
        ...namespaces,
      };

      // Keep non-EVM namespaces aligned with what the dapp requested at
      // session-proposal time. Per WC spec, approved chains MUST be a
      // subset of the original required+optional, and some dapp adapters
      // crash when they hit unexpected chain ids. Delegate the slice
      // construction to each adapter.
      const adapterSlices = buildAdapterNamespaces({
        proposal: {
          requiredNamespaces: this.session.requiredNamespaces,
          optionalNamespaces: this.session.optionalNamespaces,
        },
        existingNamespaces: mergedNamespaces,
      });
      Object.assign(mergedNamespaces, adapterSlices);

      // If the original proposal referenced any non-EVM namespace but no
      // adapter slice was produced (e.g. wallet has no Tron account), do
      // not emit a chainChanged with an EVM fallback. Non-EVM dapps don't
      // recognise EVM hex chain ids and WalletKit may reject the emit.
      const requiredAdapterNamespaces = proposalReferencedAdapterNamespaces({
        requiredNamespaces: this.session.requiredNamespaces,
        optionalNamespaces: {},
      });
      const missingRequiredAdapterNamespaces = requiredAdapterNamespaces.filter(
        (ns) => !mergedNamespaces[ns]?.chains?.length,
      );
      if (missingRequiredAdapterNamespaces.length > 0) {
        DevLogger.log(
          `WC2::updateSession missing required non-EVM adapter namespaces`,
          missingRequiredAdapterNamespaces,
        );
        return;
      }

      // Filter out namespaces the dapp never requested. See rationale in
      // WalletConnectV2._handleSessionProposal. Chain-specific dapp providers
      // (e.g. Tron-only) crash when they see unexpected namespace keys on
      // session update/rehydration.
      const allowedNamespaceKeys = new Set<string>([
        ...Object.keys(this.session.requiredNamespaces ?? {}),
        ...Object.keys(this.session.optionalNamespaces ?? {}),
      ]);
      // Preserve whatever was in the currently-approved session as well
      // (a session previously approved eip155 should keep eip155 on update).
      Object.keys(currentNamespaces).forEach((key) =>
        allowedNamespaceKeys.add(key),
      );
      if (allowedNamespaceKeys.size > 0) {
        for (const key of Object.keys(mergedNamespaces)) {
          if (!allowedNamespaceKeys.has(key)) {
            delete mergedNamespaces[key];
          }
        }
      }

      await this.web3Wallet.updateSession({
        topic: this.session.topic,
        namespaces: mergedNamespaces,
      });

      // Keep local session in sync with WalletConnect's canonical active session,
      // then derive chainChanged target from the freshest namespaces.
      const activeSession =
        this.web3Wallet.getActiveSessions?.()?.[this.session.topic];
      if (activeSession) {
        this.session = {
          ...activeSession,
          namespaces: this.normalizeSessionNamespaces(activeSession.namespaces),
        };
      }

      const chainChangedEmission = getChainChangedEmissionForWalletConnect({
        namespaces: this.session.namespaces,
        fallbackEvmDecimal: chainId,
        fallbackEvmHex: `0x${chainId.toString(16)}`,
      });

      const emitDecision = shouldEmitChainChangedForWalletConnect({
        chainId: String(chainChangedEmission.chainId),
        namespaces: this.session.namespaces,
      });
      if (!emitDecision.shouldEmit) {
        return;
      }

      await this.web3Wallet.emitSessionEvent({
        topic: this.session.topic,
        event: { name: 'chainChanged', data: chainChangedEmission.data },
        chainId: chainChangedEmission.chainId as CaipChainId,
      });
    } catch (err) {
      DevLogger.log(
        `WC2::updateSession can't update session topic=${this.session.topic}`,
        err,
      );
    }
  };

  private doesChainExist(caip2ChainId: CaipChainId) {
    try {
      const chainId = getChainIdForCaipChainId(caip2ChainId);
      const networkConfigurations = selectEvmNetworkConfigurationsByChainId(
        store.getState(),
      );
      return networkConfigurations[chainId] !== undefined;
    } catch (err) {
      return false;
    }
  }

  switchToChain = async (
    caip2ChainId: CaipChainId,
    originFromRequest?: string,
    allowSwitchingToNewChain = false,
  ) => {
    if (!this.doesChainExist(caip2ChainId)) {
      throw rpcErrors.invalidParams({
        message: `Invalid parameters: chainId does not exist.`,
      });
    }

    const channelId = this.channelId;
    // NOTE: originFromRequest and this.selfReportedUrl are both unverified dapp-provided values.
    // They are shown in the confirmation/approval UI to indicate the claimed source of the
    // request. They should NOT be treated as equivalent to a verified origin/hostname.
    const unverifiedOrigin = originFromRequest ?? this.selfReportedUrl;

    const { allowed, existingNetwork, hexChainIdString } =
      await hasPermissionsToSwitchChainRequest(caip2ChainId, channelId);

    if (!allowed && !allowSwitchingToNewChain) {
      throw providerErrors.unauthorized({
        message: `Requested chain is not permitted for this WalletConnect session. Reconnect and approve ${caip2ChainId} to continue.`,
      });
    }

    const activeCaip2ChainId = `${KnownCaipNamespace.Eip155}:${parseInt(
      this.getCurrentChainId(),
      16,
    )}`;
    if (caip2ChainId !== activeCaip2ChainId) {
      DevLogger.log(
        `WC::checkWCPermissions switching to network:`,
        existingNetwork,
      );
      const [networkClientId, networkConfiguration] = existingNetwork;

      const hooks = getRpcMethodMiddlewareHooks({
        origin: this.channelId,
        url: { current: unverifiedOrigin },
        title: { current: this.session.peer.metadata.name },
        icon: {
          current: this.session.peer.metadata.icons?.[0] as ImageSourcePropType,
        },
        analytics: {},
        channelId: this.channelId,
        getSource: () => AppConstants.REQUEST_SOURCES.WC,
      });

      const originalRequestPermittedChainsPermissionIncrementalForOrigin =
        hooks.requestPermittedChainsPermissionIncrementalForOrigin;
      hooks.requestPermittedChainsPermissionIncrementalForOrigin = (
        ...args
      ) => {
        // Clear any pending approvals before prompting the user to permit a new chain.
        // Unsure why this is needed, but it was previously found here before this code was refactored.
        // https://github.com/MetaMask/metamask-mobile/blob/081e412f6680e03ad509194acd620c67a273a92b/app/core/WalletConnect/wc-utils.ts#L242
        Engine.context.ApprovalController.clearRequests(
          providerErrors.userRejectedRequest(),
        );
        return originalRequestPermittedChainsPermissionIncrementalForOrigin(
          ...args,
        );
      };

      const rpcUrl =
        networkConfiguration.rpcEndpoints[
          networkConfiguration.defaultRpcEndpointIndex
        ].url;

      // Switching to the network is allowed so try switching into it
      await switchToNetwork({
        networkClientId,
        nativeCurrency: networkConfiguration.nativeCurrency,
        chainId: hexChainIdString,
        rpcUrl,
        analytics: {},
        origin: this.channelId,
        hooks: getRpcMethodMiddlewareHooks({
          origin: this.channelId,
          url: { current: unverifiedOrigin },
          title: { current: this.session.peer.metadata.name },
          icon: {
            current: this.session.peer.metadata
              .icons?.[0] as ImageSourcePropType,
          },
          analytics: {},
          channelId: this.channelId,
          getSource: () => AppConstants.REQUEST_SOURCES.WC,
        }),
      });
    }
  };

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
    const rawRequestChainId = requestEvent.params.chainId;
    if (typeof rawRequestChainId !== 'string') {
      this._isHandlingRequest = false;
      return this.web3Wallet.respondSessionRequest({
        topic: this.session.topic,
        response: {
          id: requestEvent.id,
          jsonrpc: '2.0',
          error: { code: 4902, message: ERROR_MESSAGES.INVALID_CHAIN },
        },
      });
    }
    const requestChainId = normalizeCaipChainIdInbound(
      rawRequestChainId,
    ) as CaipChainId;
    let requestNamespace: string | undefined;
    try {
      requestNamespace = parseCaipChainId(requestChainId).namespace;
    } catch {
      this._isHandlingRequest = false;
      return this.web3Wallet.respondSessionRequest({
        topic: this.session.topic,
        response: {
          id: requestEvent.id,
          jsonrpc: '2.0',
          error: { code: 4902, message: ERROR_MESSAGES.INVALID_CHAIN },
        },
      });
    }

    // Mark redirect before any routing so all namespaces benefit from it.
    const redirectNamespace =
      requestNamespace === KnownCaipNamespace.Wallet
        ? KnownCaipNamespace.Eip155
        : requestNamespace;
    const redirectMethods =
      (redirectNamespace && REDIRECT_METHODS_BY_NAMESPACE[redirectNamespace]) ??
      [];
    if (redirectMethods.includes(method)) {
      this.requestsToRedirect[requestEvent.id] = true;
    }

    const getPermittedChainsSafe = async (
      subject: string,
    ): Promise<CaipChainId[]> => {
      try {
        return await getPermittedChains(subject);
      } catch (error) {
        if (error instanceof PermissionDoesNotExistError) {
          return [];
        }
        throw error;
      }
    };

    const permittedChainsFromChannel = await getPermittedChainsSafe(
      this.channelId,
    );
    const permittedChainsFromSession =
      this.session.topic !== this.channelId
        ? await getPermittedChainsSafe(this.session.topic)
        : [];
    const permittedChains = Array.from(
      new Set([...permittedChainsFromChannel, ...permittedChainsFromSession]),
    );
    const compatibleRequestChainIds =
      getCompatibleCaipChainIdsForWalletConnect(requestChainId);
    const isPermittedByPermissionController = compatibleRequestChainIds.some(
      (chainId) => permittedChains.includes(chainId as CaipChainId),
    );
    const activeSessionChains = Object.values(this.session.namespaces ?? {})
      .flatMap((namespaceSlice) => namespaceSlice?.chains ?? [])
      .filter(Boolean);
    const isPermittedByActiveSession = compatibleRequestChainIds.some(
      (chainId) => activeSessionChains.includes(chainId),
    );
    const isPermittedRequestChain =
      isPermittedByPermissionController || isPermittedByActiveSession;

    // Non-EVM namespace routing: delegate to MultichainRoutingService which
    // resolves the correct Snap internally via the SnapKeyring. The scope
    // (CAIP-2 chainId) and the dapp-permitted accounts for that namespace
    // are passed through untouched.
    if (
      requestNamespace &&
      requestNamespace !== KnownCaipNamespace.Eip155 &&
      requestNamespace !== KnownCaipNamespace.Wallet
    ) {
      if (!isPermittedRequestChain) {
        this._isHandlingRequest = false;
        return this.web3Wallet.respondSessionRequest({
          topic: this.session.topic,
          response: {
            id: requestEvent.id,
            jsonrpc: '2.0',
            error: providerErrors.unauthorized({
              message: `Requested chain is not permitted for this WalletConnect session. Reconnect and approve ${requestChainId} to continue.`,
            }),
          },
        });
      }
      return this.routeToSnap(requestEvent, requestChainId);
    }

    const isSwitchingChain = isSwitchingChainRequest(requestEvent);

    let caip2ChainId: CaipChainId;
    let hexChainId: Hex;
    try {
      hexChainId = isSwitchingChain
        ? requestEvent.params.request.params[0].chainId
        : getChainIdForCaipChainId(requestEvent.params.chainId as CaipChainId);
      caip2ChainId = `eip155:${parseInt(hexChainId, 16)}` as CaipChainId;
    } catch (err) {
      this._isHandlingRequest = false;
      return this.web3Wallet.respondSessionRequest({
        topic: this.session.topic,
        response: {
          id: requestEvent.id,
          jsonrpc: '2.0',
          error: { code: 4902, message: ERROR_MESSAGES.INVALID_CHAIN },
        },
      });
    }

    const methodParams = requestEvent.params.request.params;

    const currentMetadata = store.getState().sdk.wc2Metadata ?? {
      id: this.channelId,
      url: unverifiedOrigin,
      name: this.session.peer.metadata.name,
      icon: this.session.peer.metadata.icons?.[0] as string,
    };

    store.dispatch(
      updateWC2Metadata({
        ...currentMetadata,
        lastVerifiedUrl: unverifiedOrigin,
      }),
    );

    DevLogger.log(
      `WalletConnect2Session::handleRequest caip2ChainId=${caip2ChainId} method=${method} unverifiedOrigin=${unverifiedOrigin}`,
    );

    const isAllowedChainId = permittedChains.includes(caip2ChainId);

    if (method === 'wallet_switchEthereumChain') {
      try {
        await this.switchToChain(caip2ChainId, unverifiedOrigin, true);
        // respond to the request as successful
        DevLogger.log(`WC::handleRequest approving switch chain request`);
        return this.approveRequest({ id: requestEvent.id + '', result: true });
      } catch (error) {
        this._isHandlingRequest = false;
        return this.web3Wallet.respondSessionRequest({
          topic: this.session.topic,
          response: {
            id: requestEvent.id,
            jsonrpc: '2.0',
            error: { code: 4902, message: ERROR_MESSAGES.INVALID_CHAIN },
          },
        });
      }
    }

    // if the chainId for the request is different from the active chainId, we need to switch to it
    // (as long as it's permitted already)
    const currentChainId = this.getCurrentChainId();
    DevLogger.log(
      `WC::handleRequest currentChainId=${currentChainId} chainId=${hexChainId} isAllowedChainId=${isAllowedChainId}`,
    );
    if (currentChainId !== hexChainId && isAllowedChainId) {
      DevLogger.log(`WC::handleRequest switching to chainId=${caip2ChainId}`);
      await this.switchToChain(caip2ChainId, this.channelId);
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Chain change notification is handled by BackgroundBridge → WalletConnectPort
    }

    if (!isAllowedChainId) {
      DevLogger.log(`WC::checkWCPermissions chainId is not permitted`);
      throw providerErrors.unauthorized({
        message: `Requested chain is not permitted for this WalletConnect session. Reconnect and approve ${caip2ChainId} to continue.`,
      });
    }

    if (method === 'eth_sendTransaction') {
      await this.handleSendTransaction(
        caip2ChainId,
        requestEvent,
        methodParams,
        unverifiedOrigin,
      );
      return;
    }

    if (method === 'eth_signTypedData') {
      this.backgroundBridge.onMessage({
        name: 'walletconnect-provider',
        data: {
          id: requestEvent.id,
          topic: requestEvent.topic,
          method: 'eth_signTypedData_v3',
          params: methodParams,
        },
        origin: unverifiedOrigin,
      });
      return;
    }

    this.backgroundBridge.onMessage({
      name: 'walletconnect-provider',
      data: {
        id: requestEvent.id,
        topic: requestEvent.topic,
        method,
        params: methodParams,
      },
      origin: unverifiedOrigin,
    });
  };

  /**
   * Routes a non-EVM WalletConnect session request through the
   * `MultichainRoutingService`. The routing service resolves the correct
   * Snap from the connected account address and dispatches the request,
   * keeping this class chain-agnostic.
   */
  private routeToSnap = async (
    requestEvent: WalletKitTypes.SessionRequest,
    scope: CaipChainId,
  ) => {
    const { method, params } = requestEvent.params.request;
    const mappedRequest = mapRequestForSnap({ scope, method, params });

    const namespace = scope.split(':')[0];
    const connectedAddresses = (this.session.namespaces?.[namespace]
      ?.accounts ?? []) as CaipAccountId[];

    DevLogger.log(
      `WC2::routeToSnap scope=${scope} method=${method} mappedMethod=${mappedRequest.method} connectedAddresses=${connectedAddresses.length}`,
    );
    try {
      const result = await callMultichainRoutingService({
        connectedAddresses,
        scope,
        requestId: requestEvent.id,
        mappedRequest,
      });
      const walletConnectResult = normalizeSnapResponse({
        scope,
        method,
        params,
        result,
      });
      await this.approveRequest({
        id: requestEvent.id + '',
        result: walletConnectResult,
      });
    } catch (error) {
      await this.rejectRequest({ id: requestEvent.id + '', error });
    } finally {
      this._isHandlingRequest = false;
    }
  };

  removeListeners = async () => {
    this.backgroundBridge.onDisconnect();
  };

  private async handleSendTransaction(
    caip2ChainId: CaipChainId,
    requestEvent: WalletKitTypes.SessionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    methodParams: any,
    /** WARNING: This origin is self-reported by the dapp and unverified. */
    unverifiedOrigin: string,
  ) {
    try {
      const networkClientId = getNetworkClientIdForCaipChainId(caip2ChainId);
      const trx = await addTransaction(methodParams[0], {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin: unverifiedOrigin,
        securityAlertResponse: undefined,
      });

      const reqObject = {
        id: requestEvent.id,
        jsonrpc: '2.0',
        method: 'eth_sendTransaction',
        origin: unverifiedOrigin,
        params: [
          {
            from: methodParams[0].from,
            to: methodParams[0].to,
            value: methodParams[0]?.value,
            data: methodParams[0]?.data,
          },
        ],
      };

      ppomUtil.validateRequest(reqObject, {
        transactionMeta: trx.transactionMeta,
      });
      const hash = await trx.result;

      await this.approveRequest({ id: requestEvent.id + '', result: hash });
    } catch (error) {
      await this.rejectRequest({ id: requestEvent.id + '', error });
    }
  }
}

export default WalletConnect2Session;
