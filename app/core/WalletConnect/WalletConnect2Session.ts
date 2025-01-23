import Client, { SingleEthereumTypes } from '@walletconnect/se-sdk';
import { WalletDevice } from '@metamask/transaction-controller';
import { PermissionController } from '@metamask/permission-controller';
import { NavigationContainerRef } from '@react-navigation/native';
import { ErrorResponse } from '@walletconnect/jsonrpc-types';
import { SessionTypes } from '@walletconnect/types';
import { Platform, Linking, ImageSourcePropType } from 'react-native';

import Routes from '../../../app/constants/navigation/Routes';
import ppomUtil from '../../../app/lib/ppom/ppom-util';
import Device from '../../util/device';
import Logger from '../../util/Logger';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';
import getRpcMethodMiddleware from '../RPCMethods/RPCMethodMiddleware';
import DevLogger from '../SDKConnect/utils/DevLogger';
import METHODS_TO_REDIRECT from './wc-config';
import { Minimizer } from '../NativeModules';
import { WALLET_CONNECT_ORIGIN } from '../../../app/util/walletconnect';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../selectors/networkController';
import { store } from '../../store';
import { addTransaction } from '../../util/transaction-controller';
import { getPermittedAccounts } from '../Permissions';
import { hideWCLoadingState, showWCLoadingState } from './wc-utils';
import { getDefaultNetworkByChainId } from '../../util/networks';
import { ERROR_MESSAGES } from './WalletConnectV2';
import { getGlobalNetworkClientId } from '../../util/networks/global-network';

const ERROR_CODES = {
  USER_REJECT_CODE: 5000,
};

const RPC_WALLET_SWITCHETHEREUMCHAIN = 'wallet_switchEthereumChain';

interface BackgroundBridgeFactory {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (options: any) => BackgroundBridge;
}

class WalletConnect2Session {
  private backgroundBridge: BackgroundBridge;
  private navigation?: NavigationContainerRef;
  private web3Wallet: Client;
  private deeplink: boolean;
  // timeoutRef is used on android to prevent automatic redirect on switchChain and wait for wallet_addEthereumChain.
  // If addEthereumChain is not received after 3 seconds, it will redirect.
  private timeoutRef: NodeJS.Timeout | null = null;
  private requestsToRedirect: { [request: string]: boolean } = {};
  private topicByRequestId: { [requestId: string]: string } = {};
  private requestByRequestId: {
    [requestId: string]: SingleEthereumTypes.SessionRequest;
  } = {};

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
    web3Wallet: Client;
    channelId: string;
    session: SessionTypes.Struct;
    deeplink: boolean;
    navigation?: NavigationContainerRef;
    backgroundBridgeFactory?: BackgroundBridgeFactory;
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

    this.backgroundBridge = backgroundBridgeFactory.create({
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
          analytics: {},
          isMMSDK: false,
          isHomepage: () => false,
          fromHomepage: { current: false },
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
            current: icons?.[0] as ImageSourcePropType, // Need to cast here because this cames from @walletconnect/types as string
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

    this.checkPendingRequests();
  }

  // Check for pending unresolved requests
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
            `WC2::constructor error while handling request`,
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

  approveRequest = async ({ id, result }: { id: string; result: unknown }) => {
    const topic = this.topicByRequestId[id];
    const initialRequest = this.requestByRequestId[id];

    // Special case for eth_switchNetwork to wait for the modal to be closed
    if (
      initialRequest?.params.request.method === RPC_WALLET_SWITCHETHEREUMCHAIN
    ) {
      await this.handleSwitchEthereumChain(initialRequest);
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

  private handleSwitchEthereumChain = async (
    initialRequest: SingleEthereumTypes.SessionRequest,
  ) => {
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

      if (accounts.length === 0) {
        console.warn(
          `WC2::updateSession invalid accounts --- skip ${typeof chainId} chainId=${chainId} accounts=${accounts})`,
        );
        const approvedAccounts =
          await this.getApprovedAccountsFromPermissions();
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
        // overwrite chainId with actual value.
        chainId = parseInt(selectChainId(store.getState()));
        DevLogger.log(
          `WC2::updateSession overwrite invalid chain Id with selectedChainId=${chainId}`,
        );
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

  private async getApprovedAccountsFromPermissions(): Promise<string[]> {
    const permissionController = (
      Engine.context as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;

    DevLogger.log(
      `WC2::updateSession permissionController.state=${JSON.stringify(
        permissionController.state,
      )}`,
    );

    const origin = this.session.peer.metadata.url;
    return await getPermittedAccounts(origin);
  }

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
    const origin = WALLET_CONNECT_ORIGIN + hostname; // allow correct origin for analytics with eth_sendTransaction

    let method = requestEvent.params.request.method;
    const chainId = parseInt(requestEvent.params.chainId);

    // TODO: Replace "any" with type
    const methodParams = requestEvent.params.request.params;

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
      return;
    }

    // Specific logic to prevent automatic redirect on switchChain and let the dapp call wallet_addEthereumChain on error.
    if (method.toLowerCase() === RPC_WALLET_SWITCHETHEREUMCHAIN.toLowerCase()) {
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
          `SKIP rpcMiddleWare -- auto rejection is detected (_chainId=${_chainId})`,
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
      await this.handleSendTransaction(requestEvent, methodParams, origin);
      return;
    } else if (method === 'eth_signTypedData') {
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

  removeListeners = async () => {
    this.backgroundBridge.onDisconnect();
  };

  private async handleSendTransaction(
    requestEvent: SingleEthereumTypes.SessionRequest,
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
