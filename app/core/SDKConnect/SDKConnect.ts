import {
  AppState,
  NativeEventSubscription,
  NativeModules,
  Platform,
} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../../util/Logger';
import Device from '../../util/device';
import AppConstants from '../AppConstants';
import Engine from '../Engine';

import { KeyringController } from '@metamask/keyring-controller';
import {
  ConnectionStatus,
  EventType,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';
import { NavigationContainerRef } from '@react-navigation/native';
import { EventEmitter2 } from 'eventemitter2';
import Routes from '../../../app/constants/navigation/Routes';
import AndroidService from './AndroidSDK/AndroidService';
import { Connection, ConnectionProps, RPC_METHODS } from './Connection';
import RPCQueueManager from './RPCQueueManager';
import DevLogger from './utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from './utils/wait.util';

export const MIN_IN_MS = 1000 * 60;
export const HOUR_IN_MS = MIN_IN_MS * 60;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const DEFAULT_SESSION_TIMEOUT_MS = 30 * DAY_IN_MS;

export interface ConnectedSessions {
  [id: string]: Connection;
}

export interface SDKSessions {
  [chanelId: string]: ConnectionProps;
}

export interface ApprovedHosts {
  [host: string]: number;
}

export interface approveHostProps {
  host: string;
  hostname: string;
  context?: string;
}

export const TIMEOUT_PAUSE_CONNECTIONS = 25000;

export type SDKEventListener = (event: string) => void;

export const CONNECTION_LOADING_EVENT = 'loading';

export const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
  [RPC_METHODS.ETH_REQUESTACCOUNTS]: true,
  [RPC_METHODS.ETH_SENDTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGNTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGN]: true,
  [RPC_METHODS.PERSONAL_SIGN]: true,
  [RPC_METHODS.ETH_SIGNTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGNTYPEDEATAV3]: true,
  [RPC_METHODS.ETH_SIGNTYPEDEATAV4]: true,
  [RPC_METHODS.WALLET_WATCHASSET]: true,
  [RPC_METHODS.WALLET_ADDETHEREUMCHAIN]: true,
  [RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN]: true,
  [RPC_METHODS.METAMASK_CONNECTSIGN]: true,
  [RPC_METHODS.METAMASK_BATCH]: true,
};

export const METHODS_TO_DELAY: { [method: string]: boolean } = {
  ...METHODS_TO_REDIRECT,
  [RPC_METHODS.ETH_REQUESTACCOUNTS]: false,
};

export class SDKConnect extends EventEmitter2 {
  private static instance: SDKConnect;

  private navigation?: NavigationContainerRef;
  private reconnected = false;

  // Track init status to ensure connection recovery priority and prevent double initialization.
  private _initialized = false;
  private _initializing = false;
  private _postInitialized = false;
  private _postInitializing = false;

  private timeout?: number;
  private initTimeout?: number;
  private paused = false;
  private appState?: string;
  private connected: ConnectedSessions = {};
  private connections: SDKSessions = {};
  private androidSDKStarted = false;
  private androidSDKBound = false;
  private androidService?: AndroidService;
  private connecting: { [channelId: string]: boolean } = {};
  private approvedHosts: ApprovedHosts = {};
  private sdkLoadingState: { [channelId: string]: boolean } = {};
  // Contains the list of hosts that have been set to not persist "Do Not Remember" on account approval modal.
  // This should only affect web connection from qr-code.
  private disabledHosts: ApprovedHosts = {};
  private rpcqueueManager = new RPCQueueManager();
  private appStateListener: NativeEventSubscription | undefined;

  private SDKConnect() {
    // Keep empty to manage singleton
  }

  public async connectToChannel({
    id,
    otherPublicKey,
    origin,
  }: ConnectionProps) {
    const existingConnection = this.connected[id] !== undefined;
    const isReady = existingConnection && this.connected[id].isReady;

    DevLogger.log(
      `SDKConnect::connectToChannel id=${id} isReady=${isReady} existingConnection=${existingConnection}`,
    );

    if (isReady) {
      DevLogger.log(
        `SDKConnect::connectToChannel - INTERRUPT  - already ready`,
      );
      // Nothing to do, already connected.
      return;
    }

    // Check if it was previously paused so that it first resume connection.
    if (existingConnection && !this.paused) {
      DevLogger.log(
        `SDKConnect::connectToChannel -- CONNECTION SEEMS TO EXISTS ? --`,
      );
      // if paused --- wait for resume --- otherwise reconnect.
      await this.reconnect({
        channelId: id,
        initialConnection: false,
        otherPublicKey:
          this.connected[id].remote.getKeyInfo()?.ecies.otherPubKey ?? '',
        context: 'connectToChannel',
      });
      return;
    } else if (existingConnection && this.paused) {
      DevLogger.log(
        `SDKConnect::connectToChannel - INTERRUPT - connection is paused`,
      );
      return;
    }

    this.connecting[id] = true;
    const initialConnection = this.approvedHosts[id] === undefined;

    this.connections[id] = {
      id,
      otherPublicKey,
      origin,
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
      lastAuthorized: initialConnection ? 0 : this.approvedHosts[id],
    };

    DevLogger.log(`SDKConnect connections[${id}]`, this.connections[id]);

    this.connected[id] = new Connection({
      ...this.connections[id],
      initialConnection,
      rpcQueueManager: this.rpcqueueManager,
      updateOriginatorInfos: this.updateOriginatorInfos.bind(this),
      approveHost: this._approveHost.bind(this),
      disapprove: this.disapproveChannel.bind(this),
      getApprovedHosts: this.getApprovedHosts.bind(this),
      revalidate: this.revalidateChannel.bind(this),
      isApproved: this.isApproved.bind(this),
      onTerminate: ({
        channelId,
        sendTerminate,
      }: {
        channelId: string;
        sendTerminate?: boolean;
      }) => {
        this.removeChannel(channelId, sendTerminate);
      },
    });
    // Make sure to watch event before you connect
    this.watchConnection(this.connected[id]);
    await DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.connections),
    );
    // Initialize connection
    this.connected[id].connect({
      withKeyExchange: true,
    });
    this.connecting[id] = false;
    this.emit('refresh');
  }

  private watchConnection(connection: Connection) {
    connection.remote.on(
      EventType.CONNECTION_STATUS,
      (connectionStatus: ConnectionStatus) => {
        if (connectionStatus === ConnectionStatus.TERMINATED) {
          this.removeChannel(connection.channelId);
        }
      },
    );

    connection.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
      const host = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + connection.channelId;
      // Prevent disabled connection ( if user chose do not remember session )
      const isDisabled = this.disabledHosts[host]; // should be 0 when disabled.
      DevLogger.log(
        `SDKConnect::watchConnection CLIENTS_DISCONNECTED channel=${connection.channelId} origin=${connection.origin} isDisabled=${isDisabled}`,
      );
      if (isDisabled !== undefined) {
        this.updateSDKLoadingState({
          channelId: connection.channelId,
          loading: false,
        }).catch((err) => {
          Logger.log(
            err,
            `SDKConnect::watchConnection can't update SDK loading state`,
          );
        });
        // Force terminate connection since it was disabled (do not remember)
        this.removeChannel(connection.channelId, true);
      }
    });

    connection.on(CONNECTION_LOADING_EVENT, (event: { loading: boolean }) => {
      const channelId = connection.channelId;
      const { loading } = event;
      this.updateSDKLoadingState({ channelId, loading }).catch((err) => {
        Logger.log(
          err,
          `SDKConnect::watchConnection can't update SDK loading state`,
        );
      });
    });
  }

  public async updateSDKLoadingState({
    channelId,
    loading,
  }: {
    channelId: string;
    loading: boolean;
  }) {
    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    await waitForKeychainUnlocked({
      keyringController,
      context: 'updateSDKLoadingState',
    });

    if (loading === true) {
      this.sdkLoadingState[channelId] = true;
    } else {
      delete this.sdkLoadingState[channelId];
    }

    const loadingSessions = Object.keys(this.sdkLoadingState).length;
    if (loadingSessions > 0) {
      this.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_LOADING,
      });
    } else {
      const currentRoute = this.navigation?.getCurrentRoute()?.name;
      if (currentRoute === Routes.SHEET.SDK_LOADING) {
        this.navigation?.goBack();
      }
    }
  }

  public async hideLoadingState() {
    this.sdkLoadingState = {};
    const currentRoute = this.navigation?.getCurrentRoute()?.name;
    if (currentRoute === Routes.SHEET.SDK_LOADING) {
      this.navigation?.goBack();
    }
  }

  public updateOriginatorInfos({
    channelId,
    originatorInfo,
  }: {
    channelId: string;
    originatorInfo: OriginatorInfo;
  }) {
    if (!this.connections[channelId]) {
      console.warn(`SDKConnect::updateOriginatorInfos - no connection`);
      return;
    }

    this.connections[channelId].originatorInfo = originatorInfo;
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.connections),
    ).catch((err) => {
      throw err;
    });
    this.emit('refresh');
  }

  public async resume({ channelId }: { channelId: string }) {
    const session = this.connected[channelId]?.remote;

    DevLogger.log(
      `SDKConnect::resume channel=${channelId} session=${session} paused=${session.isPaused()} connected=${session?.isConnected()} connecting=${
        this.connecting[channelId]
      }`,
    );
    if (session && !session?.isConnected() && !this.connecting[channelId]) {
      this.connected[channelId].resume();
      DevLogger.log(
        `SDKConnect::_handleAppState - done resuming: direct: ${this.connected[
          channelId
        ].remote.isConnected()}`,
      );
      if (Platform.OS === 'android') {
        // Android needs time to update socket status after resuming.
        await wait(500);
        DevLogger.log(
          `SDKConnect::_handleAppState - done resuming: after: ${this.connected[
            channelId
          ].remote.isConnected()}`,
        );
      }
    }
  }

  async reconnect({
    channelId,
    otherPublicKey,
    initialConnection,
    updateKey,
    context,
  }: {
    channelId: string;
    otherPublicKey: string;
    context?: string;
    updateKey?: boolean;
    initialConnection: boolean;
  }) {
    const existingConnection = this.connected[channelId];

    if (this.paused && updateKey) {
      this.connections[channelId].otherPublicKey = otherPublicKey;
      const currentOtherPublicKey = this.connections[channelId].otherPublicKey;
      if (currentOtherPublicKey !== otherPublicKey) {
        console.warn(
          `SDKConnect::reconnect[${context}] existing=${
            existingConnection !== undefined
          } - update otherPublicKey -  ${currentOtherPublicKey} --> ${otherPublicKey}`,
        );
        if (existingConnection) {
          existingConnection.remote.setOtherPublicKey(otherPublicKey);
        }
      } else {
        DevLogger.log(
          `SDKConnect::reconnect[${context}] - same otherPublicKey`,
        );
      }
    }

    // Make sure the connection has resumed from pause before reconnecting.
    await waitForCondition({
      fn: () => !this.paused,
      context: 'reconnect_from_pause',
    });
    const connecting = this.connecting[channelId] === true;
    const socketConnected = existingConnection?.remote.isConnected() ?? false;

    DevLogger.log(
      `SDKConnect::reconnect[${context}] - channel=${channelId} paused=${
        this.paused
      } connecting=${connecting} socketConnected=${socketConnected} existingConnection=${
        existingConnection !== undefined
      }`,
      otherPublicKey,
    );

    let interruptReason = '';

    if (connecting) {
      interruptReason = 'already connecting';
    }

    if (!this.connections[channelId]) {
      interruptReason = 'no connection';
    }

    if (interruptReason) {
      DevLogger.log(
        `SDKConnect::reconnect - interrupting reason=${interruptReason}`,
      );
      return;
    }

    if (existingConnection) {
      const connected = existingConnection?.remote.isConnected();
      const ready = existingConnection?.isReady;
      if (connected) {
        DevLogger.log(
          `SDKConnect::reconnect - already connected [ready=${ready}] -- ignoring`,
        );
        return;
      }
    }

    DevLogger.log(`SDKConnect::reconnect - starting reconnection`);

    const connection = this.connections[channelId];
    this.connecting[channelId] = true;
    this.connected[channelId] = new Connection({
      ...connection,
      otherPublicKey,
      reconnect: true,
      initialConnection,
      rpcQueueManager: this.rpcqueueManager,
      approveHost: this._approveHost.bind(this),
      disapprove: this.disapproveChannel.bind(this),
      getApprovedHosts: this.getApprovedHosts.bind(this),
      revalidate: this.revalidateChannel.bind(this),
      isApproved: this.isApproved.bind(this),
      updateOriginatorInfos: this.updateOriginatorInfos.bind(this),
      // eslint-disable-next-line @typescript-eslint/no-shadow
      onTerminate: ({ channelId }) => {
        this.removeChannel(channelId);
      },
    });
    this.connected[channelId].connect({
      withKeyExchange: true,
    });
    this.watchConnection(this.connected[channelId]);
    const afterConnected =
      this.connected[channelId].remote.isConnected() ?? false;
    this.connecting[channelId] = !afterConnected; // If not connected, it means it's connecting.
    this.emit('refresh');
  }

  async reconnectAll() {
    DevLogger.log(
      `SDKConnect::reconnectAll paused=${this.paused} reconnected=${this.reconnected}`,
    );

    if (this.reconnected) {
      DevLogger.log(`SDKConnect::reconnectAll - already reconnected`);
      return;
    }

    const channelIds = Object.keys(this.connections);
    channelIds.forEach((channelId) => {
      if (channelId) {
        this.reconnect({
          channelId,
          otherPublicKey: this.connections[channelId].otherPublicKey,
          initialConnection: false,
          context: 'reconnectAll',
        }).catch((err) => {
          Logger.log(
            err,
            `SDKConnect::reconnectAll error reconnecting to ${channelId}`,
          );
        });
      }
    });
    this.reconnected = true;
    DevLogger.log(`SDKConnect::reconnectAll - done`);
  }

  setSDKSessions(sdkSessions: SDKSessions) {
    this.connections = sdkSessions;
  }

  public pause() {
    if (this.paused) return;

    for (const id in this.connected) {
      DevLogger.log(`SDKConnect::pause - pausing ${id}`);
      this.connected[id].pause();
      // check for paused status?
      DevLogger.log(
        `SDKConnect::pause - done - paused=${this.connected[
          id
        ].remote.isPaused()}`,
      );
    }
    this.paused = true;
    this.connecting = {};

    this.rpcqueueManager.reset();
  }

  public async bindAndroidSDK() {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Always bind native module to client during deeplinks otherwise connection may have an invalid status
      await NativeModules.CommunicationClient.bindService();
      this.androidSDKBound = true;
    } catch (err) {
      if (this.androidSDKBound) return;
      Logger.log(err, `SDKConnect::bindAndroiSDK failed`);
    }
  }

  public isAndroidSDKBound() {
    return this.androidSDKBound;
  }

  async loadAndroidConnections(): Promise<{
    [id: string]: ConnectionProps;
  }> {
    const rawConnections = await DefaultPreference.get(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
    );

    if (!rawConnections) return {};

    const parsed = JSON.parse(rawConnections);
    DevLogger.log(
      `SDKConnect::loadAndroidConnections found ${Object.keys(parsed).length}`,
    );
    return parsed;
  }

  async addAndroidConnection(connection: ConnectionProps) {
    this.connections[connection.id] = connection;
    DevLogger.log(`SDKConnect::addAndroidConnection`, connection);
    await DefaultPreference.set(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
      JSON.stringify(this.connections),
    ).catch((err) => {
      throw err;
    });
    this.emit('refresh');
  }

  removeAndroidConnection(id: string) {
    delete this.connections[id];
    DefaultPreference.set(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
      JSON.stringify(this.connections),
    ).catch((err) => {
      throw err;
    });
    this.emit('refresh');
  }

  /**
   * Invalidate a channel/session by preventing future connection to be established.
   * Instead of removing the channel, it sets the session to timeout on next
   * connection which will remove it while conitnuing current session.
   *
   * @param channelId
   */
  public invalidateChannel({ channelId }: { channelId: string }) {
    const host = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    this.disabledHosts[host] = 0;
    delete this.approvedHosts[host];
    delete this.connecting[channelId];
    delete this.connections[channelId];
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(this.approvedHosts),
    ).catch((err) => {
      throw err;
    });
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.connections),
    ).catch((err) => {
      throw err;
    });
  }

  public removeChannel(channelId: string, sendTerminate?: boolean) {
    DevLogger.log(
      `SDKConnect::removeChannel ${channelId} sendTerminate=${sendTerminate} connectedted=${
        this.connected[channelId] !== undefined
      }`,
    );
    if (this.connected[channelId]) {
      try {
        this.connected[channelId].removeConnection({
          terminate: sendTerminate ?? false,
          context: 'SDKConnect::removeChannel',
        });
      } catch (err) {
        // Ignore error
      }

      delete this.connected[channelId];
      delete this.connections[channelId];
      delete this.connecting[channelId];
      delete this.approvedHosts[
        AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
      ];
      delete this.disabledHosts[
        AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
      ];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(this.connections),
      ).catch((err) => {
        throw err;
      });
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(this.approvedHosts),
      ).catch((err) => {
        throw err;
      });
    }
    this.emit('refresh');
  }

  public async removeAll() {
    for (const id in this.connections) {
      this.removeChannel(id, true);
    }
    // Also remove approved hosts that may have been skipped.
    this.approvedHosts = {};
    this.disabledHosts = {};
    this.connections = {};
    this.connected = {};
    this.connecting = {};
    this.paused = false;
    await DefaultPreference.clear(AppConstants.MM_SDK.SDK_CONNECTIONS);
    await DefaultPreference.clear(AppConstants.MM_SDK.SDK_APPROVEDHOSTS);
  }

  public getConnected() {
    return this.connected;
  }

  public getConnections() {
    return this.connections;
  }

  public getApprovedHosts(_context?: string) {
    return this.approvedHosts || {};
  }

  public disapproveChannel(channelId: string) {
    const hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    this.connections[channelId].lastAuthorized = 0;
    delete this.approvedHosts[hostname];
  }

  public async revalidateChannel({ channelId }: { channelId: string }) {
    const hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    this._approveHost({
      host: hostname,
      hostname,
      context: 'revalidateChannel',
    });
  }

  public isApproved({ channelId }: { channelId: string; context?: string }) {
    const hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    const isApproved = this.approvedHosts[hostname] !== undefined;
    // possible future feature to add multiple approval parameters per channel.
    return isApproved;
  }

  private _approveHost({ host }: approveHostProps) {
    const channelId = host.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '');
    if (this.disabledHosts[host]) {
      // Might be useful for future feature.
    } else {
      const approvedUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS;
      this.approvedHosts[host] = approvedUntil;
      DevLogger.log(`SDKConnect approveHost ${host}`, this.approvedHosts);
      if (this.connections[channelId]) {
        this.connections[channelId].lastAuthorized = approvedUntil;
      }
      if (this.connected[channelId]) {
        this.connected[channelId].lastAuthorized = approvedUntil;
      }
      // Prevent disabled hosts from being persisted.
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(this.approvedHosts),
      ).catch((err) => {
        throw err;
      });
    }
    this.emit('refresh');
  }

  private async _handleAppState(appState: string) {
    // Prevent double handling same app state
    if (this.appState === appState) {
      DevLogger.log(
        `SDKConnect::_handleAppState - SKIP - same appState ${appState}`,
      );
      return;
    }

    DevLogger.log(`SDKConnect::_handleAppState appState=${appState}`);
    this.appState = appState;
    if (appState === 'active') {
      if (Device.isAndroid()) {
        if (this.timeout) BackgroundTimer.clearInterval(this.timeout);
      } else if (this.timeout) clearTimeout(this.timeout);
      this.timeout = undefined;

      if (this.paused) {
        // Reset connecting status when reconnecting from deeplink.
        const hasConnecting = Object.keys(this.connecting).length > 0;
        if (hasConnecting) {
          console.warn(
            `SDKConnect::_handleAppState - resuming from pause - reset connecting status`,
          );
        }
        this.connecting = {};
        const connectCount = Object.keys(this.connected).length;
        if (connectCount > 0) {
          // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
          await wait(1500);
          DevLogger.log(
            `SDKConnect::_handleAppState - resuming ${connectCount} connections`,
          );
          for (const id in this.connected) {
            try {
              await this.resume({ channelId: id });
            } catch (err) {
              // Ignore error, just log it.
              Logger.log(
                err,
                `SDKConnect::_handleAppState - can't resume ${id}`,
              );
            }
          }
        }
      }
      this.paused = false;
    } else if (appState === 'background') {
      if (!this.paused) {
        /**
         * Pause connections after 20 seconds of the app being in background to respect device resources.
         * Also, OS closes the app if after 30 seconds, the connections are still open.
         */
        if (Device.isIos()) {
          BackgroundTimer.start();
          this.timeout = setTimeout(() => {
            this.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS) as unknown as number;
          BackgroundTimer.stop();
        } else if (Device.isAndroid()) {
          this.timeout = BackgroundTimer.setTimeout(() => {
            this.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS);
          // TODO manage interval clearTimeout
        }
      }
    }
  }

  public async unmount() {
    Logger.log(`SDKConnect::unmount()`);
    try {
      this.appStateListener?.remove();
    } catch (err) {
      // Ignore if already removed
    }
    for (const id in this.connected) {
      this.connected[id].disconnect({ terminate: false, context: 'unmount' });
    }

    if (Device.isAndroid()) {
      if (this.timeout) BackgroundTimer.clearInterval(this.timeout);
    } else if (this.timeout) clearTimeout(this.timeout);
    if (this.initTimeout) clearTimeout(this.initTimeout);
    this.timeout = undefined;
    this.initTimeout = undefined;
    this._initialized = false;
    this.approvedHosts = {};
    this.disabledHosts = {};
    this.connections = {};
    this.connected = {};
    this.connecting = {};
  }

  getSessionsStorage() {
    return this.connections;
  }

  public async init({
    navigation,
  }: {
    checkUserLoggedIn: () => boolean;
    navigation: NavigationContainerRef;
  }) {
    if (this._initializing) {
      DevLogger.log(
        `SDKConnect::init() -- already initializing -- wait for completion`,
      );
      // Wait for initialization to finish.
      await waitForCondition({
        fn: () => this._initialized,
        context: 'init',
      });
      DevLogger.log(`SDKConnect::init() -- done waiting for initialization`);
      return;
    } else if (this._initialized) {
      DevLogger.log(
        `SDKConnect::init() -- SKIP -- already initialized`,
        this.connections,
      );
      return;
    }

    // Change _initializing status at the beginning to prevent double initialization during dev.
    this._initializing = true;
    this.navigation = navigation;
    DevLogger.log(`SDKConnect::init() - starting`);

    // Ignore initial call to _handleAppState since it is first initialization.
    this.appState = 'active';

    if (!this.androidSDKStarted && Platform.OS === 'android') {
      this.androidService = new AndroidService();
      this.androidSDKStarted = true;
    }

    const [connectionsStorage, hostsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
      DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
    ]);

    if (connectionsStorage) {
      this.connections = JSON.parse(connectionsStorage);
      DevLogger.log(
        `SDKConnect::init() - connections [${
          Object.keys(this.connections).length
        }]`,
      );
    }

    if (hostsStorage) {
      const uncheckedHosts = JSON.parse(hostsStorage) as ApprovedHosts;
      // Check if the approved hosts haven't timed out.
      const approvedHosts: ApprovedHosts = {};
      let expiredCounter = 0;
      for (const host in uncheckedHosts) {
        const expirationTime = uncheckedHosts[host];
        if (Date.now() < expirationTime) {
          // Host is valid, add it to the list.
          approvedHosts[host] = expirationTime;
        } else {
          expiredCounter += 1;
        }
      }
      if (expiredCounter > 1) {
        // Update the list of approved hosts excluding the expired ones.
        DefaultPreference.set(
          AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
          JSON.stringify(approvedHosts),
        ).catch((err) => {
          throw err;
        });
      }
      this.approvedHosts = approvedHosts;
      DevLogger.log(
        `SDKConnect::init() - approvedHosts [${
          Object.keys(this.approvedHosts).length
        }]`,
      );
    }

    DevLogger.log(`SDKConnect::init() - done`);
    this._initialized = true;
  }

  async postInit() {
    if (!this._initialized) {
      throw new Error(`SDKConnect::postInit() - not initialized`);
    }

    if (this._postInitializing) {
      DevLogger.log(
        `SDKConnect::postInit() -- already doing post init -- wait for completion`,
      );
      // Wait for initialization to finish.
      await waitForCondition({
        fn: () => this._postInitialized,
        context: 'post_init',
      });
      DevLogger.log(
        `SDKConnect::postInit() -- done waiting for post initialization`,
      );
      return;
    } else if (this._postInitialized) {
      DevLogger.log(
        `SDKConnect::postInit() -- SKIP -- already post initialized`,
      );
      return;
    }

    this._postInitializing = true;

    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    DevLogger.log(
      `SDKConnect::postInit() - check keychain unlocked=${keyringController.isUnlocked()}`,
    );

    await waitForKeychainUnlocked({ keyringController, context: 'init' });
    this.appStateListener = AppState.addEventListener(
      'change',
      this._handleAppState.bind(this),
    );

    // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
    await wait(2000);
    await this.reconnectAll();

    this._postInitialized = true;
    DevLogger.log(`SDKConnect::postInit() - done`);
  }

  hasInitialized() {
    return this._initialized;
  }

  public static getInstance(): SDKConnect {
    if (!SDKConnect.instance) {
      SDKConnect.instance = new SDKConnect();
    }
    return SDKConnect.instance;
  }
}

export default SDKConnect;
