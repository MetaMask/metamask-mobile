import { StackNavigationProp } from '@react-navigation/stack';
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
import { EventEmitter2 } from 'eventemitter2';
import Routes from '../../../app/constants/navigation/Routes';
import AndroidService from './AndroidSDK/AndroidService';
import RPCQueueManager from './RPCQueueManager';
import DevLogger from './utils/DevLogger';
import { wait, waitForKeychainUnlocked } from './utils/wait.util';
import { Connection, ConnectionProps, RPC_METHODS } from './Connection';

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

export const TIMEOUT_PAUSE_CONNECTIONS = 20000;

export type SDKEventListener = (event: string) => void;

export const CONNECTION_LOADING_EVENT = 'loading';

export const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
  [RPC_METHODS.ETH_REQUESTACCOUNTS]: true,
  [RPC_METHODS.ETH_SENDTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGNTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGN]: true,
  [RPC_METHODS.PERSONAL_SIGN]: true,
  [RPC_METHODS.ETH_SIGNTYPEDEATA]: true,
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

  private navigation?: StackNavigationProp<{
    [route: string]: { screen: string };
  }>;
  private reconnected = false;
  private _initialized = false;
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

    if (isReady) {
      // Nothing to do, already connected.
      return;
    }

    // Check if it was previously paused so that it first resume connection.
    if (existingConnection && !this.paused) {
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

    await wait(1000);
    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    await waitForKeychainUnlocked({
      keyringController,
      context: 'connectToChannel',
    });

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
      const currentRoute = (this.navigation as any).getCurrentRoute?.()
        ?.name as string;
      if (currentRoute === Routes.SHEET.SDK_LOADING) {
        this.navigation?.goBack();
      }
    }
  }

  public async hideLoadingState() {
    this.sdkLoadingState = {};
    const currentRoute = (this.navigation as any).getCurrentRoute?.()
      ?.name as string;
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

  public resume({ channelId }: { channelId: string }) {
    const session = this.connected[channelId]?.remote;

    if (session && !session?.isConnected() && !this.connecting[channelId]) {
      this.connecting[channelId] = true;
      this.connected[channelId].resume();
      this.connecting[channelId] = false;
    }
  }

  async reconnect({
    channelId,
    otherPublicKey,
    initialConnection,
    context,
  }: {
    channelId: string;
    otherPublicKey: string;
    context?: string;
    initialConnection: boolean;
  }) {
    const connecting = this.connecting[channelId] === true;
    const existingConnection = this.connected[channelId];
    const socketConnected = existingConnection?.remote.isConnected() ?? false;

    DevLogger.log(
      `SDKConnect::reconnect - channel=${channelId} context=${context} paused=${
        this.paused
      } connecting=${connecting} socketConnected=${socketConnected} existingConnection=${
        existingConnection !== undefined
      }`,
      otherPublicKey,
    );

    let interruptReason = '';

    if (this.paused) {
      interruptReason = 'paused';
    }

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
      const ready = existingConnection?.remote.isReady();

      if (ready && connected) {
        // Ignore reconnection -- already ready to process messages.
        DevLogger.log(`SDKConnect::reconnect - already ready -- ignoring`);
        return;
      }

      if (Platform.OS === 'android') {
        // Android is too slow to update connected / ready status so we manually abort the reconnection to prevent conflict.
        DevLogger.log(
          `SDKConnect::reconnect - aborting reconnection on android`,
        );
        return;
      }

      if (ready || connected) {
        DevLogger.log(
          `SDKConnect::reconnect - strange state ready=${ready} connected=${connected}`,
        );
        existingConnection.disconnect({
          terminate: false,
          context: 'SDKConnect::reconnect',
        });
      }
    }

    await wait(600);
    const keyringController = (
      Engine.context as { KeyringController: KeyringController }
    ).KeyringController;
    await waitForKeychainUnlocked({ keyringController, context: 'reconnect' });

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
    if (this.reconnected) {
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
  }

  setSDKSessions(sdkSessions: SDKSessions) {
    this.connections = sdkSessions;
  }

  public pause() {
    if (this.paused) return;

    for (const id in this.connected) {
      this.connected[id].pause();
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
      return;
    }

    this.appState = appState;
    if (appState === 'active') {
      if (Device.isAndroid()) {
        if (this.timeout) BackgroundTimer.clearInterval(this.timeout);
      } else if (this.timeout) clearTimeout(this.timeout);
      this.timeout = undefined;

      if (this.paused) {
        for (const id in this.connected) {
          this.resume({ channelId: id });
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

  public async init(props: {
    navigation: StackNavigationProp<{ [route: string]: { screen: string } }>;
  }) {
    if (this._initialized) {
      return;
    }
    DevLogger.log(`SDKConnect::init()`);
    // Change _initialized status at the beginning to prevent double initialization during dev.
    this._initialized = true;

    this.navigation = props.navigation;

    // When restarting from being killed, keyringController might be mistakenly restored on unlocked=true so we need to wait for it to get correct state.
    await wait(1000);

    if (!this.androidSDKStarted && Platform.OS === 'android') {
      this.androidService = new AndroidService();
      this.androidSDKStarted = true;
    }

    this.appStateListener = AppState.addEventListener(
      'change',
      this._handleAppState.bind(this),
    );

    const [connectionsStorage, hostsStorage] = await Promise.all([
      DefaultPreference.get(AppConstants.MM_SDK.SDK_CONNECTIONS),
      DefaultPreference.get(AppConstants.MM_SDK.SDK_APPROVEDHOSTS),
    ]);

    if (connectionsStorage) {
      this.connections = JSON.parse(connectionsStorage);
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
    }

    // Need to use a timeout to avoid race condition of double reconnection
    // - reconnecting from deeplink and reconnecting from being back in foreground.
    // We prioritize the deeplink and thus use the delay here.

    if (!this.paused) {
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({ keyringController, context: 'init' });
      await wait(2000);

      await this.reconnectAll();
    }
  }

  public static getInstance(): SDKConnect {
    if (!SDKConnect.instance) {
      SDKConnect.instance = new SDKConnect();
    }
    return SDKConnect.instance;
  }
}

export default SDKConnect;
