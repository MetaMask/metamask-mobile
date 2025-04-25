/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import {
  createSelectedNetworkMiddleware,
  METAMASK_DOMAIN,
} from '@metamask/selected-network-controller';
import EthQuery from '@metamask/eth-query';
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
import {
  PermissionDoesNotExistError,
  SubjectType,
} from '@metamask/permission-controller';
///: END:ONLY_INCLUDE_IF

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
  captureKeyringTypesWithMissingIdentities,
  getPermittedAccounts,
} from '../Permissions';
import { NetworkStatus } from '@metamask/network-controller';
import { NETWORK_ID_LOADING } from '../redux/slices/inpageProvider';
import createUnsupportedMethodMiddleware from '../RPCMethods/createUnsupportedMethodMiddleware';
import createEthAccountsMethodMiddleware from '../RPCMethods/createEthAccountsMethodMiddleware';
import createTracingMiddleware, {
  MESSAGE_TYPE,
} from '../createTracingMiddleware';
import { createEip1193MethodMiddleware } from '../RPCMethods/createEip1193MethodMiddleware';
import {
  Caip25CaveatMutators,
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getEthAccounts,
  getSessionScopes,
} from '@metamask/chain-agnostic-permission';
import {
  makeMethodMiddlewareMaker,
  UNSUPPORTED_RPC_METHODS,
} from '../RPCMethods/utils';
import { ERC1155, ERC20, ERC721 } from '@metamask/controller-utils';
import { createMultichainMethodMiddleware } from '../RPCMethods/createMultichainMethodMiddleware';
import {
  diffMap,
  getChangedAuthorizations,
  getRemovedAuthorizations,
  getCaip25PermissionFromLegacyPermissions,
} from '../../util/permissions';
import {
  getAuthorizedScopesByOrigin,
  getPermittedAccountsByOrigin,
  getPermittedChainsByOrigin,
} from '../../selectors/permissions';
import { previousValueComparator } from '../../util/validators';
import { hexToBigInt, toCaipChainId } from '@metamask/utils';
import { TransactionController } from '@metamask/transaction-controller';

// Types of APIs
const API_TYPE = {
  EIP1193: 'eip-1193',
  CAIP_MULTICHAIN: 'caip-multichain',
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
    channelId,
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
    this.multichainSubscriptionManager = null;
    this.multichainMiddlewareManager = null;

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

    if (AppConstants.MULTICHAIN_API) {
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
    }

    // TODO: [ffmcgee] invoking this will probably now break unit test for this class. Address it.
    this.setupControllerEventSubscriptions();

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

  async getProviderNetworkState(origin = METAMASK_DOMAIN) {
    const networkClientId = Engine.controllerMessenger.call(
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
    this.sendNotification({
      method: NOTIFICATION_NAMES.chainChanged,
      params: params ?? (await this.getProviderNetworkState(this.hostname)),
    });
  }

  /**
   * Sets up BaseController V2 event subscriptions. Currently, this includes
   * the subscriptions necessary to notify permission subjects of account
   * changes.
   *
   * Some of the subscriptions in this method are Messenger selector
   * event subscriptions. See the relevant documentation for
   * `@metamask/base-controller` for more information.
   *
   * Note that account-related notifications emitted when the extension
   * becomes unlocked are handled in MetaMaskController._onUnlock.
   */
  setupControllerEventSubscriptions() {
    let lastSelectedAddress;

    const { controllerMessenger } = Engine;
    const {
      SelectedNetworkController,
      NetworkController,
      PreferencesController,
      AccountsController,
      PermissionController,
    } = Engine.context;

    controllerMessenger.subscribe(
      'PreferencesController:stateChange',
      previousValueComparator(async (prevState, currState) => {
        // const { currentLocale } = currState;
        this._restartSmartTransactionPoller();

        // TODO: [ffmcgee] invoke function to update current locale here..Do we have one already ?
        // await updateCurrentLocale(currentLocale);
        this._checkTokenListPolling(currState, prevState);
      }, PreferencesController.state),
    );

    controllerMessenger.subscribe(
      `${AccountsController.name}:selectedAccountChange`,
      async (account) => {
        if (account.address && account.address !== lastSelectedAddress) {
          lastSelectedAddress = account.address;
          await this._onAccountChange(account.address);
        }
      },
    );

    // This handles account changes every time relevant permission state
    // changes, for any reason.
    controllerMessenger.subscribe(
      `${PermissionController.name}:stateChange`,
      async (currentValue, previousValue) => {
        const changedAccounts = diffMap(currentValue, previousValue);

        for (const [origin, accounts] of changedAccounts.entries()) {
          this._notifyAccountsChange(origin, accounts);
        }
      },
      getPermittedAccountsByOrigin,
    );

    // This handles CAIP-25 authorization changes every time relevant permission state
    // changes, for any reason.
    if (AppConstants.MULTICHAIN_API) {
      // wallet_sessionChanged and eth_subscription setup/teardown
      controllerMessenger.subscribe(
        `${PermissionController.name}:stateChange`,
        async (currentValue, previousValue) => {
          const changedAuthorizations = getChangedAuthorizations(
            currentValue,
            previousValue,
          );

          const removedAuthorizations = getRemovedAuthorizations(
            currentValue,
            previousValue,
          );

          // remove any existing notification subscriptions for removed authorizations
          for (const [
            origin,
            authorization,
          ] of removedAuthorizations.entries()) {
            const sessionScopes = getSessionScopes(authorization, {
              // TODO: [ffmcgee] DRY this one
              getNonEvmSupportedMethods: (scope) =>
                Engine.controllerMessenger.call(
                  'MultichainRouter:getSupportedMethods',
                  scope,
                ),
            });
            // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
            // then remove middleware and unsubscribe
            Object.entries(sessionScopes).forEach(([scope, scopeObject]) => {
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
          }

          // add new notification subscriptions for added/changed authorizations
          for (const [
            origin,
            authorization,
          ] of changedAuthorizations.entries()) {
            const sessionScopes = getSessionScopes(authorization, {
              // TODO: [ffmcgee] DRY this one
              getNonEvmSupportedMethods: (scope) =>
                controllerMessenger.call(
                  'MultichainRouter:getSupportedMethods',
                  scope,
                ),
            });

            // if the eth_subscription notification is in the scope and eth_subscribe is in the methods
            // then get the subscriptionManager going for that scope
            Object.entries(sessionScopes).forEach(([scope, scopeObject]) => {
              if (
                scopeObject.notifications.includes('eth_subscription') &&
                scopeObject.methods.includes('eth_subscribe')
              ) {
                // for each tabId
                Object.values(this.connections[origin]).forEach(({ tabId }) => {
                  this.addMultichainApiEthSubscriptionMiddleware({
                    scope,
                    origin,
                    tabId,
                  });
                });
              } else {
                this.removeMultichainApiEthSubscriptionMiddleware({
                  scope,
                  origin,
                });
              }
            });
            this._notifyAuthorizationChange(origin, authorization);
          }
        },
        getAuthorizedScopesByOrigin,
      );
    }

    controllerMessenger.subscribe(
      `${PermissionController.name}:stateChange`,
      async (currentValue, previousValue) => {
        const changedChains = diffMap(currentValue, previousValue);

        // This operates under the assumption that there will be at maximum
        // one origin permittedChains value change per event handler call
        for (const [origin, chains] of changedChains.entries()) {
          const currentNetworkClientIdForOrigin =
            SelectedNetworkController.getNetworkClientIdForDomain(origin);
          const { chainId: currentChainIdForOrigin } =
            NetworkController.getNetworkConfigurationByNetworkClientId(
              currentNetworkClientIdForOrigin,
            );
          // if(chains.length === 0) {
          // TODO: [migrated from extension?] This particular case should also occur at the same time
          // that eth_accounts is revoked. When eth_accounts is revoked,
          // the networkClientId for that origin should be reset to track
          // the globally selected network.
          // }
          if (chains.length > 0 && !chains.includes(currentChainIdForOrigin)) {
            const networkClientId =
              NetworkController.findNetworkClientIdByChainId(chains[0]);
            // setActiveNetwork should be called before setNetworkClientIdForDomain
            // to ensure that the isConnected value can be accurately inferred from
            // NetworkController.state.networksMetadata in return value of
            // `metamask_getProviderState` requests and `metamask_chainChanged` events.
            NetworkController.setActiveNetwork(networkClientId);
            SelectedNetworkController.setNetworkClientIdForDomain(
              origin,
              networkClientId,
            );
          }
        }
      },
      getPermittedChainsByOrigin,
    );

    controllerMessenger.subscribe(
      'NetworkController:networkRemoved',
      ({ chainId }) => {
        const scopeString = toCaipChainId(
          'eip155',
          hexToBigInt(chainId).toString(10),
        );
        PermissionController.updatePermissionsByCaveat(
          Caip25CaveatType,
          (existingScopes) =>
            Caip25CaveatMutators[Caip25CaveatType].removeScope(
              existingScopes,
              scopeString,
            ),
        );
      },
    );

    controllerMessenger.subscribe(
      'NetworkController:networkDidChange',
      async () => {
        if (PreferencesController.state.useExternalServices) {
          TransactionController.stopIncomingTransactionPolling();
          await TransactionController.updateIncomingTransactions();
          TransactionController.startIncomingTransactionPolling();
        }
      },
    );
  }

  async notifySelectedAddressChanged(selectedAddress) {
    try {
      let approvedAccounts = [];
      DevLogger.log(
        `notifySelectedAddressChanged: ${selectedAddress} channelId=${this.channelId} wc=${this.isWalletConnect} url=${this.url}`,
      );
      if (this.isWalletConnect) {
        approvedAccounts = getPermittedAccounts(this.url);
      } else {
        approvedAccounts = getPermittedAccounts(
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

  async onStateUpdate(memState) {
    if (!memState) {
      memState = this.getState();
    }
    const publicState = await this.getProviderNetworkState(this.hostname);

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

  async getProviderState(origin) {
    const metadata = {};
    if (AppConstants.MULTICHAIN_API) {
      // TODO: [ffmcgee] get extensionId ?
      // const { chrome } = globalThis;
      // metadata.extensionId = chrome?.runtime?.id;
    }
    return {
      ...metadata,
      isUnlocked: this.isUnlocked(),
      ...(await this.getProviderNetworkState(origin)),
    };
  }

  sendStateUpdate = () => {
    this.emit('update');
  };

  onMessage = (msg) => {
    this.port.emit('message', { name: msg.name, data: msg.data });
  };

  onDisconnect = () => {
    this.disconnected = true;
    Engine.controllerMessenger.unsubscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.sendStateUpdate,
    );
    Engine.controllerMessenger.unsubscribe(
      'PreferencesController:stateChange',
      this.sendStateUpdate,
    );

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
   * @param {MessageSender | SnapSender} sender - The sender of the messages on this stream
   * @param {SubjectType} subjectType - The type of the sender, i.e. subject.
   */
  setupProviderConnectionCaip(outStream, sender, subjectType) {
    // TODO: [ffmcgee] implement
    return null;
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   **/
  setupProviderEngineEip1193() {
    const origin = this.hostname;
    // setup json rpc engine stack
    const engine = new JsonRpcEngine();

    const { KeyringController, PermissionController } = Engine.context;

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

    // Unrestricted/permissionless RPC method implementations.
    engine.push(
      createEip1193MethodMiddleware({
        // Permission-related
        getAccounts: (...args) =>
          getPermittedAccounts(this.isMMSDK ? this.channelId : origin, ...args),
        getCaip25PermissionFromLegacyPermissionsForOrigin: (
          requestedPermissions,
        ) =>
          getCaip25PermissionFromLegacyPermissions(
            origin,
            requestedPermissions,
          ),
        getPermissionsForOrigin: PermissionController.getPermissions.bind(
          PermissionController,
          origin,
        ),
        requestPermissionsForOrigin: (requestedPermissions) =>
          PermissionController.requestPermissions(
            { origin },
            requestedPermissions,
          ),
        revokePermissionsForOrigin: (permissionKeys) => {
          try {
            PermissionController.revokePermissions({
              [origin]: permissionKeys,
            });
          } catch (e) {
            // we dont want to handle errors here because
            // the revokePermissions api method should just
            // return `null` if the permissions were not
            // successfully revoked or if the permissions
            // for the origin do not exist
          }
        },
        // network configuration-related
        updateCaveat: PermissionController.updateCaveat.bind(
          PermissionController,
          origin,
        ),
        getUnlockPromise: () => {
          if (KeyringController.isUnlocked()) {
            return Promise.resolve();
          }
          return new Promise((resolve) => {
            Engine.controllerMessenger.subscribeOnceIf(
              'KeyringController:unlock',
              resolve,
              () => true,
            );
          });
        },
      }),
    );

    // Legacy RPC methods that need to be implemented ahead of the permission middleware
    engine.push(
      createEthAccountsMethodMiddleware({
        getAccounts: (...args) =>
          getPermittedAccounts(this.isMMSDK ? this.channelId : origin, ...args),
      }),
    );

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

    // Append PermissionController middleware
    engine.push(
      Engine.context.PermissionController.createPermissionMiddleware({
        // FIXME: This condition exists so that both WC and SDK are compatible with the permission middleware.
        // This is not a long term solution. BackgroundBridge should be not contain hardcoded logic pertaining to WC, SDK, or browser.
        origin: this.isMMSDK ? this.channelId : origin,
      }),
    );

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

    // user-facing RPC methods
    engine.push(
      this.createMiddleware({
        hostname: this.hostname,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

    engine.push(createSanitizationMiddleware());

    // forward to metamask primary provider
    engine.push(providerAsMiddleware(proxyClient.provider));
    return engine;
  }

  /**
   * A method for creating a CAIP Multichain provider that is safely restricted for the requesting subject.
   */
  setupProviderEngineCaip() {
    if (!AppConstants.MULTICHAIN_API) {
      return null;
    }

    const origin = this.hostname;

    const {
      ApprovalController,
      NetworkController,
      SubjectMetadataController,
      AccountsController,
      PermissionController,
      TokensController,
      SelectedNetworkController,
      NftController,
    } = Engine.context;

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
        requestPermissionsForOrigin: (requestedPermissions) =>
          PermissionController.requestPermissions(
            { origin },
            requestedPermissions,
          ),
        metamaskState: this.getState(),
        getCaveatForOrigin: PermissionController.getCaveat.bind(
          PermissionController,
          origin,
        ),
        getSelectedNetworkClientId: () =>
          NetworkController.state.selectedNetworkClientId,
        revokePermissionForOrigin: PermissionController.revokePermission.bind(
          PermissionController,
          origin,
        ),

        // TODO: [ffmcgee] DRY this one
        getNonEvmSupportedMethods: (scope) =>
          Engine.controllerMessenger.call(
            'MultichainRouter:getSupportedMethods',
            scope,
          ),
        isNonEvmScopeSupported: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger.controllerMessenger,
          'MultichainRouter:isSupportedScope',
        ),
        handleNonEvmRequestForOrigin: (params) =>
          Engine.controllerMessenger.call('MultichainRouter:handleRequest', {
            ...params,
            origin,
          }),
        getNonEvmAccountAddresses: Engine.controllerMessenger.call.bind(
          Engine.controllerMessenger,
          'MultichainRouter:getSupportedAccounts',
        ),
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

    engine.push(
      createMultichainMethodMiddleware({
        // Miscellaneous
        addSubjectMetadata: SubjectMetadataController.addSubjectMetadata.bind(
          SubjectMetadataController,
        ),
        getProviderState: this.getProviderState.bind(this),
        handleWatchAssetRequest: ({ asset, type, origin, networkClientId }) => {
          switch (type) {
            case ERC20:
              return TokensController.watchAsset({
                asset,
                type,
                networkClientId,
              });
            case ERC721:
            case ERC1155:
              return NftController.watchNft(asset, type, origin);
            default:
              throw new Error(`Asset type ${type} not supported`);
          }
        },
        requestUserApproval:
          ApprovalController.addAndShowApprovalRequest.bind(ApprovalController),
        getCaveat: ({ target, caveatType }) => {
          try {
            return PermissionController.getCaveat(origin, target, caveatType);
          } catch (e) {
            if (e instanceof PermissionDoesNotExistError) {
              // suppress expected error in case that the origin
              // does not have the target permission yet
            } else {
              throw e;
            }
          }
        },
        addNetwork: NetworkController.addNetwork.bind(NetworkController),
        updateNetwork: NetworkController.updateNetwork.bind(NetworkController),
        setActiveNetwork: async (networkClientId) => {
          await NetworkController.setActiveNetwork(networkClientId);
          // if the origin has the CAIP-25 permission
          // we set per dapp network selection state
          if (
            PermissionController.hasPermission(
              origin,
              Caip25EndowmentPermissionName,
            )
          ) {
            SelectedNetworkController.setNetworkClientIdForDomain(
              origin,
              networkClientId,
            );
          }
        },
        getNetworkConfigurationByChainId:
          NetworkController.getNetworkConfigurationByChainId.bind(
            NetworkController,
          ),
        getCurrentChainIdForDomain: (domain) => {
          const networkClientId =
            SelectedNetworkController.getNetworkClientIdForDomain(domain);
          const { chainId } =
            NetworkController.getNetworkConfigurationByNetworkClientId(
              networkClientId,
            );
          return chainId;
        },
        // TODO: [ffmcgee] investigate, this controller not in context
        // // Web3 shim-related
        // getWeb3ShimUsageState: this.alertController.getWeb3ShimUsageState.bind(
        //   this.alertController,
        // ),
        // setWeb3ShimUsageRecorded:
        //   this.alertController.setWeb3ShimUsageRecorded.bind(
        //     this.alertController,
        //   ),

        requestPermittedChainsPermissionIncrementalForOrigin: (options) =>
          Engine.requestPermittedChainsPermissionIncremental({
            ...options,
            origin,
          }),
        rejectApprovalRequestsForOrigin: () =>
          Engine.rejectOriginPendingApprovals(origin),
      }),
    );

    // TODO: [ffmcgee] implement
    // engine.push(this.metamaskMiddleware);

    try {
      const caip25Caveat = PermissionController.getCaveat(
        origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );

      // add new notification subscriptions for changed authorizations
      const sessionScopes = getSessionScopes(caip25Caveat.value, {
        // TODO: [ffmcgee] DRY this one
        getNonEvmSupportedMethods: (scope) =>
          Engine.controllerMessenger.call(
            'MultichainRouter:getSupportedMethods',
            scope,
          ),
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
      (targetOrigin, message) => {
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

    engine.push(async (req, res, _next, end) => {
      const { provider } = NetworkController.getNetworkClientById(
        req.networkClientId,
      );
      res.result = await provider.request(req);
      return end();
    });

    return engine;
  }

  sendNotification(payload) {
    DevLogger.log(`BackgroundBridge::sendNotification: `, payload);
    this.engine && this.engine.emit('notification', payload);
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

  /**
   * Sorts a list of multichain account addresses by most recently selected by using
   * the lastSelected value for the matching InternalAccount object stored in state.
   *
   * @param {string[]} [addresses] - The list of addresses (not full CAIP-10 Account IDs) to sort.
   * @returns {string[]} The sorted accounts addresses.
   */
  sortMultichainAccountsByLastSelected(addresses) {
    const internalAccounts =
      Engine.context.AccountsController.listMultichainAccounts();
    return this.sortAddressesWithInternalAccounts(addresses, internalAccounts);
  }

  /**
   * Sorts a list of addresses by most recently selected by using the lastSelected value for
   * the matching InternalAccount object from the list of internalAccounts provided.
   *
   * @param {string[]} [addresses] - The list of caip accounts addresses to sort.
   * @param {InternalAccount[]} [internalAccounts] - The list of InternalAccounts to determine lastSelected from.
   * @returns {string[]} The sorted accounts addresses.
   */
  sortAddressesWithInternalAccounts(addresses, internalAccounts) {
    return addresses.sort((firstAddress, secondAddress) => {
      const firstAccount = internalAccounts.find(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === firstAddress.toLowerCase(),
      );

      const secondAccount = internalAccounts.find(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === secondAddress.toLowerCase(),
      );

      if (!firstAccount) {
        captureKeyringTypesWithMissingIdentities(internalAccounts, addresses);
        throw new Error(`Missing identity for address: "${firstAddress}".`);
      } else if (!secondAccount) {
        captureKeyringTypesWithMissingIdentities(internalAccounts, addresses);
        throw new Error(`Missing identity for address: "${secondAddress}".`);
      } else if (
        firstAccount.metadata.lastSelected ===
        secondAccount.metadata.lastSelected
      ) {
        return 0;
      } else if (firstAccount.metadata.lastSelected === undefined) {
        return 1;
      } else if (secondAccount.metadata.lastSelected === undefined) {
        return -1;
      }

      return (
        secondAccount.metadata.lastSelected - firstAccount.metadata.lastSelected
      );
    });
  }

  /**
   * If it does not already exist, creates and inserts middleware to handle eth
   * subscriptions for a particular evm scope on a specific Multichain API
   * JSON-RPC pipeline by origin and tabId.
   *
   * @param {object} options - The options object.
   * @param {string} options.scope - The evm scope to handle eth susbcriptions for.
   * @param {string} options.origin - The origin to handle eth subscriptions for.
   * @param {string} options.tabId - The tabId to handle eth subscriptions for.
   */
  addMultichainApiEthSubscriptionMiddleware({ scope, origin, tabId }) {
    const subscriptionManager = this.multichainSubscriptionManager.subscribe({
      scope,
      origin,
      tabId,
    });
    this.multichainMiddlewareManager.addMiddleware({
      scope,
      origin,
      tabId,
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

  async _onAccountChange(newAddress) {
    const permittedAccountsMap = getPermittedAccountsByOrigin(
      Engine.context.PermissionController.state,
    );

    for (const [origin, accounts] of permittedAccountsMap.entries()) {
      if (accounts.includes(newAddress)) {
        this._notifyAccountsChange(origin, accounts);
      }
    }

    await Engine.context.TransactionController.updateIncomingTransactions();
  }

  _notifyAccountsChange(origin, newAccounts) {
    this.notifyConnections(
      origin,
      {
        method: NOTIFICATION_NAMES.accountsChanged,
        // This should be the same as the return value of `eth_accounts`,
        // namely an array of the current / most recently selected Ethereum
        // account.
        params:
          newAccounts.length < 2
            ? // If the length is 1 or 0, the accounts are sorted by definition.
              newAccounts
            : // If the length is 2 or greater, we have to execute
              // `eth_accounts` vi this method.
              this.getPermittedAccounts(origin),
      },
      API_TYPE.EIP1193,
    );

    Engine.context.PermissionLogController.updateAccountsHistory(
      origin,
      newAccounts,
    );
  }

  /**
   * Gets the sorted permitted accounts for the specified origin. Returns an empty
   * array if no accounts are permitted or the wallet is locked. Returns any permitted
   * accounts if the wallet is locked and `ignoreLock` is true. This lock bypass is needed
   * for the `eth_requestAccounts` & `wallet_getPermission` handlers both of which
   * return permissioned accounts to the dapp when the wallet is locked.
   *
   * @param {string} origin - The origin whose exposed accounts to retrieve.
   * @param {object} [options] - The options object
   * @param {boolean} [options.ignoreLock] - If accounts should be returned even if the wallet is locked.
   * @returns {Promise<string[]>} The origin's permitted accounts, or an empty
   * array.
   */
  getPermittedAccounts(origin, { ignoreLock } = {}) {
    let caveat;
    const { PermissionController } = Engine.context;
    try {
      caveat = PermissionController.getCaveat(
        origin,
        Caip25EndowmentPermissionName,
        Caip25CaveatType,
      );
    } catch (err) {
      if (err instanceof PermissionDoesNotExistError) {
        // suppress expected error in case that the origin
        // does not have the target permission yet
        return [];
      }
      throw err;
    }

    if (!this.isUnlocked() && !ignoreLock) {
      return [];
    }

    const ethAccounts = getEthAccounts(caveat.value);
    return this.sortEvmAccountsByLastSelected(ethAccounts);
  }

  _restartSmartTransactionPoller() {
    const { PreferencesController, TransactionController } = Engine.context;

    if (PreferencesController.state.useExternalServices === true) {
      TransactionController.stopIncomingTransactionPolling();
      TransactionController.startIncomingTransactionPolling();
    }
  }

  _checkTokenListPolling(currentState, previousState) {
    const previousEnabled = this._isTokenListPollingRequired(previousState);
    const newEnabled = this._isTokenListPollingRequired(currentState);

    if (previousEnabled === newEnabled) {
      return;
    }

    Engine.context.TokenListController.updatePreventPollingOnNetworkRestart(
      !newEnabled,
    );
  }

  _isTokenListPollingRequired(preferencesControllerState) {
    const { useTokenDetection, useTransactionSimulations, preferences } =
      preferencesControllerState ?? {};

    const { petnamesEnabled } = preferences ?? {};

    return useTokenDetection || petnamesEnabled || useTransactionSimulations;
  }
}

export default BackgroundBridge;
