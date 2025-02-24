/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import {
  createSelectedNetworkMiddleware,
  METAMASK_DOMAIN,
} from '@metamask/selected-network-controller';
import EthQuery from '@metamask/eth-query';
import { JsonRpcEngine, JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import MobilePortStream from '../MobilePortStream';
import { setupMultiplex } from '../../util/streams';
import {
  createOriginMiddleware,
  createLoggerMiddleware,
} from '../../util/middlewares';
import Engine from '../Engine';
import { createSanitizationMiddleware } from '../SanitizationMiddleware';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import RemotePort from './RemotePort';
import WalletConnectPort from './WalletConnectPort';
import Port from './Port';
import { store } from '../../store';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import snapMethodMiddlewareBuilder from '../Snaps/SnapsMethodMiddleware';
import { SubjectType } from '@metamask/permission-controller';
///: END:ONLY_INCLUDE_IF

import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
const createFilterMiddleware = require('@metamask/eth-json-rpc-filters');
const createSubscriptionManager = require('@metamask/eth-json-rpc-filters/subscriptionManager');
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
const pump = require('pump');
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;
const { NOTIFICATION_NAMES } = AppConstants;
import DevLogger from '../SDKConnect/utils/DevLogger';
import { getPermittedAccounts } from '../Permissions';
import { NetworkStatus } from '@metamask/network-controller';
import { NETWORK_ID_LOADING } from '../redux/slices/inpageProvider';
import createUnsupportedMethodMiddleware from '../RPCMethods/createUnsupportedMethodMiddleware';
import createLegacyMethodMiddleware from '../RPCMethods/createLegacyMethodMiddleware';
import createTracingMiddleware from '../createTracingMiddleware';
import WebView from '@metamask/react-native-webview';
import { Json, JsonRpcParams } from '@metamask/utils';

type BackgroundBridgeState = {
  isInitialized: boolean;
  isUnlocked: boolean;
  network: string;
  selectedAddress: string;
};

const legacyNetworkId = () => {
  const { networksMetadata, selectedNetworkClientId } =
    store.getState().engine.backgroundState.NetworkController;

  const { networkId } = store.getState().inpageProvider;

  return networksMetadata?.[selectedNetworkClientId].status !==
    NetworkStatus.Available
    ? NETWORK_ID_LOADING
    : networkId;
};

export class BackgroundBridge extends EventEmitter {
  #jsonRpcEngine: JsonRpcEngine = new JsonRpcEngine();
  url: string;
  hostname: string;
  remoteConnHost?: string;
  isMainFrame: boolean;
  isWalletConnect: boolean;
  isMMSDK: boolean;
  isRemoteConn: boolean;
  disconnected: boolean;
  channelId: string;
  deprecatedNetworkVersions: Record<string, string>;

  constructor({
    webview,
    url,
    getRpcMethodMiddleware,
    isMainFrame,
    isRemoteConn,
    sendMessage,
    isWalletConnect,
    wcRequestActions,
    remoteConnHost,
    isMMSDK,
    channelId,
  }: {
    webview?: React.RefObject<WebView>;
    url: string;
    getRpcMethodMiddleware: (params: {
      hostname: string;
      getProviderState: (origin: string) => {
        isUnlocked: boolean;
        chainId: string;
        networkVersion: string;
      };
    }) => JsonRpcMiddleware<JsonRpcParams, Json>;
    isMainFrame: boolean;
    isRemoteConn: boolean;
    sendMessage?: (params: unknown) => void;
    isWalletConnect: boolean;
    wcRequestActions?: {
      approveRequest: (params: { id: string; result: unknown }) => void;
      rejectRequest: (params: { id: string; error: unknown }) => void;
      updateSession: (params: { chainId: string; accounts: unknown }) => void;
    };
    remoteConnHost?: string;
    isMMSDK: boolean;
    channelId: string;
  }) {
    super();
    this.url = url;
    // TODO - When WalletConnect and MMSDK uses the Permission System, URL does not apply in all conditions anymore since hosts may not originate from web. This will need to change!
    this.hostname = new URL(url).hostname;
    this.remoteConnHost = remoteConnHost;
    this.isMainFrame = isMainFrame;
    this.isWalletConnect = isWalletConnect;
    this.isMMSDK = isMMSDK;
    this.isRemoteConn = isRemoteConn;
    this.disconnected = false;
    this.channelId = channelId;
    this.deprecatedNetworkVersions = {};

    this.createMiddleware = getRpcMethodMiddleware;

    this.port =
      isRemoteConn && sendMessage
        ? new RemotePort(sendMessage)
        : this.isWalletConnect
        ? new WalletConnectPort(wcRequestActions)
        : new Port(webview?.current, isMainFrame);

    const networkClientId = Engine.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      this.hostname,
    );

    const networkClient = Engine.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    this.lastChainIdSent = networkClient.configuration.chainId;

    this.networkVersionSent = parseInt(
      networkClient.configuration.chainId,
      16,
    ).toString();

    // This will only be used for WalletConnect for now
    this.addressSent =
      Engine.context.AccountsController.getSelectedAccount().address.toLowerCase();

    // connect features
    this.#setupProviderConnection();

    // Setup subscription events
    this.#subscribeToControllerStateChangeEvents();

    this.on('update', () => this.#onStateUpdate());

    if (this.isRemoteConn) {
      const memState = this.getState();
      const selectedAddress = memState.selectedAddress;
      this.notifyChainChanged();
      this.notifySelectedAddressChanged(selectedAddress);
    }
  }

  onUnlock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.disconnected) return;

    if (this.isRemoteConn) {
      // Not sending the lock event in case of a remote connection as this is handled correctly already by the SDK
      // In case we want to send, use  new structure
      /*const memState = this.getState();
      const selectedAddress = memState.selectedAddress;

      this.sendNotification({
        method: NOTIFICATION_NAMES.unlockStateChanged,
        params: {
          isUnlocked: true,
          accounts: [selectedAddress],
        },
      });*/
      return;
    }

    this.sendNotification({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: true,
    });
  }

  onLock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.disconnected) return;

    if (this.isRemoteConn) {
      // Not sending the lock event in case of a remote connection as this is handled correctly already by the SDK
      // In case we want to send, use  new structure
      /*this.sendNotification({
        method: NOTIFICATION_NAMES.unlockStateChanged,
        params: {
          isUnlocked: false,
        },
      });*/
      return;
    }

    this.sendNotification({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: false,
    });
  }

  async #getProviderNetworkState(origin: string = METAMASK_DOMAIN) {
    const networkClientId = Engine.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      origin,
    );

    const networkClient = Engine.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    const { chainId } = networkClient.configuration;

    let networkVersion: string | null =
      this.deprecatedNetworkVersions[networkClientId];
    if (!networkVersion) {
      const ethQuery = new EthQuery(networkClient.provider);
      networkVersion = await new Promise((resolve) => {
        ethQuery.sendAsync({ method: 'net_version' }, (error, result) => {
          if (error) {
            console.error(error);
            resolve(null);
          } else {
            this.deprecatedNetworkVersions[networkClientId] = result as string;
            resolve(result as string);
          }
        });
      });
    }

    return {
      chainId,
      networkVersion: networkVersion ?? 'loading',
    };
  }

  async notifyChainChanged(params?: {
    chainId: string;
    networkVersion: string;
  }) {
    DevLogger.log(`notifyChainChanged: `, params);
    this.sendNotification({
      method: NOTIFICATION_NAMES.chainChanged,
      params: params ?? (await this.#getProviderNetworkState(this.hostname)),
    });
  }

  async notifySelectedAddressChanged(selectedAddress: string) {
    try {
      let approvedAccounts = [];
      DevLogger.log(
        `notifySelectedAddressChanged: ${selectedAddress} channelId=${this.channelId} wc=${this.isWalletConnect} url=${this.url}`,
      );
      if (this.isWalletConnect) {
        approvedAccounts = await getPermittedAccounts(this.url);
      } else {
        approvedAccounts = await getPermittedAccounts(
          this.channelId ?? this.hostname,
        );
      }
      // Check if selectedAddress is approved
      const found = approvedAccounts
        .map((addr) => addr.toLowerCase())
        .includes(selectedAddress.toLowerCase());

      if (found) {
        // Set selectedAddress as first value in array
        approvedAccounts = [
          selectedAddress,
          ...approvedAccounts.filter(
            (addr) => addr.toLowerCase() !== selectedAddress.toLowerCase(),
          ),
        ];

        DevLogger.log(
          `notifySelectedAddressChanged url: ${this.url} hostname: ${this.hostname}: ${selectedAddress}`,
          approvedAccounts,
        );
        this.sendNotification({
          method: NOTIFICATION_NAMES.accountsChanged,
          params: approvedAccounts,
        });
      } else {
        DevLogger.log(
          `notifySelectedAddressChanged: selectedAddress ${selectedAddress} not found in approvedAccounts`,
          approvedAccounts,
        );
      }
    } catch (err) {
      console.error(`notifySelectedAddressChanged: ${err}`);
    }
  }

  async #onStateUpdate() {
    const memState = this.getState();
    const publicState = await this.#getProviderNetworkState(this.hostname);

    // Check if update already sent
    if (
      this.lastChainIdSent !== publicState.chainId ||
      (this.networkVersionSent !== publicState.networkVersion &&
        publicState.networkVersion !== NETWORK_ID_LOADING)
    ) {
      this.lastChainIdSent = publicState.chainId;
      this.networkVersionSent = publicState.networkVersion;
      await this.notifyChainChanged(publicState);
    }
    // ONLY NEEDED FOR WC FOR NOW, THE BROWSER HANDLES THIS NOTIFICATION BY ITSELF
    if (this.isWalletConnect || this.isRemoteConn) {
      if (
        this.addressSent?.toLowerCase() !==
        memState.selectedAddress?.toLowerCase()
      ) {
        this.addressSent = memState.selectedAddress;
        this.notifySelectedAddressChanged(memState.selectedAddress);
      }
    }
  }

  isUnlocked() {
    return Engine.context.KeyringController.isUnlocked();
  }

  async getProviderState(origin: string) {
    return {
      isUnlocked: this.isUnlocked(),
      ...(await this.#getProviderNetworkState(origin)),
    };
  }

  #sendStateUpdate = () => {
    this.emit('update');
  };

  onMessage = (msg: { name: string; data: unknown }) => {
    this.port.emit('message', { name: msg.name, data: msg.data });
  };

  onDisconnect = () => {
    this.disconnected = true;
    Engine.controllerMessenger.unsubscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.#sendStateUpdate,
    );
    Engine.controllerMessenger.unsubscribe(
      'PreferencesController:stateChange',
      this.#sendStateUpdate,
    );

    this.port.emit('disconnect', { name: this.port.name, data: null });
  };

  /**
   * A method for serving our ethereum provider over a given stream.
   */
  #setupProviderConnection() {
    // Setup multiplexing
    const portStream = new MobilePortStream(this.port, this.url);
    const mux = setupMultiplex(portStream);
    const outStream = mux.createStream(
      this.isWalletConnect ? 'walletconnect-provider' : 'metamask-provider',
    );
    this.#jsonRpcEngine = this.setupProviderEngine();

    // setup connection
    const providerStream = createEngineStream({ engine: this.#jsonRpcEngine });

    pump(outStream, providerStream, outStream, (err: Error) => {
      // handle any middleware cleanup
      this.#jsonRpcEngine.destroy();
      if (err) Logger.log('Error with provider stream conn', err);
    });
  }

  /**
   * Subscribe to state change events from controllers
   */
  #subscribeToControllerStateChangeEvents() {
    Engine.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.#sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'PreferencesController:stateChange',
      this.#sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'SelectedNetworkController:stateChange',
      this.#sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'KeyringController:lock',
      this.onLock.bind(this),
    );
    Engine.controllerMessenger.subscribe(
      'KeyringController:unlock',
      this.onUnlock.bind(this),
    );

    try {
      const pc = Engine.context.PermissionController;
      const controllerMessenger = Engine.controllerMessenger;
      controllerMessenger.subscribe(
        `${pc.name}:stateChange`,
        (subjectWithPermission) => {
          DevLogger.log(
            `PermissionController:stateChange event`,
            subjectWithPermission,
          );
          // Inform dapp about updated permissions
          const selectedAddress = this.getState().selectedAddress;
          this.notifySelectedAddressChanged(selectedAddress);
        },
        (state) => state.subjects[this.channelId],
      );
    } catch (err) {
      DevLogger.log(`Error in BackgroundBridge: ${err}`);
    }
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   **/
  setupProviderEngine() {
    const origin = this.hostname;
    // setup json rpc engine stack
    const baseJsonRpcEngine = new JsonRpcEngine();

    // If the origin is not in the selectedNetworkController's `domains` state
    // when the provider engine is created, the selectedNetworkController will
    // fetch the globally selected networkClient from the networkController and wrap
    // it in a proxy which can be switched to use its own state if/when the origin
    // is added to the `domains` state
    const proxyClient =
      Engine.context.SelectedNetworkController.getProviderAndBlockTracker(
        origin,
      );

    // create filter polyfill middleware
    const filterMiddleware = createFilterMiddleware(proxyClient);

    // create subscription polyfill middleware
    const subscriptionManager = createSubscriptionManager(proxyClient);
    subscriptionManager.events.on('notification', (message: unknown) =>
      baseJsonRpcEngine.emit('notification', message),
    );

    // metadata
    baseJsonRpcEngine.push(createOriginMiddleware({ origin }));
    baseJsonRpcEngine.push(
      createSelectedNetworkMiddleware(
        // @ts-ignore FIXME: Type expects a SelectedNetworkControllerMessenger, but it's using controller messenger from Engine instead
        Engine.controllerMessenger,
      ),
    );
    baseJsonRpcEngine.push(createLoggerMiddleware({ origin }));
    // filter and subscription polyfills
    baseJsonRpcEngine.push(filterMiddleware);
    baseJsonRpcEngine.push(subscriptionManager.middleware);

    // Handle unsupported RPC Methods
    baseJsonRpcEngine.push(createUnsupportedMethodMiddleware());

    // Legacy RPC methods that need to be implemented ahead of the permission middleware
    baseJsonRpcEngine.push(
      createLegacyMethodMiddleware({
        getAccounts: async () =>
          await getPermittedAccounts(this.isMMSDK ? this.channelId : origin),
      }),
    );

    // Sentry tracing middleware
    baseJsonRpcEngine.push(createTracingMiddleware());

    // Append PermissionController middleware
    baseJsonRpcEngine.push(
      Engine.context.PermissionController.createPermissionMiddleware({
        // FIXME: This condition exists so that both WC and SDK are compatible with the permission middleware.
        // This is not a long term solution. BackgroundBridge should be not contain hardcoded logic pertaining to WC, SDK, or browser.
        origin: this.isMMSDK ? this.channelId : origin,
      }),
    );

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    // Snaps middleware
    baseJsonRpcEngine.push(
      snapMethodMiddlewareBuilder(
        Engine.context,
        Engine.controllerMessenger,
        this.url,
        // We assume that origins connecting through the BackgroundBridge are websites
        SubjectType.Website,
      ),
    );
    ///: END:ONLY_INCLUDE_IF

    // user-facing RPC methods
    baseJsonRpcEngine.push(
      this.createMiddleware({
        hostname: this.hostname,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

    baseJsonRpcEngine.push(createSanitizationMiddleware());

    // forward to metamask primary provider
    baseJsonRpcEngine.push(providerAsMiddleware(proxyClient.provider));
    return baseJsonRpcEngine;
  }

  sendNotification(payload: {
    method: string;
    params: boolean | string[] | { chainId: string; networkVersion: string };
  }) {
    DevLogger.log(`BackgroundBridge::sendNotification: `, payload);
    this.#jsonRpcEngine && this.#jsonRpcEngine.emit('notification', payload);
  }

  /**
   * The metamask-state of the various controllers, made available to the UI
   *
   * TODO: Use controller state instead of flattened state for better auditability
   *
   * @returns - BackgroundBridgeState
   */
  getState(): BackgroundBridgeState {
    const vault = Engine.context.KeyringController.state.vault;
    const {
      PreferencesController: { selectedAddress },
    } = Engine.datamodel.state;
    return {
      isInitialized: !!vault,
      isUnlocked: true,
      network: legacyNetworkId(),
      selectedAddress,
    };
  }
}

export default BackgroundBridge;
