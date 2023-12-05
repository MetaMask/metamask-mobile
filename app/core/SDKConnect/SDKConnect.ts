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

export type SDKEventListener = (event: string) => void;

export class SDKConnect extends EventEmitter2 {
  private static instance: SDKConnect;

  private navigation?: NavigationContainerRef;
  private reconnected = false;

  // Track init status to ensure connection recovery priority and prevent double initialization.
  private _initialized = false;
  private _initializing?: Promise<unknown>;
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
  private socketServerUrl: string = AppConstants.MM_SDK.SERVER_URL; // Allow to customize different socket server url

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
    const existingConnection = this.connected[id] !== undefined;
    const isReady = existingConnection && this.connected[id].isReady;

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
    if (existingConnection && !this.paused) {
      DevLogger.log(
        `SDKConnect::connectToChannel -- CONNECTION SEEMS TO EXISTS ? --`,
      );
      // if paused --- wait for resume --- otherwise reconnect.
      await this.reconnect({
        channelId: id,
        initialConnection: false,
        trigger,
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
      validUntil,
      lastAuthorized: initialConnection ? 0 : this.approvedHosts[id],
    };

    DevLogger.log(`SDKConnect connections[${id}]`, this.connections[id]);

    this.connected[id] = new Connection({
      ...this.connections[id],
      socketServerUrl: this.socketServerUrl,
      initialConnection,
      trigger,
      rpcQueueManager: this.rpcqueueManager,
      navigation: this.navigation,
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
    if (loading === true) {
      this.sdkLoadingState[channelId] = true;
    } else {
      delete this.sdkLoadingState[channelId];
    }

    const loadingSessionsLen = Object.keys(this.sdkLoadingState).length;
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

      this.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_LOADING,
      });
    } else {
      await this.hideLoadingState();
    }
  }

  public async hideLoadingState() {
    this.sdkLoadingState = {};
    const currentRoute = this.navigation?.getCurrentRoute()?.name;
    if (
      currentRoute === Routes.SHEET.SDK_LOADING &&
      this.navigation?.canGoBack()
    ) {
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
    const alreadyResumed = this.connected[channelId].isResumed ?? false;

    DevLogger.log(
      `SDKConnect::resume channel=${channelId} alreadyResumed=${alreadyResumed} session=${session} paused=${session.isPaused()} connected=${session?.isConnected()} connecting=${
        this.connecting[channelId]
      }`,
    );
    if (
      session &&
      !session?.isConnected() &&
      !alreadyResumed &&
      !this.connecting[channelId]
    ) {
      this.connected[channelId].resume();
      await wait(500); // Some devices (especially android) need time to update socket status after resuming.
      DevLogger.log(
        `SDKConnect::_handleAppState - done resuming - socket_connected=${this.connected[
          channelId
        ].remote.isConnected()}`,
      );
    } else {
      DevLogger.log(
        `SDKConnect::_handleAppState - SKIP - connection.resumed=${this.connected[channelId]?.isResumed}`,
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
      this.connected[channelId];

    // Check if already connected
    if (existingConnection?.remote.isReady()) {
      DevLogger.log(
        `SDKConnect::reconnect[${context}] - already ready - ignore`,
      );
      if (trigger) {
        this.connected[channelId].setTrigger('deeplink');
      }

      return;
    }

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

    const wasPaused = existingConnection?.remote.isPaused();
    // Make sure the connection has resumed from pause before reconnecting.
    await waitForCondition({
      fn: () => !this.paused,
      context: 'reconnect_from_pause',
    });
    if (wasPaused) {
      DevLogger.log(`SDKConnect::reconnect[${context}] - not paused anymore`);
    }
    const connecting = this.connecting[channelId] === true;
    const socketConnected = existingConnection?.remote.isConnected() ?? false;

    DevLogger.log(
      `SDKConnect::reconnect[${context}][${trigger}] - channel=${channelId} paused=${
        this.paused
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
        if (trigger) {
          this.connected[channelId].setTrigger(trigger);
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

    const connection = this.connections[channelId];
    this.connecting[channelId] = true;
    this.connected[channelId] = new Connection({
      ...connection,
      socketServerUrl: this.socketServerUrl,
      otherPublicKey,
      reconnect: true,
      trigger,
      initialConnection,
      rpcQueueManager: this.rpcqueueManager,
      navigation: this.navigation,
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
    this.reconnected = true;
    DevLogger.log(`SDKConnect::reconnectAll - done`);
  }

  setSDKSessions(sdkSessions: SDKSessions) {
    this.connections = sdkSessions;
  }

  public pause() {
    if (this.paused) return;

    for (const id in this.connected) {
      if (!this.connected[id].remote.isReady()) {
        DevLogger.log(`SDKConnect::pause - SKIP - non active connection ${id}`);
        continue;
      }
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
  }

  public async bindAndroidSDK() {
    if (Platform.OS !== 'android') {
      return;
    }

    if (this.androidSDKBound) return;

    try {
      // Always bind native module to client as early as possible otherwise connection may have an invalid status
      await NativeModules.CommunicationClient.bindService();
      this.androidSDKBound = true;
    } catch (err) {
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
    delete this.connecting[channelId];
    this.emit('refresh');
  }

  public async removeAll() {
    for (const id in this.connections) {
      this.removeChannel(id, true);
    }

    // Remove all android connections
    await DefaultPreference.clear(AppConstants.MM_SDK.ANDROID_CONNECTIONS);
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

  public getSockerServerUrl() {
    return this.socketServerUrl;
  }

  public async setSocketServerUrl(url: string) {
    try {
      this.socketServerUrl = url;
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
      // Close previous loading modal if any.
      this.hideLoadingState().catch((err) => {
        Logger.log(
          err,
          `SDKConnect::_handleAppState - can't hide loading state`,
        );
      });
      DevLogger.log(
        `SDKConnect::_handleAppState - resuming - paused=${this.paused}`,
        this.timeout,
      );
      if (Device.isAndroid()) {
        if (this.timeout) {
          BackgroundTimer.clearInterval(this.timeout);
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
      } else if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = undefined;

      if (this.paused) {
        // Reset connecting status when reconnecting from deeplink.
        const hasConnecting = Object.keys(this.connecting).length > 0;
        if (hasConnecting) {
          console.warn(
            `SDKConnect::_handleAppState - resuming from pause - reset connecting status`,
          );
          this.connecting = {};
        }
        const connectedCount = Object.keys(this.connected).length;
        if (connectedCount > 0) {
          // Add delay to pioritize reconnecting from deeplink because it contains the updated connection info (channel dapp public key)
          await wait(2000);
          DevLogger.log(
            `SDKConnect::_handleAppState - resuming ${connectedCount} connections`,
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
    context,
  }: {
    checkUserLoggedIn: () => boolean;
    navigation: NavigationContainerRef;
    context?: string;
  }) {
    if (this._initializing) {
      DevLogger.log(
        `SDKConnect::init()[${context}] -- already initializing -- wait for completion`,
      );
      return await this._initializing;
    } else if (this._initialized) {
      DevLogger.log(
        `SDKConnect::init()[${context}] -- SKIP -- already initialized`,
        this.connections,
      );
      return;
    }

    if (!this.androidSDKStarted && Platform.OS === 'android') {
      DevLogger.log(`SDKConnect::init() - starting android service`);
      this.androidService = new AndroidService();
      this.androidSDKStarted = true;
    }

    const doAsyncInit = async () => {
      this.navigation = navigation;
      DevLogger.log(`SDKConnect::init()[${context}] - starting`);

      // Ignore initial call to _handleAppState since it is first initialization.
      this.appState = 'active';

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
            await DefaultPreference.set(
              AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
              JSON.stringify(approvedHosts),
            );
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
      } catch (err) {
        Logger.log(err, `SDKConnect::init() - error loading connections`);
      }
    };

    this._initializing = doAsyncInit();

    return this._initializing;
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
    await wait(3000);
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
