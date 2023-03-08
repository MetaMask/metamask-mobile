/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import { NetworksChainId } from '@metamask/controller-utils';
import { JsonRpcEngine } from 'json-rpc-engine';
import MobilePortStream from '../MobilePortStream';
import { setupMultiplex } from '../../util/streams';
import {
  createOriginMiddleware,
  createLoggerMiddleware,
} from '../../util/middlewares';
import Engine from '../Engine';
import { getAllNetworks } from '../../util/networks';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import { createEngineStream } from 'json-rpc-middleware-stream';
import {
  createSwappableProxy,
  createEventEmitterProxy,
} from 'swappable-obj-proxy';
import RemotePort from './RemotePort';
import WalletConnectPort from './WalletConnectPort';
import Port from './Port';

const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const pump = require('pump');
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;
const { CONNECTION_TYPE, NOTIFICATION_NAMES } = AppConstants;

/**
 * Options for a connection between the background and the browser.
 *
 * @typedef {object} BrowserConnectionOptions
 * @property {boolean} isMainFrame - Whether the connection is with the parent browser window, or a subframe (e.g. an iframe).
 * @property {CONNECTION_TYPE.BROWSER} type - The connection type.
 * @property {string} url - The URL of the connected website.
 * @property {object} webview - A React ref to the WebView component.
 */

/**
 * Options for a connection between the background and a remote source.
 *
 * @typedef {object} RemoteConnectionOptions
 * @property {Function} getApprovedHosts - Returns a list of all approved hosts.
 * @property {string} remoteConnHost - The host used for this connection.
 * @property {CONNECTION_TYPE.REMOTE} type - The connection type.
 * @property {Function} sendMessage - Sends a message over this connection.
 * @property {string} url - The URL of the remote source.
 */

/**
 * Options for a connection between the background and WalletConnect.
 *
 * @typedef {object} WalletConnectConnectionOptions
 * @property {CONNECTION_TYPE.WALLET_CONNECT} type - The connection type.
 * @property {string} url - The URL for this WalletConnect session.
 * @property {object} wcRequestActions - A set of functions for managing the WalletConnect session.
 */

/**
 * Background connection options.
 *
 * @typedef {BrowserConnectionOptions | RemoteConnectionOptions | WalletConnectConnectionOptions} ConnectionOptions
 */

export class BackgroundBridge extends EventEmitter {
  /**
   * Background bridge constructor.
   *
   * @param {object} options - Background bridge options.
   * @param {Function} getRpcMethodMiddleware - Returns the set of middleware to use for this background connection.
   * @param {ConnectionOptions} - Options for this background connection.
   */
  constructor({ getRpcMethodMiddleware, connectionOptions }) {
    super();
    this.url = connectionOptions.url;
    this.connectionOptions = connectionOptions;
    this.hostname = new URL(connectionOptions.url).hostname;
    this.disconnected = false;

    this.createMiddleware = getRpcMethodMiddleware;

    const provider = Engine.context.NetworkController.provider;
    const blockTracker = provider._blockTracker;

    // provider and block tracker proxies - because the network changes
    this._providerProxy = null;
    this._blockTrackerProxy = null;

    this.setProviderAndBlockTracker({ provider, blockTracker });

    let portStream;
    if (connectionOptions.type === CONNECTION_TYPE.WALLET_CONNECT) {
      this.port = new WalletConnectPort(connectionOptions.wcRequestActions);
      portStream = new MobilePortStream(this.port);
    } else if (connectionOptions.type === CONNECTION_TYPE.REMOTE) {
      this.port = new RemotePort(connectionOptions.sendMessage);
      portStream = new MobilePortStream(this.port);
    } else if (connectionOptions.type === CONNECTION_TYPE.BROWSER) {
      this.port = new Port(
        connectionOptions.webview.current,
        connectionOptions.isMainFrame,
      );
      portStream = new MobilePortStream(this.port, connectionOptions.url);
    } else {
      throw new Error(`Invalid connection type: '${connectionOptions.type}'`);
    }

    this.isMainFrame =
      connectionOptions.type === CONNECTION_TYPE.BROWSER
        ? connectionOptions.isMainFrame
        : false;

    this.engine = null;

    this.chainIdSent =
      Engine.context.NetworkController.state.providerConfig.chainId;
    this.networkVersionSent = Engine.context.NetworkController.state.network;

    // This will only be used for WalletConnect for now
    this.addressSent =
      Engine.context.PreferencesController.state.selectedAddress?.toLowerCase();

    // setup multiplexing
    const mux = setupMultiplex(portStream);
    // connect features
    this.setupProviderConnection(
      mux.createStream(
        connectionOptions.type === CONNECTION_TYPE.WALLET_CONNECT
          ? 'walletconnect-provider'
          : 'metamask-provider',
      ),
    );

    Engine.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.sendStateUpdate,
    );
    Engine.context.PreferencesController.subscribe(this.sendStateUpdate);

    Engine.context.KeyringController.onLock(this.onLock.bind(this));
    Engine.context.KeyringController.onUnlock(this.onUnlock.bind(this));

    this.on('update', this.onStateUpdate);

    if (connectionOptions.type === CONNECTION_TYPE.REMOTE) {
      const memState = this.getState();
      const publicState = this.getProviderNetworkState(memState);
      const selectedAddress = memState.selectedAddress;
      this.notifyChainChanged(publicState);
      this.notifySelectedAddressChanged(selectedAddress);
    }
  }

  setProviderAndBlockTracker({ provider, blockTracker }) {
    // update or intialize proxies
    if (this._providerProxy) {
      this._providerProxy.setTarget(provider);
    } else {
      this._providerProxy = createSwappableProxy(provider);
    }
    if (this._blockTrackerProxy) {
      this._blockTrackerProxy.setTarget(blockTracker);
    } else {
      this._blockTrackerProxy = createEventEmitterProxy(blockTracker, {
        eventFilter: 'skipInternal',
      });
    }
    // set new provider and blockTracker
    this.provider = provider;
    this.blockTracker = blockTracker;
  }

  onUnlock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.disconnected) return;

    if (this.connectionOptions.type === CONNECTION_TYPE.REMOTE) {
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

    if (this.connectionOptions.type === CONNECTION_TYPE.REMOTE) {
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

  getProviderNetworkState({ network }) {
    const { providerConfig } = Engine.context.NetworkController.state;
    const networkType = providerConfig.type;

    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let chainId;

    if (isInitialNetwork) {
      chainId = NetworksChainId[networkType];
    } else if (networkType === 'rpc') {
      chainId = providerConfig.chainId;
    }
    if (chainId && !chainId.startsWith('0x')) {
      // Convert to hex
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    const result = {
      networkVersion: network,
      chainId,
    };
    return result;
  }

  notifyChainChanged(params) {
    this.sendNotification({
      method: NOTIFICATION_NAMES.chainChanged,
      params,
    });
  }

  notifySelectedAddressChanged(selectedAddress) {
    if (this.connectionOptions.type === CONNECTION_TYPE.REMOTE) {
      if (
        !this.connectionOptions.getApprovedHosts()[
          this.connectionOptions.remoteConnHost
        ]
      )
        return;
    }
    this.sendNotification({
      method: NOTIFICATION_NAMES.accountsChanged,
      params: [selectedAddress],
    });
  }

  onStateUpdate(memState) {
    const provider = Engine.context.NetworkController.provider;
    const blockTracker = provider._blockTracker;
    this.setProviderAndBlockTracker({ provider, blockTracker });
    if (!memState) {
      memState = this.getState();
    }
    const publicState = this.getProviderNetworkState(memState);

    // Check if update already sent
    if (
      this.chainIdSent !== publicState.chainId &&
      this.networkVersionSent !== publicState.networkVersion &&
      publicState.networkVersion !== 'loading'
    ) {
      this.chainIdSent = publicState.chainId;
      this.networkVersionSent = publicState.networkVersion;
      this.notifyChainChanged(publicState);
    }

    // THE BROWSER HANDLES THIS NOTIFICATION BY ITSELF
    if (this.connectionOptions.type !== CONNECTION_TYPE.BROWSER) {
      if (this.addressSent !== memState.selectedAddress) {
        this.addressSent = memState.selectedAddress;
        this.notifySelectedAddressChanged(memState.selectedAddress);
      }
    }
  }

  isUnlocked() {
    return Engine.context.KeyringController.isUnlocked();
  }

  getProviderState() {
    const memState = this.getState();
    return {
      isUnlocked: this.isUnlocked(),
      ...this.getProviderNetworkState(memState),
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
    Engine.context.PreferencesController.unsubscribe(this.sendStateUpdate);
    this.port.emit('disconnect', { name: this.port.name, data: null });
  };

  /**
   * A method for serving our ethereum provider over a given stream.
   * @param {*} outStream - The stream to provide over.
   */
  setupProviderConnection(outStream) {
    this.engine = this.setupProviderEngine();

    // setup connection
    const providerStream = createEngineStream({ engine: this.engine });

    pump(outStream, providerStream, outStream, (err) => {
      // handle any middleware cleanup
      this.engine._middleware.forEach((mid) => {
        if (mid.destroy && typeof mid.destroy === 'function') {
          mid.destroy();
        }
      });
      if (err) Logger.log('Error with provider stream conn', err);
    });
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   **/
  setupProviderEngine() {
    const origin = this.hostname;
    // setup json rpc engine stack
    const engine = new JsonRpcEngine();
    const provider = this._providerProxy;

    const blockTracker = this._blockTrackerProxy;

    // create filter polyfill middleware
    const filterMiddleware = createFilterMiddleware({ provider, blockTracker });

    // create subscription polyfill middleware
    const subscriptionManager = createSubscriptionManager({
      provider,
      blockTracker,
    });
    subscriptionManager.events.on('notification', (message) =>
      engine.emit('notification', message),
    );

    // metadata
    engine.push(createOriginMiddleware({ origin }));
    engine.push(createLoggerMiddleware({ origin }));
    // filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);
    // watch asset

    // user-facing RPC methods
    engine.push(
      this.createMiddleware({
        hostname: origin,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

    // TODO - Remove this condition when WalletConnect and MMSDK uses Permission System.
    if (this.connectionOptions.type === CONNECTION_TYPE.BROWSER) {
      const permissionController = Engine.context.PermissionController;
      engine.push(
        permissionController.createPermissionMiddleware({
          origin,
        }),
      );
    }

    // forward to metamask primary provider
    engine.push(providerAsMiddleware(provider));
    return engine;
  }

  sendNotification(payload) {
    this.engine && this.engine.emit('notification', payload);
  }

  /**
   * The metamask-state of the various controllers, made available to the UI
   *
   * @returns {Object} status
   */
  getState() {
    const vault = Engine.context.KeyringController.state.vault;
    const { network, selectedAddress } = Engine.datamodel.flatState;
    return {
      isInitialized: !!vault,
      isUnlocked: true,
      network,
      selectedAddress,
    };
  }
}

export default BackgroundBridge;
