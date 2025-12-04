/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import {
  createSelectedNetworkMiddleware,
  METAMASK_DOMAIN,
} from '@metamask/selected-network-controller';
import EthQuery from '@metamask/eth-query';
import {
  getCallsStatus,
  getCapabilities,
  processSendCalls,
} from '@metamask/eip-5792-middleware';
import { JsonRpcEngine } from '@metamask/json-rpc-engine';
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
import { rpcErrors } from '@metamask/rpc-errors';
import snapMethodMiddlewareBuilder from '../Snaps/SnapsMethodMiddleware';
///: END:ONLY_INCLUDE_IF
import {
  PermissionDoesNotExistError,
  SubjectType,
} from '@metamask/permission-controller';

import {
  multichainMethodCallValidatorMiddleware,
  MultichainSubscriptionManager,
  MultichainMiddlewareManager,
  walletCreateSession,
  walletGetSession,
  walletInvokeMethod,
  walletRevokeSession,
  MultichainApiNotifications,
} from '@metamask/multichain-api-middleware';

import { createEngineStream } from '@metamask/json-rpc-middleware-stream';
const createFilterMiddleware = require('@metamask/eth-json-rpc-filters');
const createSubscriptionManager = require('@metamask/eth-json-rpc-filters/subscriptionManager');
import { providerAsMiddleware } from '@metamask/eth-json-rpc-middleware';
const pump = require('pump');
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;
const { NOTIFICATION_NAMES } = AppConstants;
import DevLogger from '../SDKConnect/utils/DevLogger';
import {
  getPermittedAccounts,
  sortMultichainAccountsByLastSelected,
} from '../Permissions';
import { NetworkStatus } from '@metamask/network-controller';
import { NETWORK_ID_LOADING } from '../redux/slices/inpageProvider';
import createUnsupportedMethodMiddleware from '../RPCMethods/createUnsupportedMethodMiddleware';
import createTracingMiddleware, {
  MESSAGE_TYPE,
} from '../createTracingMiddleware';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getPermittedAccountsForScopes,
  getSessionScopes,
  KnownSessionProperties,
} from '@metamask/chain-agnostic-permission';
import { ALLOWED_BRIDGE_CHAIN_IDS } from '@metamask/bridge-controller';
import {
  makeMethodMiddlewareMaker,
  UNSUPPORTED_RPC_METHODS,
} from '../RPCMethods/utils';
import {
  getChangedAuthorization,
  getRemovedAuthorization,
} from '../../util/permissions';
import { createEip5792Middleware } from '../RPCMethods/createEip5792Middleware';
import { createOriginThrottlingMiddleware } from '../RPCMethods/OriginThrottlingMiddleware';
import { getAuthorizedScopes } from '../../selectors/permissions';
import { SolAccountType, SolScope } from '@metamask/keyring-api';
import { parseCaipAccountId } from '@metamask/utils';
import { toFormattedAddress, areAddressesEqual } from '../../util/address';
import { isSameOrigin } from '../../util/url';
import PPOMUtil from '../../lib/ppom/ppom-util';
import { isRelaySupported } from '../../util/transactions/transaction-relay';
import { selectSmartTransactionsEnabled } from '../../selectors/smartTransactionsController';
import { AccountTreeController } from '@metamask/account-tree-controller';
import { createTrustSignalsMiddleware } from '../RPCMethods/TrustSignalsMiddleware';

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
  constructor({
    webview,
    url,
    getRpcMethodMiddleware,
    isMainFrame,
    isRemoteConn,
    sendMessage,
    isWalletConnect,
    wcRequestActions,
    getApprovedHosts,
    remoteConnHost,
    isMMSDK,
    sdkVersion = 'v1',
    channelId,
  }) {
    super();
    this.url = url;
    this.origin = new URL(url).origin;
    // TODO - When WalletConnect and MMSDK uses the Permission System, URL does not apply in all conditions anymore since hosts may not originate from web. This will need to change!
    this.remoteConnHost = remoteConnHost;
    this.isMainFrame = isMainFrame;
    this.isWalletConnect = isWalletConnect;
    this.isMMSDK = isMMSDK;
    this.sdkVersion = sdkVersion;
    this.isRemoteConn = isRemoteConn;
    this._webviewRef = webview && webview.current;
    this.disconnected = false;
    this.getApprovedHosts = getApprovedHosts;
    this.channelId = channelId;
    this.deprecatedNetworkVersions = {};
    this.createMiddleware = getRpcMethodMiddleware;

    this.port = isRemoteConn
      ? new RemotePort(sendMessage)
      : this.isWalletConnect
        ? new WalletConnectPort(wcRequestActions)
        : new Port(this._webviewRef, isMainFrame);

    this.engine = null;
    this.multichainEngine = null;
    this.multichainSubscriptionManager = null;
    this.multichainMiddlewareManager = null;

    this.lastSelectedSolanaAccountAddress = null;

    const networkClientId = Engine.controllerMessenger.call(
      'SelectedNetworkController:getNetworkClientIdForDomain',
      this.origin,
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
    this.addressSent = toFormattedAddress(
      Engine.context.AccountsController.getSelectedAccount().address,
    );

    const portStream = new MobilePortStream(this.port, url);
    // setup multiplexing
    const mux = setupMultiplex(portStream);
    // connect features
    this.setupProviderConnectionEip1193(
      mux.createStream(
        isWalletConnect ? 'walletconnect-provider' : 'metamask-provider',
      ),
    );

    Engine.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'AccountsController:selectedAccountChange',
      this.sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'PreferencesController:stateChange',
      this.sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'SelectedNetworkController:stateChange',
      this.sendStateUpdate,
    );

    Engine.controllerMessenger.subscribe(
      'KeyringController:lock',
      this.onLock.bind(this),
    );
    Engine.controllerMessenger.subscribe(
      'KeyringController:unlock',
      this.onUnlock.bind(this),
    );

    // Enable multichain functionality for all connections except for WalletConnect and MMSDK v1.
    if (!(this.isMMSDK && this.sdkVersion === 'v1') && !this.isWalletConnect) {
      this.multichainSubscriptionManager = new MultichainSubscriptionManager({
        getNetworkClientById:
          Engine.context.NetworkController.getNetworkClientById.bind(
            Engine.context.NetworkController,
          ),
        findNetworkClientIdByChainId:
          Engine.context.NetworkController.findNetworkClientIdByChainId.bind(
            Engine.context.NetworkController,
          ),
      });
      this.multichainMiddlewareManager = new MultichainMiddlewareManager();

      this.setupProviderConnectionCaip(
        mux.createStream('metamask-multichain-provider'),
      );

      this.setupCaipEventSubscriptions();
    }

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

    this.on('update', () => this.onStateUpdate());
    // Ensures the inpage provider receives a message indiciating background liveliness
    // so that messages sent before BackgroundBridge's EIP-1193 JSON-RPC pipeline was
    // fully initialized can be retried
    if (!this.isRemoteConn && !this.isWalletConnect) {
      this.notifyChainChanged();
    }

    if (this.isRemoteConn) {
      const memState = this.getState();
      const selectedAddress = memState.selectedAddress;
      this.notifyChainChanged();
      this.notifySelectedAddressChanged(selectedAddress);
    }
  }

  get channelIdOrOrigin() {
    return this.isWalletConnect || this.isMMSDK ? this.channelId : this.origin;
  }

  onUnlock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.disconnected) return;

    if (this.isRemoteConn) {
      // Not sending the lock event in case of a remote connection as this is handled correctly already by the SDK
      // In case we want to send, use new structure

      return;
    }

    this.sendNotificationEip1193({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: true,
    });
  }

  onLock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.disconnected) return;

    if (this.isRemoteConn) {
      // Not sending the lock event in case of a remote connection as this is handled correctly already by the SDK
      // In case we want to send, use new structure

      return;
    }

    this.sendNotificationEip1193({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: false,
    });
  }

  async getProviderNetworkState(
    origin = METAMASK_DOMAIN,
    requestNetworkClientId,
  ) {
    const networkClientId =
      requestNetworkClientId ??
      Engine.controllerMessenger.call(
        'SelectedNetworkController:getNetworkClientIdForDomain',
        origin,
      );

    const networkClient = Engine.controllerMessenger.call(
      'NetworkController:getNetworkClientById',
      networkClientId,
    );

    const { chainId } = networkClient.configuration;

    let networkVersion = this.deprecatedNetworkVersions[networkClientId];
    if (!networkVersion) {
      const ethQuery = new EthQuery(networkClient.provider);
      networkVersion = await new Promise((resolve) => {
        ethQuery.sendAsync({ method: 'net_version' }, (error, result) => {
          if (error) {
            console.error(error);
            resolve(null);
          } else {
            resolve(result);
          }
        });
      });
      this.deprecatedNetworkVersions[networkClientId] = networkVersion;
    }

    return {
      chainId,
      networkVersion: networkVersion ?? 'loading',
    };
  }

  async notifyChainChanged(params) {
    DevLogger.log(`notifyChainChanged: `, params);
    this.sendNotificationEip1193({
      method: NOTIFICATION_NAMES.chainChanged,
      params:
        params ?? (await this.getProviderNetworkState(this.channelIdOrOrigin)),
    });
  }

  /**
   * Gets supported methods for a given scope using the Multichain Router.
   *
   * @param {string} scope - The scope to get supported methods for.
   * @returns {string[]} Array of supported method names.
   */
  getNonEvmSupportedMethods(scope) {
    return Engine.controllerMessenger.call(
      'MultichainRouter:getSupportedMethods',
      scope,
    );
  }

  async notifySelectedAddressChanged(selectedAddress) {
    try {
      let approvedAccounts = [];
      DevLogger.log(
        `notifySelectedAddressChanged: ${selectedAddress} channelId=${this.channelId} wc=${this.isWalletConnect} url=${this.url}`,
      );
      approvedAccounts = getPermittedAccounts(this.channelIdOrOrigin);

      // Check if selectedAddress is approved
      const found = approvedAccounts.some((addr) =>
        areAddressesEqual(addr, selectedAddress),
      );

      if (found) {
        // Set selectedAddress as first value in array
        approvedAccounts = [
          selectedAddress,
          ...approvedAccounts.filter(
            (addr) => !areAddressesEqual(addr, selectedAddress),
          ),
        ];

        DevLogger.log(
          `notifySelectedAddressChanged: ${selectedAddress} channelId=${this.channelId} wc=${this.isWalletConnect} url=${this.url}`,
          { approvedAccounts },
        );
        this.sendNotificationEip1193({
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

  async onStateUpdate(memState) {
    if (!memState) {
      memState = this.getState();
    }
    const publicState = await this.getProviderNetworkState(
      this.channelIdOrOrigin,
    );
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
      const accountControllerSelectedAddress = toFormattedAddress(
        Engine.context.AccountsController.getSelectedAccount().address,
      );
      if (
        this.addressSent != null &&
        accountControllerSelectedAddress != null &&
        !areAddressesEqual(this.addressSent, accountControllerSelectedAddress)
      ) {
        this.addressSent = accountControllerSelectedAddress;
        this.notifySelectedAddressChanged(accountControllerSelectedAddress);
      }
    }
  }

  isUnlocked() {
    return Engine.context.KeyringController.isUnlocked();
  }

  async getProviderState(origin, networkClientId) {
    return {
      isUnlocked: this.isUnlocked(),
      ...(await this.getProviderNetworkState(origin, networkClientId)),
    };
  }

  sendStateUpdate = () => {
    this.emit('update');
  };

  onMessage = (msg) => {
    if (
      !this.isWalletConnect &&
      !this.isMMSDK &&
      !isSameOrigin(msg.origin, this.origin)
    ) {
      console.warn(
        '[BackgroundBridge]: message blocked from unknown origin. Expects',
        this.origin,
        'but received',
        msg.origin,
      );
      return;
    }
    this.port.emit('message', { name: msg.name, data: msg.data });
  };

  onDisconnect = () => {
    const {
      controllerMessenger,
      context: { AccountsController, PermissionController },
    } = Engine;
    this.disconnected = true;
    controllerMessenger.tryUnsubscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.sendStateUpdate,
    );
    controllerMessenger.tryUnsubscribe(
      'PreferencesController:stateChange',
      this.sendStateUpdate,
    );
    controllerMessenger.tryUnsubscribe(
      'AccountsController:selectedAccountChange',
      this.sendStateUpdate,
    );

    // Enable multichain functionality for all connections except for WalletConnect and MMSDK v1.
    if (!(this.isMMSDK && this.sdkVersion === 'v1') && !this.isWalletConnect) {
      controllerMessenger.unsubscribe(
        `${PermissionController.name}:stateChange`,
        this.handleCaipSessionScopeChanges,
      );
      controllerMessenger.unsubscribe(
        `${PermissionController.name}:stateChange`,
        this.handleSolanaAccountChangedFromScopeChanges,
      );
      controllerMessenger.unsubscribe(
        `${AccountsController.name}:selectedAccountChange`,
        this.handleSolanaAccountChangedFromSelectedAccountChanges,
      );
      controllerMessenger.unsubscribe(
        `${AccountTreeController.name}:selectedAccountGroupChange`,
        this.handleSolanaAccountChangedFromSelectedAccountGroupChanges,
      );
    }

    this.port.emit('disconnect', { name: this.port.name, data: null });
  };

  /**
   * A method for serving our ethereum provider over a given stream.
   * @param {*} outStream - The stream to provide over.
   */
  setupProviderConnectionEip1193(outStream) {
    this.engine = this.setupProviderEngineEip1193();

    // setup connection
    const providerStream = createEngineStream({ engine: this.engine });

    pump(outStream, providerStream, outStream, (err) => {
      // handle any middleware cleanup
      this.engine.destroy();
      if (err) Logger.log('Error with provider stream conn', err);
    });
  }

  /**
   * A method for serving our CAIP provider over a given stream.
   *
   * @param {*} outStream - The stream to provide over.
   */
  setupProviderConnectionCaip(outStream) {
    this.multichainEngine = this.setupProviderEngineCaip();

    // setup connection
    const providerStream = createEngineStream({
      engine: this.multichainEngine,
    });

    // This is not delayed like it is in Extension because Mobile does not have to
    // support externally_connectable but instead only the faked window.postMessage
    // transport. Unlike externally_connectable's chrome.runtime.connect() API, the
    // window.postMessage API allows the inpage provider to setup listeners for
    // messages before attempting to establish the connection meaning that it will
    // have listeners ready for this solana accountChanged event below.
    this.notifySolanaAccountChangedForCurrentAccount();

    pump(outStream, providerStream, outStream, (err) => {
      // handle any middleware cleanup
      this.multichainEngine.destroy();
      if (err) Logger.log('Error with provider stream conn', err);
    });
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   **/
  setupProviderEngineEip1193() {
    const origin = this.channelIdOrOrigin;
    // setup json rpc engine stack
    const engine = new JsonRpcEngine();

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
    subscriptionManager.events.on('notification', (message) =>
      engine.emit('notification', message),
    );

    // metadata
    engine.push(createOriginMiddleware({ origin }));
    engine.push(createSelectedNetworkMiddleware(Engine.controllerMessenger));
    engine.push(createLoggerMiddleware({ origin }));
    // filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);

    // Handle unsupported RPC Methods
    engine.push(createUnsupportedMethodMiddleware());

    // Sentry tracing middleware
    engine.push(createTracingMiddleware());

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    // These Snaps RPC methods are disabled in WalletConnect and SDK for now
    if (this.isMMSDK || this.isWalletConnect) {
      engine.push((req, _res, next, end) => {
        if (['wallet_snap'].includes(req.method)) {
          return end(
            rpcErrors.methodNotFound({ data: { method: req.method } }),
          );
        }
        return next();
      });
    }
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    // The Snaps middleware is disabled in WalletConnect and SDK for now.
    if (!this.isMMSDK && !this.isWalletConnect) {
      engine.push(
        snapMethodMiddlewareBuilder(
          Engine.context,
          Engine.controllerMessenger,
          this.url,
          // We assume that origins connecting through the BackgroundBridge are websites
          SubjectType.Website,
        ),
      );
    }
    ///: END:ONLY_INCLUDE_IF

    // Origin throttling middleware for spam filtering
    engine.push(createOriginThrottlingMiddleware(this.navigation));

    engine.push(
      createTrustSignalsMiddleware({
        phishingController: Engine.context.PhishingController,
        networkController: Engine.context.NetworkController,
      }),
    );

    // user-facing RPC methods
    engine.push(
      this.createMiddleware({
        hostname: this.origin,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

    // Middleware to handle wallet_xxx requests
    engine.push(this.createEip5792Middleware());

    engine.push(createSanitizationMiddleware());

    // forward to metamask primary provider
    engine.push(providerAsMiddleware(proxyClient.provider));
    return engine;
  }

  /**
   * A method for creating a CAIP Multichain provider that is safely restricted for the requesting subject.
   */
  setupProviderEngineCaip() {
    const origin = this.channelIdOrOrigin;

    const { NetworkController, AccountsController, PermissionController } =
      Engine.context;

    const engine = new JsonRpcEngine();

    // Append origin to each request
    engine.push(createOriginMiddleware({ origin }));

    engine.push(createLoggerMiddleware({ origin }));

    engine.push((req, _res, next, end) => {
      if (
        ![
          MESSAGE_TYPE.WALLET_CREATE_SESSION,
          MESSAGE_TYPE.WALLET_INVOKE_METHOD,
          MESSAGE_TYPE.WALLET_GET_SESSION,
          MESSAGE_TYPE.WALLET_REVOKE_SESSION,
        ].includes(req.method)
      ) {
        return end(rpcErrors.methodNotFound({ data: { method: req.method } }));
      }
      return next();
    });

    engine.push(multichainMethodCallValidatorMiddleware);

    const middlewareMaker = makeMethodMiddlewareMaker([
      walletRevokeSession,
      walletGetSession,
      walletInvokeMethod,
      walletCreateSession,
    ]);

    engine.push(
      middlewareMaker({
        findNetworkClientIdByChainId:
          NetworkController.findNetworkClientIdByChainId.bind(
            NetworkController,
          ),
        listAccounts: AccountsController.listAccounts.bind(AccountsController),
        requestPermissionsForOrigin: (requestedPermissions, options = {}) =>
          PermissionController.requestPermissions(
            { origin },
            requestedPermissions,
            options,
          ),
        getCaveatForOrigin: PermissionController.getCaveat.bind(
          PermissionController,
          origin,
        ),
        updateCaveat: PermissionController.updateCaveat.bind(
          PermissionController,
          origin,
        ),
        getSelectedNetworkClientId: () =>
          NetworkController.state.selectedNetworkClientId,
        revokePermissionForOrigin: PermissionController.revokePermission.bind(
          PermissionController,
          origin,
        ),

        getNonEvmSupportedMethods: this.getNonEvmSupportedMethods.bind(this),
        isNonEvmScopeSupported: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger,
          'MultichainRouter:isSupportedScope',
        ),
        handleNonEvmRequestForOrigin: (params) =>
          Engine.controllerMessenger.call('MultichainRouter:handleRequest', {
            ...params,
            origin: this.origin,
          }),
        getNonEvmAccountAddresses: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger,
          'MultichainRouter:getSupportedAccounts',
        ),
        trackSessionCreatedEvent: () => undefined,
      }),
    );

    engine.push(
      createUnsupportedMethodMiddleware(
        new Set([
          ...UNSUPPORTED_RPC_METHODS,
          'eth_requestAccounts',
          'eth_accounts',
        ]),
      ),
    );

    try {
      const caip25Caveat = PermissionController.getCaveat(
        origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );

      // add new notification subscriptions for changed authorizations
      const sessionScopes = getSessionScopes(caip25Caveat.value, {
        getNonEvmSupportedMethods: this.getNonEvmSupportedMethods.bind(this),
      });

      // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
      // then get the subscriptionManager going for that scope
      Object.entries(sessionScopes).forEach(([scope, scopeObject]) => {
        if (
          scopeObject.notifications.includes('eth_subscription') &&
          scopeObject.methods.includes('eth_subscribe')
        ) {
          this.addMultichainApiEthSubscriptionMiddleware({
            scope,
            origin,
          });
        }
      });
    } catch (err) {
      // noop
    }

    this.multichainSubscriptionManager.on(
      'notification',
      (targetOrigin, _, message) => {
        if (origin === targetOrigin) {
          engine.emit('notification', message);
        }
      },
    );

    engine.push(
      this.multichainMiddlewareManager.generateMultichainMiddlewareForOriginAndTabId(
        origin,
      ),
    );

    // user-facing RPC methods
    engine.push(
      this.createMiddleware({
        hostname: this.origin,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

    engine.push(this.createEip5792Middleware());

    engine.push(async (req, res, _next, end) => {
      const { provider } = NetworkController.getNetworkClientById(
        req.networkClientId,
      );
      res.result = await provider.request(req);
      return end();
    });

    return engine;
  }

  /**
   * Setup EIP-5792 middleware handlers
   */
  createEip5792Middleware() {
    return createEip5792Middleware({
      getAccounts: () => {
        const { AccountsController } = Engine.context;
        const addresses = AccountsController.listAccounts().map(
          (acc) => acc.address,
        );
        return Promise.resolve(addresses);
      },
      // EIP-5792
      processSendCalls: processSendCalls.bind(
        null,
        {
          addTransaction:
            Engine.context.TransactionController.addTransaction.bind(
              Engine.context.TransactionController,
            ),
          addTransactionBatch:
            Engine.context.TransactionController.addTransactionBatch.bind(
              Engine.context.TransactionController,
            ),
          getDismissSmartAccountSuggestionEnabled: () =>
            Engine.context.PreferencesController.state
              .dismissSmartAccountSuggestionEnabled,
          isAtomicBatchSupported:
            Engine.context.TransactionController.isAtomicBatchSupported.bind(
              Engine.context.TransactionController,
            ),
          validateSecurity: (securityAlertId, request, chainId) =>
            PPOMUtil.validateRequest(request, {
              transactionMeta: { chainId },
              securityAlertId,
            }),
          isAuxiliaryFundsSupported: (chainId) =>
            ALLOWED_BRIDGE_CHAIN_IDS.includes(chainId),
        },
        Engine.controllerMessenger,
      ),
      getCallsStatus: getCallsStatus.bind(null, Engine.controllerMessenger),
      getCapabilities: getCapabilities.bind(
        null,
        {
          getDismissSmartAccountSuggestionEnabled: () =>
            Engine.context.PreferencesController.state
              .dismissSmartAccountSuggestionEnabled,
          getIsSmartTransaction: (chainId) =>
            selectSmartTransactionsEnabled(store.getState(), chainId),
          isAtomicBatchSupported:
            Engine.context.TransactionController.isAtomicBatchSupported.bind(
              Engine.context.TransactionController,
            ),
          isRelaySupported,
          getSendBundleSupportedChains: async (chainIds) => {
            const isAtomicBatchSupportedResult =
              await Engine.context.TransactionController.isAtomicBatchSupported(
                {
                  address:
                    Engine.context.AccountsController.getSelectedAccount()
                      .address,
                  chainIds,
                },
              );
            return isAtomicBatchSupportedResult.reduce(
              (acc, { chainId, isSupported }) => ({
                ...acc,
                [chainId]: isSupported,
              }),
              {},
            );
          },
          isAuxiliaryFundsSupported: (chainId) =>
            ALLOWED_BRIDGE_CHAIN_IDS.includes(chainId),
        },
        Engine.controllerMessenger,
      ),
    });
  }

  /**
   * This handles CAIP-25 authorization changes every time relevant permission state changes, for any reason.
   */
  setupCaipEventSubscriptions() {
    const {
      controllerMessenger,
      context: { AccountsController, PermissionController },
    } = Engine;

    // this throws if there is no solana account... perhaps we should handle this better at the controller level
    try {
      this.lastSelectedSolanaAccountAddress =
        AccountsController.getSelectedMultichainAccount(
          SolScope.Mainnet,
        )?.address;
    } catch {
      // noop
    }

    // wallet_sessionChanged and eth_subscription setup/teardown
    controllerMessenger.subscribe(
      `${PermissionController.name}:stateChange`,
      this.handleCaipSessionScopeChanges,
      getAuthorizedScopes(this.channelIdOrOrigin),
    );

    // wallet_notify for solana accountChanged when permission changes
    controllerMessenger.subscribe(
      `${PermissionController.name}:stateChange`,
      this.handleSolanaAccountChangedFromScopeChanges,
      getAuthorizedScopes(this.channelIdOrOrigin),
    );

    // wallet_notify for solana accountChanged when selected account changes
    controllerMessenger.subscribe(
      `${AccountsController.name}:selectedAccountChange`,
      this.handleSolanaAccountChangedFromSelectedAccountChanges,
    );

    controllerMessenger.subscribe(
      `${AccountTreeController.name}:selectedAccountGroupChange`,
      this.handleSolanaAccountChangedFromSelectedAccountGroupChanges,
    );
  }

  /**
   * Handler for CAIP permission state changes.
   *
   * @param currentValue - The new CAIP-25 authorization.
   * @param previousValue - The previous CAIP-25 authorization.
   * @returns function that handlers session scope changes.
   */
  handleCaipSessionScopeChanges = async (currentValue, previousValue) => {
    const origin = this.channelIdOrOrigin;
    const changedAuthorization = getChangedAuthorization(
      currentValue,
      previousValue,
    );

    const removedAuthorization = getRemovedAuthorization(
      currentValue,
      previousValue,
    );

    // remove any existing notification subscriptions for removed authorization
    const removedSessionScopes = getSessionScopes(removedAuthorization, {
      getNonEvmSupportedMethods: this.getNonEvmSupportedMethods.bind(this),
    });
    // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
    // then remove middleware and unsubscribe
    Object.entries(removedSessionScopes).forEach(([scope, scopeObject]) => {
      if (
        scopeObject.notifications.includes('eth_subscription') &&
        scopeObject.methods.includes('eth_subscribe')
      ) {
        this.removeMultichainApiEthSubscriptionMiddleware({
          scope,
          origin,
        });
      }
    });

    // add new notification subscriptions for added/changed authorization
    const changedSessionScopes = getSessionScopes(changedAuthorization, {
      getNonEvmSupportedMethods: this.getNonEvmSupportedMethods.bind(this),
    });

    // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
    // then get the subscriptionManager going for that scope
    Object.entries(changedSessionScopes).forEach(([scope, scopeObject]) => {
      if (
        scopeObject.notifications.includes('eth_subscription') &&
        scopeObject.methods.includes('eth_subscribe')
      ) {
        this.addMultichainApiEthSubscriptionMiddleware({
          scope,
          origin,
        });
      } else {
        this.removeMultichainApiEthSubscriptionMiddleware({
          scope,
          origin,
        });
      }
    });
    this.notifyCaipAuthorizationChange(changedAuthorization);
  };

  handleSolanaAccountChangedFromScopeChanges = (
    currentValue,
    previousValue,
  ) => {
    const previousSolanaAccountChangedNotificationsEnabled = Boolean(
      previousValue?.sessionProperties?.[
        KnownSessionProperties.SolanaAccountChangedNotifications
      ],
    );
    const currentSolanaAccountChangedNotificationsEnabled = Boolean(
      currentValue?.sessionProperties?.[
        KnownSessionProperties.SolanaAccountChangedNotifications
      ],
    );

    if (
      !previousSolanaAccountChangedNotificationsEnabled &&
      !currentSolanaAccountChangedNotificationsEnabled
    ) {
      return;
    }

    const previousSolanaCaipAccountIds = previousValue
      ? getPermittedAccountsForScopes(previousValue, [
          SolScope.Mainnet,
          SolScope.Devnet,
          SolScope.Testnet,
        ])
      : [];

    const [previousSelectedSolanaAccountId] =
      sortMultichainAccountsByLastSelected(previousSolanaCaipAccountIds);
    const previousSelectedSolanaAccountAddress = previousSelectedSolanaAccountId
      ? parseCaipAccountId(previousSelectedSolanaAccountId).address
      : '';

    const currentSolanaCaipAccountIds = currentValue
      ? getPermittedAccountsForScopes(currentValue, [
          SolScope.Mainnet,
          SolScope.Devnet,
          SolScope.Testnet,
        ])
      : [];
    const [currentSelectedSolanaAccountId] =
      sortMultichainAccountsByLastSelected(currentSolanaCaipAccountIds);
    const currentSelectedSolanaAccountAddress = currentSelectedSolanaAccountId
      ? parseCaipAccountId(currentSelectedSolanaAccountId).address
      : '';

    if (
      previousSelectedSolanaAccountAddress !==
      currentSelectedSolanaAccountAddress
    ) {
      this._notifySolanaAccountChange(
        currentSelectedSolanaAccountAddress
          ? [currentSelectedSolanaAccountAddress]
          : [],
      );
    }
  };

  handleSolanaAccountChangedFromSelectedAccountChanges = (account) => {
    if (
      account.type === SolAccountType.DataAccount &&
      !areAddressesEqual(account.address, this.lastSelectedSolanaAccountAddress)
    ) {
      this.lastSelectedSolanaAccountAddress = account.address;

      let caip25Caveat;
      try {
        caip25Caveat = Engine.context.PermissionController.getCaveat(
          this.channelIdOrOrigin,
          Caip25EndowmentPermissionName,
          Caip25CaveatType,
        );
      } catch {
        // noop
      }
      if (!caip25Caveat) {
        return;
      }

      const shouldNotifySolanaAccountChanged =
        caip25Caveat.value.sessionProperties?.[
          KnownSessionProperties.SolanaAccountChangedNotifications
        ];
      if (!shouldNotifySolanaAccountChanged) {
        return;
      }

      const solanaAccounts = getPermittedAccountsForScopes(caip25Caveat.value, [
        SolScope.Mainnet,
        SolScope.Devnet,
        SolScope.Testnet,
      ]);

      const parsedSolanaAddresses = solanaAccounts.map((caipAccountId) => {
        const { address } = parseCaipAccountId(caipAccountId);
        return address;
      });

      if (parsedSolanaAddresses.includes(account.address)) {
        this._notifySolanaAccountChange([account.address]);
      }
    }
  };

  handleSolanaAccountChangedFromSelectedAccountGroupChanges = () => {
    const solanaAccount = this.getNonEvmAccountFromSelectedAccountGroup();
    if (solanaAccount) {
      this.handleSolanaAccountChangedFromSelectedAccountChanges(solanaAccount);
    }
  };

  getNonEvmAccountFromSelectedAccountGroup() {
    const controllerMessenger = Engine.controllerMessenger;

    const [solanaAccount] = controllerMessenger.call(
      `AccountTreeController:getAccountsFromSelectedAccountGroup`,
      { type: SolAccountType.DataAccount },
    );
    return solanaAccount;
  }

  sendNotificationEip1193(payload) {
    DevLogger.log(`BackgroundBridge::sendNotificationEip1193: `, payload);
    this.engine && this.engine.emit('notification', payload);
  }

  sendNotificationMultichain(payload) {
    DevLogger.log(`BackgroundBridge::sendNotificationMultichain: `, payload);
    this.multichainEngine &&
      this.multichainEngine.emit('notification', payload);
  }

  /**
   * The metamask-state of the various controllers, made available to the UI
   *
   * TODO: Use controller state instead of flattened state for better auditability
   *
   * @returns {Object} status
   */
  getState() {
    const vault = Engine.context.KeyringController.state.vault;
    const accountControllerSelectedAddress = toFormattedAddress(
      Engine.context.AccountsController.getSelectedAccount().address,
    );
    return {
      isInitialized: !!vault,
      isUnlocked: true,
      network: legacyNetworkId(),
      selectedAddress: accountControllerSelectedAddress,
    };
  }

  /**
   * If it does not already exist, creates and inserts middleware to handle eth
   * subscriptions for a particular evm scope on a specific Multichain API
   * JSON-RPC pipeline by origin.
   *
   * @param {object} options - The options object.
   * @param {string} options.scope - The evm scope to handle eth susbcriptions for.
   * @param {string} options.origin - The origin to handle eth subscriptions for.
   */
  addMultichainApiEthSubscriptionMiddleware({ scope, origin }) {
    const subscriptionManager = this.multichainSubscriptionManager.subscribe({
      scope,
      origin,
    });
    this.multichainMiddlewareManager.addMiddleware({
      scope,
      origin,
      middleware: subscriptionManager.middleware,
    });
  }

  /**
   * If it does exist, removes all middleware that were handling eth
   * subscriptions for a particular evm scope for all Multichain API
   * JSON-RPC pipelines for an origin.
   *
   * @param {object} options - The options object.
   * @param {string} options.scope - The evm scope to handle eth susbcriptions for.
   * @param {string} options.origin - The origin to handle eth subscriptions for.
   */
  removeMultichainApiEthSubscriptionMiddleware({ scope, origin }) {
    this.multichainMiddlewareManager.removeMiddlewareByScopeAndOrigin(
      scope,
      origin,
    );
    this.multichainSubscriptionManager.unsubscribeByScopeAndOrigin(
      scope,
      origin,
    );
  }

  /**
   * Causes the Multichain RPC engine to emit a sessionChanged notification event with the given payload.
   * @param {object} newAuthorization - The new CAIP-25 authorization.
   */
  notifyCaipAuthorizationChange(newAuthorization) {
    if (this.multichainEngine) {
      this.multichainEngine.emit('notification', {
        method: 'wallet_sessionChanged',
        params: {
          sessionScopes: getSessionScopes(newAuthorization, {
            getNonEvmSupportedMethods:
              this.getNonEvmSupportedMethods.bind(this),
          }),
        },
      });
    }
  }

  /**
   * For origins with a solana scope permitted, sends a wallet_notify -> metamask_accountChanged
   * event to fire for the solana scope with the currently selected solana account if any are
   * permitted or empty array otherwise.
   *
   * @param {string} origin - The origin to notify with the current solana account
   */
  notifySolanaAccountChangedForCurrentAccount() {
    let caip25Caveat;
    try {
      caip25Caveat = Engine.context.PermissionController.getCaveat(
        this.channelIdOrOrigin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );
    } catch (err) {
      if (err instanceof PermissionDoesNotExistError) {
        // suppress expected error in case that the origin
        // does not have the target permission yet
        return;
      }
      throw err;
    }
    if (!caip25Caveat) {
      return;
    }
    const solanaAccountsChangedNotifications =
      caip25Caveat.value.sessionProperties[
        KnownSessionProperties.SolanaAccountChangedNotifications
      ];

    const sessionScopes = getSessionScopes(caip25Caveat.value, {
      getNonEvmSupportedMethods: this.getNonEvmSupportedMethods.bind(this),
    });

    const solanaScope =
      sessionScopes[SolScope.Mainnet] ||
      sessionScopes[SolScope.Devnet] ||
      sessionScopes[SolScope.Testnet];

    if (solanaAccountsChangedNotifications && solanaScope) {
      const currentSolanaAccountFromSelectedAccountGroup =
        this.getNonEvmAccountFromSelectedAccountGroup();

      if (currentSolanaAccountFromSelectedAccountGroup) {
        this._notifySolanaAccountChange([
          currentSolanaAccountFromSelectedAccountGroup.address,
        ]);
        return;
      }

      const { accounts } = solanaScope;

      const [accountIdToEmit] = sortMultichainAccountsByLastSelected(accounts);

      if (accountIdToEmit) {
        const accountAddressToEmit =
          parseCaipAccountId(accountIdToEmit).address;
        this._notifySolanaAccountChange([accountAddressToEmit]);
      }
    }
  }

  _notifySolanaAccountChange(value) {
    this.sendNotificationMultichain({
      method: MultichainApiNotifications.walletNotify,
      params: {
        scope: SolScope.Mainnet,
        notification: {
          method: NOTIFICATION_NAMES.accountsChanged,
          params: value,
        },
      },
    });
  }
}

export default BackgroundBridge;
