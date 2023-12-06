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
import { Connection, ConnectionProps } from './Connection';
import RPCQueueManager from './RPCQueueManager';
import {
  CONNECTION_LOADING_EVENT,
  DEFAULT_SESSION_TIMEOUT_MS,
  TIMEOUT_PAUSE_CONNECTIONS,
} from './SDKConnect.constants';
import DevLogger from './utils/DevLogger';
import {
  wait,
  waitForCondition,
  waitForKeychainUnlocked,
} from './utils/wait.util';

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

export interface SDKConnectState {
  navigation?: NavigationContainerRef;
  reconnected: boolean;

  // Track init status to ensure connection recovery priority and prevent double initialization.
  _initialized: boolean;
  _initializing?: Promise<unknown>;
  _postInitialized: boolean;
  _postInitializing: boolean;

  timeout?: number;
  initTimeout?: number;
  paused: boolean;
  appState?: string;
  connected: ConnectedSessions;
  connections: SDKSessions;
  androidSDKStarted: boolean;
  androidSDKBound: boolean;
  androidService?: AndroidService;
  connecting: { [channelId: string]: boolean };
  approvedHosts: ApprovedHosts;
  sdkLoadingState: { [channelId: string]: boolean };
  // Contains the list of hosts that have been set to not persist "Do Not Remember" on account approval modal.
  // This should only affect web connection from qr-code.
  disabledHosts: ApprovedHosts;
  rpcqueueManager: RPCQueueManager;
  appStateListener: NativeEventSubscription | undefined;
  socketServerUrl: string; // Allow to customize different socket server url
}

export type SDKEventListener = (event: string) => void;

export class SDKConnect extends EventEmitter2 {
  private static instance: SDKConnect;

  public state: SDKConnectState = {
    navigation: undefined,
    reconnected: false,
    _initialized: false,
    _initializing: undefined,
    _postInitialized: false,
    _postInitializing: false,
    timeout: undefined,
    initTimeout: undefined,
    paused: false,
    appState: undefined,
    connected: {},
    connections: {},
    androidSDKStarted: false,
    androidSDKBound: false,
    androidService: undefined,
    connecting: {},
    approvedHosts: {},
    sdkLoadingState: {},
    disabledHosts: {},
    rpcqueueManager: new RPCQueueManager(),
    appStateListener: undefined,
    socketServerUrl: AppConstants.MM_SDK.SERVER_URL,
  };

  private SDKConnect() {
    // Keep empty to manage singleton
  }

  public async connectToChannel({
    id,
    trigger,
    otherPublicKey,
    origin,
    validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
  }: ConnectionProps) {
    const existingConnection = this.state.connected[id] !== undefined;
    const isReady = existingConnection && this.state.connected[id].isReady;

    DevLogger.log(
      `SDKConnect::connectToChannel id=${id} trigger=${trigger} isReady=${isReady} existingConnection=${existingConnection}`,
    );

    if (isReady) {
      DevLogger.log(
        `SDKConnect::connectToChannel - INTERRUPT  - already ready`,
      );
      // Nothing to do, already connected.
      return;
    }

    // Check if it was previously paused so that it first resume connection.
    if (existingConnection && !this.state.paused) {
      DevLogger.log(
        `SDKConnect::connectToChannel -- CONNECTION SEEMS TO EXISTS ? --`,
      );
      // if paused --- wait for resume --- otherwise reconnect.
      await this.reconnect({
        channelId: id,
        initialConnection: false,
        trigger,
        otherPublicKey:
          this.state.connected[id].remote.getKeyInfo()?.ecies.otherPubKey ?? '',
        context: 'connectToChannel',
      });
      return;
    } else if (existingConnection && this.state.paused) {
      DevLogger.log(
        `SDKConnect::connectToChannel - INTERRUPT - connection is paused`,
      );
      return;
    }

    this.state.connecting[id] = true;
    const initialConnection = this.state.approvedHosts[id] === undefined;

    this.state.connections[id] = {
      id,
      otherPublicKey,
      origin,
      validUntil,
      lastAuthorized: initialConnection ? 0 : this.state.approvedHosts[id],
    };

    DevLogger.log(`SDKConnect connections[${id}]`, this.state.connections[id]);

    this.state.connected[id] = new Connection({
      ...this.state.connections[id],
      socketServerUrl: this.state.socketServerUrl,
      initialConnection,
      trigger,
      rpcQueueManager: this.state.rpcqueueManager,
      navigation: this.state.navigation,
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
    this.watchConnection(this.state.connected[id]);
    await DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.state.connections),
    );
    // Initialize connection
    this.state.connected[id].connect({
      withKeyExchange: true,
    });
    this.state.connecting[id] = false;
    this.emit('refresh');
  }

  public watchConnection(connection: Connection) {
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
      const isDisabled = this.state.disabledHosts[host]; // should be 0 when disabled.
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
    if (loading === true) {
      this.state.sdkLoadingState[channelId] = true;
    } else {
      delete this.state.sdkLoadingState[channelId];
    }

    const loadingSessionsLen = Object.keys(this.state.sdkLoadingState).length;
    DevLogger.log(
      `SDKConnect::updateSDKLoadingState channel=${channelId} loading=${loading} loadingSessions=${loadingSessionsLen}`,
    );
    if (loadingSessionsLen > 0) {
      // Prevent loading state from showing if keychain is locked.
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({
        keyringController,
        context: 'updateSDKLoadingState',
      });

      this.state.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_LOADING,
      });
    } else {
      await this.hideLoadingState();
    }
  }

  public async hideLoadingState() {
    this.state.sdkLoadingState = {};
    const currentRoute = this.state.navigation?.getCurrentRoute()?.name;
    if (
      currentRoute === Routes.SHEET.SDK_LOADING &&
      this.state.navigation?.canGoBack()
    ) {
      this.state.navigation?.goBack();
    }
  }

  public updateOriginatorInfos({
    channelId,
    originatorInfo,
  }: {
    channelId: string;
    originatorInfo: OriginatorInfo;
  }) {
    if (!this.state.connections[channelId]) {
      console.warn(`SDKConnect::updateOriginatorInfos - no connection`);
      return;
    }

    this.state.connections[channelId].originatorInfo = originatorInfo;
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.state.connections),
    ).catch((err) => {
      throw err;
    });
    this.emit('refresh');
  }

  public async resume({ channelId }: { channelId: string }) {
    const session = this.state.connected[channelId]?.remote;
    const alreadyResumed = this.state.connected[channelId].isResumed ?? false;

    DevLogger.log(
      `SDKConnect::resume channel=${channelId} alreadyResumed=${alreadyResumed} session=${session} paused=${session.isPaused()} connected=${session?.isConnected()} connecting=${
        this.state.connecting[channelId]
      }`,
    );
    if (
      session &&
      !session?.isConnected() &&
      !alreadyResumed &&
      !this.state.connecting[channelId]
    ) {
      this.state.connected[channelId].resume();
      await wait(500); // Some devices (especially android) need time to update socket status after resuming.
      DevLogger.log(
        `SDKConnect::_handleAppState - done resuming - socket_connected=${this.state.connected[
          channelId
        ].remote.isConnected()}`,
      );
    } else {
      DevLogger.log(
        `SDKConnect::_handleAppState - SKIP - connection.resumed=${this.state.connected[channelId]?.isResumed}`,
      );
    }
  }

  async reconnect({
    channelId,
    otherPublicKey,
    initialConnection,
    trigger,
    updateKey,
    context,
  }: {
    channelId: string;
    otherPublicKey: string;
    context?: string;
    updateKey?: boolean;
    trigger?: ConnectionProps['trigger'];
    initialConnection: boolean;
  }) {
    const existingConnection: Connection | undefined =
      this.state.connected[channelId];

    // Check if already connected
    if (existingConnection?.remote.isReady()) {
      DevLogger.log(
        `SDKConnect::reconnect[${context}] - already ready - ignore`,
      );
      if (trigger) {
        this.state.connected[channelId].setTrigger('deeplink');
      }

      return;
    }

    if (this.state.paused && updateKey) {
      this.state.connections[channelId].otherPublicKey = otherPublicKey;
      const currentOtherPublicKey =
        this.state.connections[channelId].otherPublicKey;
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

    const wasPaused = existingConnection?.remote.isPaused();
    // Make sure the connection has resumed from pause before reconnecting.
    await waitForCondition({
      fn: () => !this.state.paused,
      context: 'reconnect_from_pause',
    });
    if (wasPaused) {
      DevLogger.log(`SDKConnect::reconnect[${context}] - not paused anymore`);
    }
    const connecting = this.state.connecting[channelId] === true;
    const socketConnected = existingConnection?.remote.isConnected() ?? false;

    DevLogger.log(
      `SDKConnect::reconnect[${context}][${trigger}] - channel=${channelId} paused=${
        this.state.paused
      } connecting=${connecting} socketConnected=${socketConnected} existingConnection=${
        existingConnection !== undefined
      }`,
      otherPublicKey,
    );

    let interruptReason = '';

    if (connecting && trigger !== 'deeplink') {
      // Prioritize deeplinks -- interrup other connection attempts.
      interruptReason = 'already connecting';
    } else if (connecting && trigger === 'deeplink') {
      // Keep comment for future reference in case android issue re-surface
      // special case on android where the socket was not updated
      // if (Platform.OS === 'android') {
      //   interruptReason = 'already connecting';
      // } else {
      //   console.warn(`Priotity to deeplink - overwrite previous connection`);
      //   this.removeChannel(channelId, true);
      // }

      // This condition should not happen keeping it for debug purpose.
      console.warn(`Priotity to deeplink - overwrite previous connection`);
      this.removeChannel(channelId, true);
    }

    if (!this.state.connections[channelId]) {
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
        if (trigger) {
          this.state.connected[channelId].setTrigger(trigger);
        }
        DevLogger.log(
          `SDKConnect::reconnect - already connected [connected] -- trigger updated to '${trigger}'`,
        );
        return;
      }

      if (ready) {
        DevLogger.log(
          `SDKConnect::reconnect - already connected [ready=${ready}] -- ignoring`,
        );
        return;
      }
    }

    DevLogger.log(`SDKConnect::reconnect - starting reconnection`);

    const connection = this.state.connections[channelId];
    this.state.connecting[channelId] = true;
    this.state.connected[channelId] = new Connection({
      ...connection,
      socketServerUrl: this.state.socketServerUrl,
      otherPublicKey,
      reconnect: true,
      trigger,
      initialConnection,
      rpcQueueManager: this.state.rpcqueueManager,
      navigation: this.state.navigation,
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
    this.state.connected[channelId].connect({
      withKeyExchange: true,
    });
    this.watchConnection(this.state.connected[channelId]);
    const afterConnected =
      this.state.connected[channelId].remote.isConnected() ?? false;
    this.state.connecting[channelId] = !afterConnected; // If not connected, it means it's connecting.
    this.emit('refresh');
  }

  async reconnectAll() {
    DevLogger.log(
      `SDKConnect::reconnectAll paused=${this.state.paused} reconnected=${this.state.reconnected}`,
    );

    if (this.state.reconnected) {
      DevLogger.log(`SDKConnect::reconnectAll - already reconnected`);
      return;
    }

    const channelIds = Object.keys(this.state.connections);
    channelIds.forEach((channelId) => {
      if (channelId) {
        this.reconnect({
          channelId,
          otherPublicKey: this.state.connections[channelId].otherPublicKey,
          initialConnection: false,
          trigger: 'reconnect',
          context: 'reconnectAll',
        }).catch((err) => {
          Logger.log(
            err,
            `SDKConnect::reconnectAll error reconnecting to ${channelId}`,
          );
        });
      }
    });
    this.state.reconnected = true;
    DevLogger.log(`SDKConnect::reconnectAll - done`);
  }

  setSDKSessions(sdkSessions: SDKSessions) {
    this.state.connections = sdkSessions;
  }

  public pause() {
    if (this.state.paused) return;

    for (const id in this.state.connected) {
      if (!this.state.connected[id].remote.isReady()) {
        DevLogger.log(`SDKConnect::pause - SKIP - non active connection ${id}`);
        continue;
      }
      DevLogger.log(`SDKConnect::pause - pausing ${id}`);
      this.state.connected[id].pause();
      // check for paused status?
      DevLogger.log(
        `SDKConnect::pause - done - paused=${this.state.connected[
          id
        ].remote.isPaused()}`,
      );
    }
    this.state.paused = true;
    this.state.connecting = {};
  }

  public async bindAndroidSDK() {
    if (Platform.OS !== 'android') {
      return;
    }

    if (this.state.androidSDKBound) return;

    try {
      // Always bind native module to client as early as possible otherwise connection may have an invalid status
      await NativeModules.CommunicationClient.bindService();
      this.state.androidSDKBound = true;
    } catch (err) {
      Logger.log(err, `SDKConnect::bindAndroiSDK failed`);
    }
  }

  public isAndroidSDKBound() {
    return this.state.androidSDKBound;
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
    this.state.connections[connection.id] = connection;
    DevLogger.log(`SDKConnect::addAndroidConnection`, connection);
    await DefaultPreference.set(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
      JSON.stringify(this.state.connections),
    ).catch((err) => {
      throw err;
    });
    this.emit('refresh');
  }

  removeAndroidConnection(id: string) {
    delete this.state.connections[id];
    DefaultPreference.set(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
      JSON.stringify(this.state.connections),
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
    this.state.disabledHosts[host] = 0;
    delete this.state.approvedHosts[host];
    delete this.state.connecting[channelId];
    delete this.state.connections[channelId];
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
      JSON.stringify(this.state.approvedHosts),
    ).catch((err) => {
      throw err;
    });
    DefaultPreference.set(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
      JSON.stringify(this.state.connections),
    ).catch((err) => {
      throw err;
    });
  }

  public removeChannel(channelId: string, sendTerminate?: boolean) {
    DevLogger.log(
      `SDKConnect::removeChannel ${channelId} sendTerminate=${sendTerminate} connectedted=${
        this.state.connected[channelId] !== undefined
      }`,
    );
    if (this.state.connected[channelId]) {
      try {
        this.state.connected[channelId].removeConnection({
          terminate: sendTerminate ?? false,
          context: 'SDKConnect::removeChannel',
        });
      } catch (err) {
        // Ignore error
      }

      delete this.state.connected[channelId];
      delete this.state.connections[channelId];
      delete this.state.approvedHosts[
        AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
      ];
      delete this.state.disabledHosts[
        AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId
      ];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(this.state.connections),
      ).catch((err) => {
        throw err;
      });
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(this.state.approvedHosts),
      ).catch((err) => {
        throw err;
      });
    }
    delete this.state.connecting[channelId];
    this.emit('refresh');
  }

  public async removeAll() {
    for (const id in this.state.connections) {
      this.removeChannel(id, true);
    }

    // Remove all android connections
    await DefaultPreference.clear(AppConstants.MM_SDK.ANDROID_CONNECTIONS);
    // Also remove approved hosts that may have been skipped.
    this.state.approvedHosts = {};
    this.state.disabledHosts = {};
    this.state.connections = {};
    this.state.connected = {};
    this.state.connecting = {};
    this.state.paused = false;
    await DefaultPreference.clear(AppConstants.MM_SDK.SDK_CONNECTIONS);
    await DefaultPreference.clear(AppConstants.MM_SDK.SDK_APPROVEDHOSTS);
  }

  public getConnected() {
    return this.state.connected;
  }

  public getConnections() {
    return this.state.connections;
  }

  public getApprovedHosts(_context?: string) {
    return this.state.approvedHosts || {};
  }

  public disapproveChannel(channelId: string) {
    const hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + channelId;
    this.state.connections[channelId].lastAuthorized = 0;
    delete this.state.approvedHosts[hostname];
  }

  public getSockerServerUrl() {
    return this.state.socketServerUrl;
  }

  public async setSocketServerUrl(url: string) {
    try {
      this.state.socketServerUrl = url;
      await this.removeAll();
    } catch (err) {
      Logger.log(err, `SDKConnect::setSocketServerUrl - error `);
    }
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
    const isApproved = this.state.approvedHosts[hostname] !== undefined;
    // possible future feature to add multiple approval parameters per channel.
    return isApproved;
  }

  public _approveHost({ host }: approveHostProps) {
    const channelId = host.replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '');
    if (this.state.disabledHosts[host]) {
      // Might be useful for future feature.
    } else {
      const approvedUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS;
      this.state.approvedHosts[host] = approvedUntil;
      DevLogger.log(`SDKConnect approveHost ${host}`, this.state.approvedHosts);
      if (this.state.connections[channelId]) {
        this.state.connections[channelId].lastAuthorized = approvedUntil;
      }
      if (this.state.connected[channelId]) {
        this.state.connected[channelId].lastAuthorized = approvedUntil;
      }
      // Prevent disabled hosts from being persisted.
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
        JSON.stringify(this.state.approvedHosts),
      ).catch((err) => {
        throw err;
      });
    }
    this.emit('refresh');
  }

  private async _handleAppState(appState: string) {
    // Prevent double handling same app state
    if (this.state.appState === appState) {
      DevLogger.log(
        `SDKConnect::_handleAppState - SKIP - same appState ${appState}`,
      );
      return;
    }

    DevLogger.log(`SDKConnect::_handleAppState appState=${appState}`);
    this.state.appState = appState;
    if (appState === 'active') {
      // Close previous loading modal if any.
      this.hideLoadingState().catch((err) => {
        Logger.log(
          err,
          `SDKConnect::_handleAppState - can't hide loading state`,
        );
      });
      DevLogger.log(
        `SDKConnect::_handleAppState - resuming - paused=${this.state.paused}`,
        this.state.timeout,
      );
      if (Device.isAndroid()) {
        if (this.state.timeout) {
          BackgroundTimer.clearInterval(this.state.timeout);
        }
        // Android cannot process deeplinks until keychain is unlocked and we want to process deeplinks first
        // so we wait for keychain to be unlocked before resuming connections.
        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;
        await waitForKeychainUnlocked({
          keyringController,
          context: 'handleAppState',
        });
      } else if (this.state.timeout) {
        clearTimeout(this.state.timeout);
      }
      this.state.timeout = undefined;

      if (this.state.paused) {
        // Reset connecting status when reconnecting from deeplink.
        const hasConnecting = Object.keys(this.state.connecting).length > 0;
        if (hasConnecting) {
          console.warn(
            `SDKConnect::_handleAppState - resuming from pause - reset connecting status`,
          );
          this.state.connecting = {};
        }
        const connectedCount = Object.keys(this.state.connected).length;
        if (connectedCount > 0) {
          // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
          await wait(2000);
          DevLogger.log(
            `SDKConnect::_handleAppState - resuming ${connectedCount} connections`,
          );
          for (const id in this.state.connected) {
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
      this.state.paused = false;
    } else if (appState === 'background') {
      if (!this.state.paused) {
        /**
         * Pause connections after 20 seconds of the app being in background to respect device resources.
         * Also, OS closes the app if after 30 seconds, the connections are still open.
         */
        if (Device.isIos()) {
          BackgroundTimer.start();
          this.state.timeout = setTimeout(() => {
            this.pause();
          }, TIMEOUT_PAUSE_CONNECTIONS) as unknown as number;
          BackgroundTimer.stop();
        } else if (Device.isAndroid()) {
          this.state.timeout = BackgroundTimer.setTimeout(() => {
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
      this.state.appStateListener?.remove();
    } catch (err) {
      // Ignore if already removed
    }
    for (const id in this.state.connected) {
      this.state.connected[id].disconnect({
        terminate: false,
        context: 'unmount',
      });
    }

    if (Device.isAndroid()) {
      if (this.state.timeout) BackgroundTimer.clearInterval(this.state.timeout);
    } else if (this.state.timeout) clearTimeout(this.state.timeout);
    if (this.state.initTimeout) clearTimeout(this.state.initTimeout);
    this.state.timeout = undefined;
    this.state.initTimeout = undefined;
    this.state._initialized = false;
    this.state.approvedHosts = {};
    this.state.disabledHosts = {};
    this.state.connections = {};
    this.state.connected = {};
    this.state.connecting = {};
  }

  getSessionsStorage() {
    return this.state.connections;
  }

  public async init({
    navigation,
    context,
  }: {
    checkUserLoggedIn: () => boolean;
    navigation: NavigationContainerRef;
    context?: string;
  }) {
    if (this.state._initializing) {
      DevLogger.log(
        `SDKConnect::init()[${context}] -- already initializing -- wait for completion`,
      );
      return await this.state._initializing;
    } else if (this.state._initialized) {
      DevLogger.log(
        `SDKConnect::init()[${context}] -- SKIP -- already initialized`,
        this.state.connections,
      );
      return;
    }

    if (!this.state.androidSDKStarted && Platform.OS === 'android') {
      DevLogger.log(`SDKConnect::init() - starting android service`);
      this.state.androidService = new AndroidService();
      this.state.androidSDKStarted = true;
    }

    const doAsyncInit = async () => {
      this.state.navigation = navigation;
      DevLogger.log(`SDKConnect::init()[${context}] - starting`);

      // Ignore initial call to _handleAppState since it is first initialization.
      this.state.appState = 'active';

      // When restarting from being killed, keyringController might be mistakenly restored on unlocked=true so we need to wait for it to get correct state.
      await wait(1000);
      DevLogger.log(`SDKConnect::init() - waited 1000ms - keep initializing`);

      try {
        DevLogger.log(`SDKConnect::init() - loading connections`);
        // On Android the DefaultPreferences will start loading after the biometrics
        const [connectionsStorage, hostsStorage] = await Promise.all([
          DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
          DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
        ]);

        DevLogger.log(
          `SDKConnect::init() - connectionsStorage=${connectionsStorage} hostsStorage=${hostsStorage}`,
        );

        if (connectionsStorage) {
          this.state.connections = JSON.parse(connectionsStorage);
          DevLogger.log(
            `SDKConnect::init() - connections [${
              Object.keys(this.state.connections).length
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
            await DefaultPreference.set(
              AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
              JSON.stringify(approvedHosts),
            );
          }
          this.state.approvedHosts = approvedHosts;
          DevLogger.log(
            `SDKConnect::init() - approvedHosts [${
              Object.keys(this.state.approvedHosts).length
            }]`,
          );
        }

        DevLogger.log(`SDKConnect::init() - done`);
        this.state._initialized = true;
      } catch (err) {
        Logger.log(err, `SDKConnect::init() - error loading connections`);
      }
    };

    this.state._initializing = doAsyncInit();

    return this.state._initializing;
  }

  async postInit() {
    if (!this.state._initialized) {
      throw new Error(`SDKConnect::postInit() - not initialized`);
    }

    if (this.state._postInitializing) {
      DevLogger.log(
        `SDKConnect::postInit() -- already doing post init -- wait for completion`,
      );
      // Wait for initialization to finish.
      await waitForCondition({
        fn: () => this.state._postInitialized,
        context: 'post_init',
      });
      DevLogger.log(
        `SDKConnect::postInit() -- done waiting for post initialization`,
      );
      return;
    } else if (this.state._postInitialized) {
      DevLogger.log(
        `SDKConnect::postInit() -- SKIP -- already post initialized`,
      );
      return;
    }

    this.state._postInitializing = true;

    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    DevLogger.log(
      `SDKConnect::postInit() - check keychain unlocked=${keyringController.isUnlocked()}`,
    );

    await waitForKeychainUnlocked({ keyringController, context: 'init' });
    this.state.appStateListener = AppState.addEventListener(
      'change',
      this._handleAppState.bind(this),
    );

    // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
    await wait(3000);
    await this.reconnectAll();

    this.state._postInitialized = true;
    DevLogger.log(`SDKConnect::postInit() - done`);
  }

  hasInitialized() {
    return this.state._initialized;
  }

  public static getInstance(): SDKConnect {
    if (!SDKConnect.instance) {
      SDKConnect.instance = new SDKConnect();
    }
    return SDKConnect.instance;
  }
}

export default SDKConnect;
