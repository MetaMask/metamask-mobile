import URL from 'url-parse';
import { ChainId } from '@metamask/controller-utils';
import { JsonRpcEngine, JsonRpcMiddleware } from 'json-rpc-engine';
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
  selectProviderConfig,
} from '../../selectors/networkController';
import { store } from '../../store';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import snapMethodMiddlewareBuilder from '../Snaps/SnapsMethodMiddleware';
import { SubjectType } from '@metamask/permission-controller';
///: END:ONLY_INCLUDE_IF
import createFilterMiddleware from 'eth-json-rpc-filters';
import createSubscriptionManager from 'eth-json-rpc-filters/subscriptionManager';
import providerAsMiddleware from 'eth-json-rpc-middleware/providerAsMiddleware';
import pump from 'pump';
import { EventEmitter } from 'events';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { getPermittedAccounts } from '../Permissions';
import { NETWORK_ID_LOADING } from '../redux/slices/inpageProvider';
import createUnsupportedMethodMiddleware from '../RPCMethods/createUnsupportedMethodMiddleware';
import createLegacyMethodMiddleware from '../RPCMethods/createLegacyMethodMiddleware';
import { Json, JsonRpcParams } from '@metamask/utils';
import { NetworkMetadata } from './custom-types';

const { NOTIFICATION_NAMES } = AppConstants;

const legacyNetworkId = () => {
  const { networksMetadata, selectedNetworkClientId } =
    store.getState().engine.backgroundState.NetworkController;

  const { networkId } = store.getState().inpageProvider;

  return (networksMetadata?.[selectedNetworkClientId] as NetworkMetadata)?.isAvailable === false
    ? NETWORK_ID_LOADING
    : networkId;
};

export class BackgroundBridge extends EventEmitter {
  url: string;
  hostname: string;
  remoteConnHost: string | undefined;
  isMainFrame: boolean;
  isWalletConnect: boolean;
  isMMSDK: boolean;
  isRemoteConn: boolean;
  private _webviewRef: any;
  disconnected: boolean;
  getApprovedHosts: () => Promise<string[]>;
  channelId: string | undefined;
  createMiddleware: any;
  port: RemotePort | WalletConnectPort | Port;
  engine: JsonRpcEngine;
  chainIdSent: string;
  networkVersionSent: string;
  addressSent: string;

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
  }: {
    webview: any;
    url: string;
    getRpcMethodMiddleware: any;
    isMainFrame: boolean;
    isRemoteConn: boolean;
    sendMessage: (message: any) => void;
    isWalletConnect: boolean;
    wcRequestActions: any;
    getApprovedHosts: () => Promise<string[]>;
    remoteConnHost?: string;
    isMMSDK: boolean;
    channelId?: string;
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

    this.engine = new JsonRpcEngine();

    this.chainIdSent = selectChainId(store.getState());
    this.networkVersionSent = store.getState().inpageProvider.networkId;

    // This will only be used for WalletConnect for now
    this.addressSent =
      Engine.context.AccountsController.getSelectedAccount().address.toLowerCase();

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

    Engine.controllerMessenger.subscribe(
      'PreferencesController:stateChange',
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

    try {
      const pc = Engine.context.PermissionController;
      const controllerMessenger = Engine.controllerMessenger;
      controllerMessenger.subscribe(
        `${pc.name}:stateChange`,
        (subjectWithPermission: any) => {
          DevLogger.log(
            `PermissionController:stateChange event`,
            subjectWithPermission,
          );
          // Inform dapp about updated permissions
          const selectedAddress = this.getState().selectedAddress;
          this.notifySelectedAddressChanged(selectedAddress);
        },
        (state: any) => state.subjects[this.channelId as string],
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

  getProviderNetworkState(): { networkVersion: string; chainId: string } {
    const providerConfig = selectProviderConfig(store.getState());
    const networkType = providerConfig.type;

    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let chainId: string;

    if (isInitialNetwork && networkType in ChainId) {
      chainId = ChainId[networkType as keyof typeof ChainId];
    } else if (networkType === 'rpc') {
      chainId = providerConfig.chainId || '';
    } else {
      chainId = '';
    }
    if (chainId && !chainId.startsWith('0x')) {
      // Convert to hex
      chainId = `0x${parseInt(chainId, 10).toString(16)}`;
    }

    const result = {
      networkVersion: legacyNetworkId(),
      chainId: chainId || '0x0', // Ensure chainId is always a string
    };
    return result;
  }

  notifyChainChanged(params: { networkVersion: string; chainId: string }): void {
    DevLogger.log(`notifyChainChanged: `, params);
    this.sendNotification({
      method: NOTIFICATION_NAMES.chainChanged,
      params,
    });
  }

  async notifySelectedAddressChanged(selectedAddress: string): Promise<void> {
    try {
      let approvedAccounts: string[] = [];
      DevLogger.log(
        `notifySelectedAddressChanged: ${selectedAddress} wc=${this.isWalletConnect} url=${this.url}`,
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
      }
      DevLogger.log(
        `notifySelectedAddressChanged url: ${this.url} hostname: ${this.hostname}: ${selectedAddress}`,
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

  onStateUpdate(memState: Partial<ReturnType<BackgroundBridge['getState']>>) {
    if (!memState) {
      memState = this.getState();
    }
    const publicState = this.getProviderNetworkState();

    // Check if update already sent
    if (
      this.chainIdSent !== publicState.chainId ||
      (this.networkVersionSent !== publicState.networkVersion &&
        publicState.networkVersion !== NETWORK_ID_LOADING)
    ) {
      this.chainIdSent = publicState.chainId;
      this.networkVersionSent = publicState.networkVersion;
      this.notifyChainChanged(publicState);
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

  getProviderState() {
    return {
      isUnlocked: this.isUnlocked(),
      ...this.getProviderNetworkState(),
    };
  }

  sendStateUpdate = () => {
    this.emit('update');
  };

  onMessage = (msg: { name: string; data: any }): void => {
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
   * @param outStream - The stream to provide over.
   */
  setupProviderConnection(outStream: any): void {
    this.engine = this.setupProviderEngine();

    // setup connection
    const providerStream = createEngineStream({ engine: this.engine });

    pump(outStream, providerStream, outStream, (err: Error | null) => {
      // handle any middleware cleanup
      this.engine._middleware.forEach((mid: any) => {
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
    subscriptionManager.events.on('notification', (message: unknown) =>
      engine.emit('notification', message),
    );

    // metadata
    engine.push(createOriginMiddleware({ origin }) as JsonRpcMiddleware<unknown, unknown>);
    engine.push(createLoggerMiddleware({ origin }) as JsonRpcMiddleware<unknown, unknown>);
    // filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);

    // Handle unsupported RPC Methods
    engine.push(createUnsupportedMethodMiddleware() as JsonRpcMiddleware<unknown, unknown>);

    // Legacy RPC methods that need to be implemented ahead of the permission middleware
    engine.push(
      createLegacyMethodMiddleware({
        getAccounts: async () => {
          const accountOrigin = this.isMMSDK && this.channelId ? this.channelId : origin;
          return await getPermittedAccounts(accountOrigin);
        },
      }) as JsonRpcMiddleware<unknown, unknown>,
    );

    // Append PermissionController middleware
    engine.push(
      Engine.context.PermissionController.createPermissionMiddleware({
        // FIXME: This condition exists so that both WC and SDK are compatible with the permission middleware.
        // This is not a long term solution. BackgroundBridge should be not contain hardcoded logic pertaining to WC, SDK, or browser.
        origin: this.isMMSDK ? this.channelId ?? '' : origin,
      }) as JsonRpcMiddleware<unknown, unknown>,
    );

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    // Snaps middleware
    engine.push(
      snapMethodMiddlewareBuilder(
        Engine.context,
        Engine.controllerMessenger,
        origin,
        // We assume that origins connecting through the BackgroundBridge are websites
        SubjectType.Website,
      ) as JsonRpcMiddleware<unknown, unknown>,
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

  sendNotification(payload: unknown): void {
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
      network: legacyNetworkId(),
      selectedAddress,
    };
  }
}

export default BackgroundBridge;
