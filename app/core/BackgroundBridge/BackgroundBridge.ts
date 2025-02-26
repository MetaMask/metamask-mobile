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
import { store } from '../../store';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import snapMethodMiddlewareBuilder from '../Snaps/SnapsMethodMiddleware';
import { SubjectType } from '@metamask/permission-controller';
///: END:ONLY_INCLUDE_IF

import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
import createFilterMiddleware from '@metamask/eth-json-rpc-filters';
import createSubscriptionManager from '@metamask/eth-json-rpc-filters/subscriptionManager';
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
import pump from 'pump';
// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
const { NOTIFICATION_NAMES } = AppConstants;
import DevLogger from '../SDKConnect/utils/DevLogger';
import { getPermittedAccounts } from '../Permissions';
import { NetworkStatus } from '@metamask/network-controller';
import { NETWORK_ID_LOADING } from '../redux/slices/inpageProvider';
import createUnsupportedMethodMiddleware from '../RPCMethods/createUnsupportedMethodMiddleware';
import createLegacyMethodMiddleware from '../RPCMethods/createLegacyMethodMiddleware';
import createTracingMiddleware from '../createTracingMiddleware';
import { Json, JsonRpcParams } from '@metamask/utils';
import type { Port } from './types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BackgroundBridgeState = {
  isInitialized: boolean;
  isUnlocked: boolean;
  network: string;
  selectedAddress: string;
};

type GetRpcMethodMiddleware = (params: {
  getProviderState: (domain: string) => Promise<{
    isUnlocked: boolean;
    chainId: string;
    networkVersion: string;
  }>;
  getSubjectInfo: () => {
    domain: string;
    origin: string;
    isMMSDK?: boolean;
    isWalletConnect?: boolean;
  };
}) => JsonRpcMiddleware<JsonRpcParams, Json>;

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
  #createRpcMiddleware: GetRpcMethodMiddleware;
  #port: Port;
  #lastChainIdSent: string;
  #networkVersionSent: string;
  #addressSent: string;
  #isMMSDK: boolean;
  #isWalletConnect: boolean;
  #disconnected: boolean;
  #deprecatedNetworkVersions: Record<string, string>;
  origin: string;
  domain: string;

  constructor({
    url,
    isMMSDK,
    isWalletConnect,
    getRpcMethodMiddleware,
    port,
  }: {
    url: string;
    isMMSDK?: boolean;
    isWalletConnect?: boolean;
    getRpcMethodMiddleware: GetRpcMethodMiddleware;
    port: Port;
  }) {
    super();
    const urlObject = new URL(url);
    const { hostname, protocol, origin } = urlObject;
    this.domain = hostname;
    this.origin = origin ?? `${protocol}${hostname}`;
    this.#isMMSDK = isMMSDK ?? false;
    this.#isWalletConnect = isWalletConnect ?? false;
    this.#disconnected = false;
    this.#deprecatedNetworkVersions = {};

    this.#createRpcMiddleware = getRpcMethodMiddleware;

    this.#port = port;

    const networkClientId = Engine.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      this.domain,
    );

    const networkClient = Engine.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    this.#lastChainIdSent = networkClient.configuration.chainId;

    this.#networkVersionSent = parseInt(
      networkClient.configuration.chainId,
      16,
    ).toString();

    // This will only be used for WalletConnect for now
    this.#addressSent =
      Engine.context.AccountsController.getSelectedAccount().address.toLowerCase();

    // connect features
    this.#setupProviderConnection();

    // Setup subscription events
    this.#subscribeToControllerStateChangeEvents();

    this.on('update', () => this.#onStateUpdate());

    // FIXME: Add comment as to why this is needed
    if (this.#isMMSDK) {
      const memState = this.getState();
      const selectedAddress = memState.selectedAddress;
      this.notifyChainChanged();
      this.notifySelectedAddressChanged(selectedAddress);
    }
  }

  onUnlock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.#disconnected) return;

    if (this.#isMMSDK) {
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
    if (this.#disconnected) return;

    if (this.#isMMSDK) {
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

  async #getProviderNetworkState(domain: string = METAMASK_DOMAIN) {
    const networkClientId = Engine.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      domain,
    );

    const networkClient = Engine.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    const { chainId } = networkClient.configuration;

    let networkVersion: string | null =
      this.#deprecatedNetworkVersions[networkClientId];
    if (!networkVersion) {
      const ethQuery = new EthQuery(networkClient.provider);
      networkVersion = await new Promise((resolve) => {
        ethQuery.sendAsync({ method: 'net_version' }, (error, result) => {
          if (error) {
            console.error(error);
            resolve(null);
          } else {
            this.#deprecatedNetworkVersions[networkClientId] = result as string;
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
      params: params ?? (await this.#getProviderNetworkState(this.domain)),
    });
  }

  async notifySelectedAddressChanged(selectedAddress: string) {
    try {
      let approvedAccounts = [];
      DevLogger.log(
        `notifySelectedAddressChanged: ${selectedAddress} origin=${
          this.origin
        } wc=${this.#isWalletConnect} url=${this.origin}`,
      );
      approvedAccounts = await getPermittedAccounts(this.origin);
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
          `notifySelectedAddressChanged url: ${this.origin} hostname: ${this.domain}: ${selectedAddress}`,
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
    const publicState = await this.#getProviderNetworkState(this.domain);

    // Check if update already sent
    if (
      this.#lastChainIdSent !== publicState.chainId ||
      (this.#networkVersionSent !== publicState.networkVersion &&
        publicState.networkVersion !== NETWORK_ID_LOADING)
    ) {
      this.#lastChainIdSent = publicState.chainId;
      this.#networkVersionSent = publicState.networkVersion;
      await this.notifyChainChanged(publicState);
    }
    // ONLY NEEDED FOR REMOTE CONNECTIONS FOR NOW, THE BROWSER HANDLES THIS NOTIFICATION BY ITSELF
    if (this.#isWalletConnect || this.#isMMSDK) {
      if (
        this.#addressSent?.toLowerCase() !==
        memState.selectedAddress?.toLowerCase()
      ) {
        this.#addressSent = memState.selectedAddress;
        this.notifySelectedAddressChanged(memState.selectedAddress);
      }
    }
  }

  isUnlocked() {
    return Engine.context.KeyringController.isUnlocked();
  }

  async getProviderState(domain: string) {
    return {
      isUnlocked: this.isUnlocked(),
      ...(await this.#getProviderNetworkState(domain)),
    };
  }

  #sendStateUpdate = () => {
    this.emit('update');
  };

  onMessage = (msg: { name: string; data: unknown }) => {
    this.#port.emit('message', { name: msg.name, data: msg.data });
  };

  onDisconnect = () => {
    this.#disconnected = true;
    Engine.controllerMessenger.unsubscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.#sendStateUpdate,
    );
    Engine.controllerMessenger.unsubscribe(
      'PreferencesController:stateChange',
      this.#sendStateUpdate,
    );

    this.#port.emit('disconnect', { name: this.#port.name, data: null });
  };

  /**
   * A method for serving our ethereum provider over a given stream.
   */
  #setupProviderConnection() {
    const multiplexStreamName = this.#isWalletConnect
      ? 'walletconnect-provider'
      : 'metamask-provider';

    // Setup multiplexing
    const portStream = new MobilePortStream(this.#port, this.origin);
    const mux = setupMultiplex(portStream);
    const outStream = mux.createStream(multiplexStreamName);
    this.#jsonRpcEngine = this.setupProviderEngine();

    // setup connection
    const providerStream = createEngineStream({ engine: this.#jsonRpcEngine });

    pump(outStream, providerStream, outStream, (err) => {
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
        (state) => state.subjects[this.origin],
      );
    } catch (err) {
      DevLogger.log(`Error in BackgroundBridge: ${err}`);
    }
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   **/
  setupProviderEngine() {
    // setup json rpc engine stack
    const baseJsonRpcEngine = new JsonRpcEngine();

    // If the domain is not in the selectedNetworkController's `domains` state
    // when the provider engine is created, the selectedNetworkController will
    // fetch the globally selected networkClient from the networkController and wrap
    // it in a proxy which can be switched to use its own state if/when the domain
    // is added to the `domains` state
    const proxyClient =
      Engine.context.SelectedNetworkController.getProviderAndBlockTracker(
        this.domain,
      );

    // create filter polyfill middleware
    const filterMiddleware = createFilterMiddleware(proxyClient);

    // create subscription polyfill middleware
    const subscriptionManager = createSubscriptionManager(proxyClient);
    subscriptionManager.events.on('notification', (message: unknown) =>
      baseJsonRpcEngine.emit('notification', message),
    );

    // metadata
    baseJsonRpcEngine.push(createOriginMiddleware({ origin: this.origin }));
    baseJsonRpcEngine.push(
      createSelectedNetworkMiddleware(
        // @ts-expect-error FIXME: Type expects a SelectedNetworkControllerMessenger, but it's using controller messenger from Engine instead
        Engine.controllerMessenger,
      ),
    );
    baseJsonRpcEngine.push(createLoggerMiddleware({ origin: this.origin }));
    // filter and subscription polyfills
    baseJsonRpcEngine.push(filterMiddleware);
    baseJsonRpcEngine.push(subscriptionManager.middleware);

    // Handle unsupported RPC Methods
    baseJsonRpcEngine.push(createUnsupportedMethodMiddleware());

    // Legacy RPC methods that need to be implemented ahead of the permission middleware
    baseJsonRpcEngine.push(
      createLegacyMethodMiddleware({
        getAccounts: async () => await getPermittedAccounts(this.origin),
      }),
    );

    // Sentry tracing middleware
    baseJsonRpcEngine.push(createTracingMiddleware());

    // Append PermissionController middleware
    baseJsonRpcEngine.push(
      Engine.context.PermissionController.createPermissionMiddleware({
        origin: this.origin,
      }),
    );

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    // Snaps middleware
    baseJsonRpcEngine.push(
      snapMethodMiddlewareBuilder(
        Engine.context,
        Engine.controllerMessenger,
        this.origin,
        // We assume that origins connecting through the BackgroundBridge are websites
        SubjectType.Website,
      ),
    );
    ///: END:ONLY_INCLUDE_IF

    // user-facing RPC methods
    baseJsonRpcEngine.push(
      this.#createRpcMiddleware({
        getProviderState: this.getProviderState.bind(this),
        getSubjectInfo: () => ({
          origin: this.origin,
          domain: this.domain,
          isMMSDK: this.#isMMSDK,
          isWalletConnect: this.#isWalletConnect,
        }),
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
