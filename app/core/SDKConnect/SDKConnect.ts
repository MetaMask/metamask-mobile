import { NativeEventSubscription } from 'react-native';
import { analytics } from '@metamask/sdk-analytics';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';

import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { NavigationContainerRef } from '@react-navigation/native';
import Engine from '../../core/Engine';
import AndroidService from './AndroidSDK/AndroidService';
import addDappConnection from './AndroidSDK/addDappConnection';
import bindAndroidSDK from './AndroidSDK/bindAndroidSDK';
import loadDappConnections from './AndroidSDK/loadDappConnections';
import { Connection, ConnectionProps } from './Connection';
import {
  approveHost,
  connectToChannel,
  disapproveChannel,
  invalidateChannel,
  reconnect,
  reconnectAll,
  removeAll,
  removeChannel,
  watchConnection,
} from './ConnectionManagement';
import { init, postInit } from './InitializationManagement';
import RPCQueueManager from './RPCQueueManager';
import { DEFAULT_SESSION_TIMEOUT_MS } from './SDKConnectConstants';
import DeeplinkProtocolService from './SDKDeeplinkProtocol/DeeplinkProtocolService';
import { pause, resume, unmount } from './SessionManagement';
import {
  handleAppState,
  hideLoadingState,
  updateOriginatorInfos,
  updateSDKLoadingState,
} from './StateManagement';
import DevLogger from './utils/DevLogger';
import NavigationService from '../NavigationService';

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
  deeplinkingServiceStarted: boolean;
  deeplinkingService?: DeeplinkProtocolService;
  dappConnections: SDKSessions;
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

export class SDKConnect {
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
    dappConnections: {},
    androidSDKStarted: false,
    androidSDKBound: false,
    deeplinkingServiceStarted: false,
    androidService: undefined,
    deeplinkingService: undefined,
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
    protocolVersion,
    originatorInfo,
    initialConnection,
    validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
  }: ConnectionProps) {
    return connectToChannel({
      id,
      trigger,
      otherPublicKey,
      protocolVersion,
      origin,
      originatorInfo,
      validUntil,
      initialConnection,
      instance: this,
    });
  }

  public watchConnection(connection: Connection) {
    return watchConnection(connection, this);
  }

  public async updateSDKLoadingState({
    channelId,
    loading,
  }: {
    channelId: string;
    loading: boolean;
  }) {
    return updateSDKLoadingState({ channelId, loading, instance: this });
  }

  public async hideLoadingState() {
    return hideLoadingState({ instance: this });
  }

  public updateOriginatorInfos({
    channelId,
    originatorInfo,
  }: {
    channelId: string;
    originatorInfo: OriginatorInfo;
  }) {
    return updateOriginatorInfos({ channelId, originatorInfo, instance: this });
  }

  public async resume({ channelId }: { channelId: string }) {
    return resume({ channelId, instance: this });
  }

  async reconnect({
    channelId,
    otherPublicKey,
    initialConnection,
    protocolVersion,
    trigger,
    updateKey,
    context,
  }: {
    channelId: string;
    otherPublicKey: string;
    context?: string;
    protocolVersion?: ConnectionProps['protocolVersion'];
    updateKey?: boolean;
    trigger?: ConnectionProps['trigger'];
    initialConnection: boolean;
  }) {
    return reconnect({
      channelId,
      otherPublicKey,
      context,
      protocolVersion,
      updateKey,
      trigger,
      initialConnection,
      instance: this,
    });
  }

  async reconnectAll() {
    return reconnectAll(this);
  }

  setSDKSessions(sdkSessions: SDKSessions) {
    this.state.connections = sdkSessions;
  }

  public pause() {
    return pause(this);
  }

  public async bindAndroidSDK() {
    return bindAndroidSDK(this);
  }

  public isAndroidSDKBound() {
    return this.state.androidSDKBound;
  }

  async loadDappConnections(): Promise<{
    [id: string]: ConnectionProps;
  }> {
    return loadDappConnections();
  }

  getAndroidConnections() {
    return this.state.androidService?.getConnections();
  }

  async addDappConnection(connection: ConnectionProps) {
    return addDappConnection(connection, this);
  }

  public async refreshChannel({ channelId }: { channelId: string }) {
    const session = this.state.connected[channelId];
    if (!session) {
      DevLogger.log(`SDKConnect::refreshChannel - session not found`);
      return;
    }
    DevLogger.log(`SDKConnect::refreshChannel channelId=${channelId}`);
    // Force enitting updated accounts
    session.backgroundBridge?.notifySelectedAddressChanged();
  }

  /**
   * Invalidate a channel/session by preventing future connection to be established.
   * Instead of removing the channel, it sets the session to timeout on next
   * connection which will remove it while conitnuing current session.
   *
   * @param channelId
   */
  public invalidateChannel({ channelId }: { channelId: string }) {
    return invalidateChannel({ channelId, instance: this });
  }

  public removeChannel({
    channelId,
    sendTerminate,
  }: {
    channelId: string;
    sendTerminate?: boolean;
  }) {
    return removeChannel({
      channelId,
      engine: Engine,
      sendTerminate,
      instance: this,
    });
  }

  public async removeAll() {
    const removeAllPromise = removeAll(this);
    // Force close loading status
    removeAllPromise.finally(() => this.hideLoadingState());
    return removeAllPromise;
  }

  public getConnected() {
    return this.state.connected;
  }

  public getConnections() {
    return this.state.connections;
  }

  public getConnection({ channelId }: { channelId: string }) {
    return (
      this.state.connections[channelId] ?? this.state.dappConnections[channelId]
    );
  }

  public getApprovedHosts(_context?: string) {
    return this.state.approvedHosts || {};
  }

  public disapproveChannel(channelId: string) {
    return disapproveChannel({ channelId, instance: this });
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

  public revalidateChannel({ channelId }: { channelId: string }) {
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
    return approveHost({ host, instance: this });
  }

  async _handleAppState(appState: string) {
    return handleAppState({ appState, instance: this });
  }

  public async unmount() {
    return unmount(this);
  }

  getSessionsStorage() {
    return this.state.connections;
  }

  public static async init({ context }: { context?: string }) {
    const instance = SDKConnect.getInstance();

    analytics.setGlobalProperty('platform', 'mobile');
    analytics.enable();
    await init({ context, instance });
    await instance.postInit();
  }

  async postInit() {
    return postInit(this);
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
