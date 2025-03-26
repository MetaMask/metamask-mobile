import { WalletDevice } from '@metamask/transaction-controller';
import { NavigationContainerRef } from '@react-navigation/native';
import { IWalletKit, WalletKitTypes } from '@reown/walletkit';
import { ErrorResponse } from '@walletconnect/jsonrpc-types';
import { SessionTypes } from '@walletconnect/types';
import { ImageSourcePropType, Linking, Platform } from 'react-native';

import Routes from '../../../app/constants/navigation/Routes';
import ppomUtil from '../../../app/lib/ppom/ppom-util';
import { selectEvmChainId } from '../../selectors/networkController';
import { store } from '../../store';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import { getGlobalNetworkClientId } from '../../util/networks/global-network';
import { addTransaction } from '../../util/transaction-controller';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import { Minimizer } from '../NativeModules';
import { getPermittedAccounts } from '../Permissions';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { ERROR_MESSAGES } from './WalletConnectV2';
import METHODS_TO_REDIRECT from './wc-config';
import {
  checkWCPermissions,
  getScopedPermissions,
  hideWCLoadingState,
  // normalizeOrigin,
  getHostname
} from './wc-utils';

const ERROR_CODES = {
  USER_REJECT_CODE: 5000,
};

const RPC_WALLET_SWITCHETHEREUMCHAIN = 'wallet_switchEthereumChain';
const RPC_WALLET_ADDETHEREUMCHAIN = 'wallet_addEthereumChain';

interface BackgroundBridgeFactory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (options: any) => BackgroundBridge;
}

class WalletConnect2Session {
  private backgroundBridge: BackgroundBridge;
  private navigation?: NavigationContainerRef;
  private web3Wallet: IWalletKit;
  private deeplink: boolean;
  // timeoutRef is used on android to prevent automatic redirect on switchChain and wait for wallet_addEthereumChain.
  // If addEthereumChain is not received after 3 seconds, it will redirect.
  private timeoutRef: NodeJS.Timeout | null = null;
  private requestsToRedirect: { [request: string]: boolean } = {};
  private topicByRequestId: { [requestId: string]: string } = {};
  private requestByRequestId: {
    [requestId: string]: WalletKitTypes.SessionRequest;
  } = {};
  private lastChainId: string;
  private isHandlingChainChange = false;

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
    navigation?: NavigationContainerRef;
    backgroundBridgeFactory?: BackgroundBridgeFactory;
  }) {
    this.web3Wallet = web3Wallet;
    this.deeplink = deeplink;
    this.session = session;
    this.navigation = navigation;

    DevLogger.log(
      `WalletConnect2Session::constructor channelId=${channelId} deeplink=${deeplink}`,
      navigation,
    );

    const url = session.peer.metadata.url;
    const name = session.peer.metadata.name;
    const icons = session.peer.metadata.icons;

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
          hostname: url,
          getProviderState,
          channelId,
          analytics: {},
          isMMSDK: false,
          isHomepage: () => false,
          fromHomepage: { current: false },
          injectHomePageScripts: () => false,
          navigation: this.navigation,
          url: { current: url },
          title: { current: name },
          icon: { current: icons?.[0] as ImageSourcePropType },
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

    this.checkPendingRequests();

    this.lastChainId = selectEvmChainId(store.getState());

    // Subscribe to store changes to detect chain switches
    store.subscribe(() => {
      const newChainId = selectEvmChainId(store.getState());
      if (newChainId !== this.lastChainId && !this.isHandlingChainChange) {
        this.lastChainId = newChainId;
        const decimalChainId = parseInt(newChainId, 16);
        this.handleChainChange(decimalChainId).catch((error) => {
          console.warn('WC2::store.subscribe Error handling chain change:', error);
        });
      }
    });
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
            console.warn(
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

    const showReturnModal = () => {
      navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.RETURN_TO_DAPP_MODAL,
      });
    };

    setTimeout(() => {
      if (Device.isIos() && parseInt(Platform.Version as string) >= 17) {
        const redirect = this.session.peer.metadata.redirect;
        const peerLink = redirect?.native || redirect?.universal;
        if (peerLink) {
          try {
            Linking.openURL(peerLink);
          } catch (error) {
            DevLogger.log(`WC2::redirect error while opening ${peerLink}`);
            showReturnModal();
          }
        } else {
          showReturnModal();
        }
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

  emitEvent = async (eventName: string, data: unknown) => {
    console.log("🔵 emitEvent", eventName, data);
    const res = await this.web3Wallet.emitSessionEvent({
      topic: this.session.topic,
      event: { name: eventName, data },
      chainId: `eip155:${data}`,
    });
    console.log("🔵 emitEvent res", res);
  };

  /** Handle chain change by updating session namespaces and emitting event */
  private async handleChainChange(chainIdDecimal: number) {
    console.log("🔴 handleChainChange chainIdDecimal", chainIdDecimal);

    if (this.isHandlingChainChange) return;
    this.isHandlingChainChange = true;

    try {
      // const origin = normalizeOrigin(this.session.peer.metadata.url);
      // const origin = this.session.peer.metadata.url;
      // const accounts = await getPermittedAccounts(origin);

      // Update session namespaces
      const currentNamespaces = this.session.namespaces;
      const newChainId = `eip155:${chainIdDecimal}`;
      const updatedChains = [
        ...new Set([...(currentNamespaces.eip155?.chains || []), newChainId]),
      ];

      const updatedNamespaces = {
        ...currentNamespaces,
        eip155: {
          ...currentNamespaces.eip155,
          chains: updatedChains,
          methods: currentNamespaces.eip155.methods,
          events: currentNamespaces.eip155.events,
          accounts: currentNamespaces.eip155.accounts,
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
    const initialRequest = this.requestByRequestId[id];
    const method = initialRequest?.params.request.method;

    if (
      method === RPC_WALLET_ADDETHEREUMCHAIN ||
      method === RPC_WALLET_SWITCHETHEREUMCHAIN
    ) {
      const chainIdHex = initialRequest.params.request.params[0].chainId;
      const chainIdDecimal = parseInt(chainIdHex, 16);
      console.log("👉👉👉 approveRequest chainIdDecimal", chainIdDecimal);
      await this.handleChainChange(chainIdDecimal);
    }

    try {
      await this.web3Wallet.respondSessionRequest({
        topic,
        response: {
          id: parseInt(id),
          jsonrpc: '2.0',
          result,
        },
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

    const errorResponse: ErrorResponse = {
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
    console.log("🔴 updateSession accounts", JSON.stringify(accounts, null, 2));
    try {
      if (!accounts) {
        DevLogger.log(
          `Invalid accounts --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        return;
      }

      // const origin = normalizeOrigin(this.session.peer.metadata.url);
      const origin = this.session.peer.metadata.url;
      console.log("🔴 updateSession origin", origin);
      DevLogger.log(
        `WC2::updateSession origin=${origin} - chainId=${chainId} - accounts=${accounts}`,
      );

      if (accounts.length === 0) {
        const approvedAccounts = await getPermittedAccounts(getHostname(origin));
        if (approvedAccounts.length > 0) {
          DevLogger.log(
            `WC2::updateSession found approved accounts`,
            approvedAccounts,
          );
          accounts = approvedAccounts;
        } else {
          console.warn(
            `WC2::updateSession no permitted accounts found for topic=${this.session.topic} origin=${origin}`,
          );
          return;
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

      const namespaces = await getScopedPermissions({ origin });
      DevLogger.log(`🔴🔴 WC2::updateSession updating with namespaces`, namespaces);
 
      await this.web3Wallet.updateSession({
        topic: this.session.topic,
        namespaces,
      });

      // console.log("🔴🔴🔴 updateSession acknowledged", acknowledged);
      
      // await acknowledged();
      
      console.log("🔴🔴🔴 updateSession emitEvent");
      await this.emitEvent('chainChanged', chainId);
    } catch (err) {
      console.warn(
        `WC2::updateSession can't update session topic=${this.session.topic}`,
        err,
      );
    }
  };

  handleRequest = async (requestEvent: WalletKitTypes.SessionRequest) => {
    DevLogger.log(
      'WC2::handleRequest requestEvent',
      JSON.stringify(requestEvent, null, 2),
    );
    this.topicByRequestId[requestEvent.id] = requestEvent.topic;
    this.requestByRequestId[requestEvent.id] = requestEvent;

    if (this.timeoutRef) {
      // Always clear the timeout ref on new message, it is only used for wallet_switchEthereumChain auto reject on android
      clearTimeout(this.timeoutRef);
    }

    hideWCLoadingState({ navigation: this.navigation });

    const verified = requestEvent.verifyContext?.verified;
    const origin = verified?.origin;
    const method = requestEvent.params.request.method;
    const caip2ChainId = method === 'wallet_switchEthereumChain' ? `eip155:${parseInt(requestEvent.params.request.params[0].chainId, 16)}` : requestEvent.params.chainId;
    const methodParams = requestEvent.params.request.params;

    DevLogger.log(
      `WalletConnect2Session::handleRequest caip2ChainId=${caip2ChainId} method=${method} origin=${origin}`,
    );

    try {
      const allowed = await checkWCPermissions({ origin, caip2ChainId });
      DevLogger.log(
        `WC2::handleRequest caip2ChainId=${caip2ChainId} is allowed=${allowed}`,
      );

      if (!allowed) {
        DevLogger.log(
          `WC2::handleRequest caip2ChainId=${caip2ChainId} is not allowed`,
        );
        await this.web3Wallet.respondSessionRequest({
          topic: this.session.topic,
          response: {
            id: requestEvent.id,
            jsonrpc: '2.0',
            error: { code: 4902, message: ERROR_MESSAGES.INVALID_CHAIN },
          },
        });
        return;
      }
    } catch (error) {
      DevLogger.log(
        `WC2::handleRequest caip2ChainId=${caip2ChainId} is not allowed`,
      );
      await this.web3Wallet.respondSessionRequest({
        topic: this.session.topic,
        response: {
          id: requestEvent.id,
          jsonrpc: '2.0',
          error: { code: 4902, message: ERROR_MESSAGES.INVALID_CHAIN },
        },
      });
      return;
    }

    if (METHODS_TO_REDIRECT[method]) {
      this.requestsToRedirect[requestEvent.id] = true;
    }

    if (method === 'wallet_switchEthereumChain') {
      this.handleChainChange(parseInt(caip2ChainId.split(':')[1], 10));
      return;
    }

    if (method === 'eth_sendTransaction') {
      await this.handleSendTransaction(requestEvent, methodParams, origin);
      return;
    }
    
    if (method === 'eth_signTypedData') {
      await this.backgroundBridge.onMessage({
        name: 'walletconnect-provider',
        data: {
          id: requestEvent.id,
          topic: requestEvent.topic,
          method: 'eth_signTypedData_v3',
          params: methodParams,
        },
        origin,
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
      origin,
    });
  };

  removeListeners = async () => {
    this.backgroundBridge.onDisconnect();
  };

  private async handleSendTransaction(
    requestEvent: WalletKitTypes.SessionRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    methodParams: any,
    origin: string,
  ) {
    try {
      const networkClientId = getGlobalNetworkClientId();

      const trx = await addTransaction(methodParams[0], {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        networkClientId,
        origin,
        securityAlertResponse: undefined,
      });

      const id = trx.transactionMeta.id;
      const reqObject = {
        id: requestEvent.id,
        jsonrpc: '2.0',
        method: 'eth_sendTransaction',
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
  }
}

export default WalletConnect2Session;
