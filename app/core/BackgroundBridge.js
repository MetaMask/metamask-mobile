/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import { NetworksChainId } from '@metamask/controllers';
import { JsonRpcEngine } from 'json-rpc-engine';
import {
  JS_POST_MESSAGE_TO_PROVIDER,
  JS_IFRAME_POST_MESSAGE_TO_PROVIDER,
} from '../util/browserScripts';
import MobilePortStream from './MobilePortStream';
import { setupMultiplex } from '../util/streams';
import {
  createOriginMiddleware,
  createLoggerMiddleware,
} from '../util/middlewares';
import Engine from './Engine';
import { getAllNetworks } from '../util/networks';
import Logger from '../util/Logger';
import AppConstants from './AppConstants';
import { createEngineStream } from 'json-rpc-middleware-stream';
import {
  createSwappableProxy,
  createEventEmitterProxy,
} from 'swappable-obj-proxy';

const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const pump = require('pump');
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;
const { NOTIFICATION_NAMES } = AppConstants;

/**
 * Module that listens for and responds to messages from an InpageBridge using postMessage
 */

class Port extends EventEmitter {
  constructor(window, isMainFrame) {
    super();
    this._window = window;
    this._isMainFrame = isMainFrame;
  }

  postMessage = (msg, origin = '*') => {
    const js = this._isMainFrame
      ? JS_POST_MESSAGE_TO_PROVIDER(msg, origin)
      : JS_IFRAME_POST_MESSAGE_TO_PROVIDER(msg, origin);
    if (this._window.webViewRef && this._window.webViewRef.current) {
      this._window && this._window.injectJavaScript(js);
    }
  };
}

class WalletConnectPort extends EventEmitter {
  constructor(wcRequestActions) {
    super();
    this._wcRequestActions = wcRequestActions;
  }

  postMessage = (msg) => {
    try {
      if (msg?.data?.method === NOTIFICATION_NAMES.chainChanged) {
        const { selectedAddress } = Engine.datamodel.flatState;
        this._wcRequestActions?.updateSession?.({
          chainId: parseInt(msg.data.params.chainId, 16),
          accounts: [selectedAddress],
        });
      } else if (msg?.data?.method === NOTIFICATION_NAMES.accountsChanged) {
        const chainId = Engine.context.NetworkController.state.provider.chainId;
        this._wcRequestActions?.updateSession?.({
          chainId: parseInt(chainId, 10),
          accounts: msg.data.params,
        });
      } else if (msg?.data?.method === NOTIFICATION_NAMES.unlockStateChanged) {
        // WC DOESN'T NEED THIS EVENT
      } else if (msg?.data?.error) {
        this._wcRequestActions?.rejectRequest?.({
          id: msg.data.id,
          error: msg.data.error,
        });
      } else {
        this._wcRequestActions?.approveRequest?.({
          id: msg.data.id,
          result: msg.data.result,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };
}

export class BackgroundBridge extends EventEmitter {
  constructor({
    webview,
    url,
    getRpcMethodMiddleware,
    isMainFrame,
    isWalletConnect,
    wcRequestActions,
  }) {
    super();
    this.url = url;
    this.hostname = new URL(url).hostname;
    this.isMainFrame = isMainFrame;
    this.isWalletConnect = isWalletConnect;
    this._webviewRef = webview && webview.current;
    this.disconnected = false;

    this.createMiddleware = getRpcMethodMiddleware;

    const provider = Engine.context.NetworkController.provider;
    const blockTracker = provider._blockTracker;

    // provider and block tracker proxies - because the network changes
    this._providerProxy = null;
    this._blockTrackerProxy = null;

    this.setProviderAndBlockTracker({ provider, blockTracker });

    this.port = this.isWalletConnect
      ? new WalletConnectPort(wcRequestActions)
      : new Port(this._webviewRef, isMainFrame);

    this.engine = null;

    this.chainIdSent = Engine.context.NetworkController.state.provider.chainId;
    this.networkVersionSent = Engine.context.NetworkController.state.network;

    // This will only be used for WalletConnect for now
    this.addressSent =
      Engine.context.PreferencesController.state.selectedAddress?.toLowerCase();

    const portStream = new MobilePortStream(this.port, url);
    // setup multiplexing
    const mux = setupMultiplex(portStream);
    // connect features
    this.setupProviderConnection(
      mux.createStream(
        isWalletConnect ? 'walletconnect-provider' : 'metamask-provider',
      ),
    );

    Engine.context.NetworkController.subscribe(this.sendStateUpdate);
    Engine.context.PreferencesController.subscribe(this.sendStateUpdate);

    Engine.context.KeyringController.onLock(this.onLock.bind(this));
    Engine.context.KeyringController.onUnlock(this.onUnlock.bind(this));

    this.on('update', this.onStateUpdate);
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

    this.sendNotification({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: true,
    });
  }

  onLock() {
    // TODO UNSUBSCRIBE EVENT INSTEAD
    if (this.disconnected) return;

    this.sendNotification({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: false,
    });
  }

  getProviderNetworkState({ network }) {
    const networkType = Engine.context.NetworkController.state.provider.type;
    const networkProvider = Engine.context.NetworkController.state.provider;

    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let chainId;

    if (isInitialNetwork) {
      chainId = NetworksChainId[networkType];
    } else if (networkType === 'rpc') {
      chainId = networkProvider.chainId;
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
      this.sendNotification({
        method: NOTIFICATION_NAMES.chainChanged,
        params: publicState,
      });
    }

    // ONLY NEEDED FOR WC FOR NOW, THE BROWSER HANDLES THIS NOTIFICATION BY ITSELF
    if (this.isWalletConnect) {
      if (this.addressSent !== memState.selectedAddress) {
        this.addressSent = memState.selectedAddress;
        this.sendNotification({
          method: NOTIFICATION_NAMES.accountsChanged,
          params: [memState.selectedAddress],
        });
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
    Engine.context.NetworkController.unsubscribe(this.sendStateUpdate);
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
        hostname: this.hostname,
        getProviderState: this.getProviderState.bind(this),
      }),
    );

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
