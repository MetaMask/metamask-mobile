/* eslint-disable import/no-commonjs */
import URL from 'url-parse';
import { ChainId } from '@metamask/controller-utils';
import { JsonRpcEngine } from 'json-rpc-engine';
import MobilePortStream from '../MobilePortStream';
import { setupMultiplex } from '../../util/streams';
import {
  createOriginMiddleware,
  createLoggerMiddleware,
} from '../../util/middlewares';
import Engine from '../Engine';
import { createSanitizationMiddleware } from '../SanitizationMiddleware';
import { getAllNetworks } from '../../util/networks';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import { createEngineStream } from 'json-rpc-middleware-stream';
import RemotePort from './RemotePort';
import WalletConnectPort from './WalletConnectPort';
import Port from './Port';
import {
  selectChainId,
  selectNetworkId,
  selectProviderConfig,
  selectLegacyNetwork,
} from '../../selectors/networkController';
import { store } from '../../store';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import snapMethodMiddlewareBuilder from '../Snaps/SnapsMethodMiddleware';
import { SubjectType } from '@metamask/permission-controller';
///: END:ONLY_INCLUDE_IF

const createFilterMiddleware = require('eth-json-rpc-filters');
const createSubscriptionManager = require('eth-json-rpc-filters/subscriptionManager');
const providerAsMiddleware = require('eth-json-rpc-middleware/providerAsMiddleware');
const pump = require('pump');
// eslint-disable-next-line import/no-nodejs-modules
const EventEmitter = require('events').EventEmitter;
const { NOTIFICATION_NAMES } = AppConstants;
import DevLogger from '../SDKConnect/utils/DevLogger';
import { getPermittedAccounts } from '../Permissions';

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

    this.createMiddleware = getRpcMethodMiddleware;

    this.port = isRemoteConn
      ? new RemotePort(sendMessage)
      : this.isWalletConnect
      ? new WalletConnectPort(wcRequestActions)
      : new Port(this._webviewRef, isMainFrame);

    this.engine = null;

    this.chainIdSent = selectChainId(store.getState());
    this.networkVersionSent = selectNetworkId(store.getState());

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

    Engine.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      this.sendStateUpdate,
    );
    Engine.context.PreferencesController.subscribe(this.sendStateUpdate);

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
      const controllerMessenger = Engine.context.controllerMessenger;
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

    this.on('update', this.onStateUpdate);

    if (this.isRemoteConn) {
      const memState = this.getState();
      const publicState = this.getProviderNetworkState();
      const selectedAddress = memState.selectedAddress;
      this.notifyChainChanged(publicState);
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

  getProviderNetworkState() {
    const providerConfig = selectProviderConfig(store.getState());
    const networkType = providerConfig.type;

    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let chainId;

    if (isInitialNetwork) {
      chainId = ChainId[networkType];
    } else if (networkType === 'rpc') {
      chainId = providerConfig.chainId;
    }
    if (chainId && !chainId.startsWith('0x')) {
      // Convert to hex
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    const result = {
      networkVersion: selectLegacyNetwork(store.getState()),
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

  async notifySelectedAddressChanged(selectedAddress) {
    try {
      let approvedAccounts = await getPermittedAccounts(
        this.channelId ?? this.hostname,
      );

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
      }
      DevLogger.log(
        `notifySelectedAddressChanged hostname: ${this.hostname}: ${selectedAddress}`,
        approvedAccounts,
      );
      this.sendNotification({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: approvedAccounts,
      });
    } catch (err) {
      console.error(`notifySelectedAddressChanged: ${err}`);
    }
  }

  onStateUpdate(memState) {
    if (!memState) {
      memState = this.getState();
    }
    const publicState = this.getProviderNetworkState();

    // Check if update already sent
    if (
      this.chainIdSent !== publicState.chainId ||
      (this.networkVersionSent !== publicState.networkVersion &&
        publicState.networkVersion !== 'loading')
    ) {
      this.chainIdSent = publicState.chainId;
      this.networkVersionSent = publicState.networkVersion;
      this.notifyChainChanged(publicState);
    }

    // ONLY NEEDED FOR WC FOR NOW, THE BROWSER HANDLES THIS NOTIFICATION BY ITSELF
    if (this.isWalletConnect || this.isRemoteConn) {
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
    return {
      isUnlocked: this.isUnlocked(),
      ...this.getProviderNetworkState(),
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
    const { blockTracker, provider } =
      Engine.context.NetworkController.getProviderAndBlockTracker();

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

    ///: BEGIN:ONLY_INCLUDE_IF(snaps)
    // Snaps middleware
    engine.push(
      snapMethodMiddlewareBuilder(
        Engine.context,
        Engine.controllerMessenger,
        origin,
        SubjectType.Snap,
      ),
    );
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
    engine.push(providerAsMiddleware(provider));
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
    const { selectedAddress } = Engine.datamodel.flatState;
    return {
      isInitialized: !!vault,
      isUnlocked: true,
      network: selectLegacyNetwork(store.getState()),
      selectedAddress,
    };
  }
}

export default BackgroundBridge;
