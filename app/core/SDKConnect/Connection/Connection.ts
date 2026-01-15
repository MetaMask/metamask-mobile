import {
  CommunicationLayerPreference,
  EventType,
  OriginatorInfo,
  RemoteCommunication,
} from '@metamask/sdk-communication-layer';
import NavigationService from '../../NavigationService';
import { EventEmitter2 } from 'eventemitter2';
import AppConstants from '../../AppConstants';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import BatchRPCManager from '../BatchRPCManager';
import RPCQueueManager from '../RPCQueueManager';
import { ApprovedHosts, approveHostProps } from '../SDKConnect';
import { CONNECTION_LOADING_EVENT } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import sendAuthorized from './Auth/sendAuthorized';
import {
  connect,
  disconnect,
  pause,
  removeConnection,
  resume,
} from './ConnectionLifecycle';
import {
  handleClientsConnected,
  handleClientsDisconnected,
  handleClientsReady,
  handleReceivedMessage,
} from './EventListenersHandlers';
import handleClientsWaiting from './EventListenersHandlers/handleClientsWaiting';
import setupBridge from '../handlers/setupBridge';

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  privateKey?: string;
  relayPersistence?: boolean;
  protocolVersion?: number;
  origin: string;
  reconnect?: boolean;
  // Only userful in case of reconnection
  trigger?: 'deeplink' | 'resume' | 'reconnect';
  initialConnection?: boolean;
  navigation?: typeof NavigationService.navigation;
  originatorInfo?: OriginatorInfo;
  connected?: boolean;
  validUntil?: number;
  scheme?: string;
  lastAuthorized?: number; // timestamp of last received activity
  hideReturnToApp?: boolean;
}

import packageJSON from '../../../../package.json';
const { version: walletVersion } = packageJSON;

export class Connection extends EventEmitter2 {
  channelId;
  remote: RemoteCommunication;
  origin: string;
  host: string;
  navigation?: typeof NavigationService.navigation;
  hideReturnToApp?: boolean;
  protocolVersion: number;
  originatorInfo?: OriginatorInfo;
  isReady = false;
  backgroundBridge?: BackgroundBridge;
  reconnect: boolean;
  /**
   * Sometime the dapp disconnect and reconnect automatically through socket.io which doesnt inform the wallet of the reconnection.
   * We keep track of the disconnect event to avoid waiting for ready after a message.
   */
  receivedDisconnect = false;
  /**
   * receivedClientsReady is used to track when a dApp disconnects before processing the 'clients_ready' message.
   */
  receivedClientsReady = false;
  /**
   * isResumed is used to manage the loading state.
   */
  isResumed = false;
  initialConnection: boolean;
  trigger?: ConnectionProps['trigger'];

  /*
   * Timestamp of last activity, used to check if channel is still active and to prevent showing OTP approval modal too often.
   */
  lastAuthorized?: number;

  /**
   * Prevent double sending 'authorized' message.
   */
  authorizedSent = false;

  /**
   * Array of random number to use during reconnection and otp verification.
   */
  otps?: number[];

  approvalPromise?: Promise<unknown>;

  /**
   * Should only be accesses via getter / setter.
   */
  _loading = false;

  rpcQueueManager: RPCQueueManager;

  batchRPCManager: BatchRPCManager;

  socketServerUrl: string;

  approveHost: ({ host, hostname }: approveHostProps) => void;
  getApprovedHosts: (context: string) => ApprovedHosts;
  disapprove: (channelId: string) => void;
  revalidate: ({ channelId }: { channelId: string }) => void;
  isApproved: ({
    channelId,
  }: {
    channelId: string;
    context?: string;
  }) => boolean;
  onTerminate: ({ channelId }: { channelId: string }) => void;

  constructor({
    id,
    otherPublicKey,
    privateKey,
    relayPersistence,
    protocolVersion,
    origin,
    reconnect,
    initialConnection,
    rpcQueueManager,
    originatorInfo,
    socketServerUrl,
    trigger,
    navigation,
    hideReturnToApp,
    lastAuthorized,
    approveHost,
    getApprovedHosts,
    disapprove,
    revalidate,
    isApproved,
    updateOriginatorInfos,
    onTerminate,
  }: ConnectionProps & {
    socketServerUrl: string; // Allow to customize different socket server url
    rpcQueueManager: RPCQueueManager;
    approveHost: ({ host, hostname }: approveHostProps) => void;
    getApprovedHosts: (context: string) => ApprovedHosts;
    disapprove: (channelId: string) => void;
    revalidate: ({ channelId }: { channelId: string }) => void;
    isApproved: ({ channelId }: { channelId: string }) => boolean;
    onTerminate: ({ channelId }: { channelId: string }) => void;
    updateOriginatorInfos: (params: {
      channelId: string;
      originatorInfo: OriginatorInfo;
    }) => void;
  }) {
    super();

    this.isReady = relayPersistence ?? false;
    this.origin = origin;
    this.trigger = trigger;
    this.channelId = id;
    this.navigation = navigation;
    this.hideReturnToApp = hideReturnToApp;
    this.lastAuthorized = lastAuthorized;
    this.reconnect = reconnect || false;
    this.isResumed = false;
    this.originatorInfo = originatorInfo;
    this.socketServerUrl = socketServerUrl;
    this.initialConnection = initialConnection === true;
    this.host = `${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}${this.channelId}`;
    // TODO: should be probably contained to current connection
    this.rpcQueueManager = rpcQueueManager;
    // batchRPCManager should be contained to current connection
    this.batchRPCManager = new BatchRPCManager(id);
    this.protocolVersion = protocolVersion ?? 1;

    this.approveHost = approveHost;
    this.getApprovedHosts = getApprovedHosts;
    this.disapprove = disapprove;
    this.revalidate = revalidate;
    this.isApproved = isApproved;
    this.onTerminate = onTerminate;

    DevLogger.log(
      `Connection::constructor() id=${
        this.channelId
      } typeof(protocolVersion)=${typeof protocolVersion}  protocolVersion=${protocolVersion} relayPersistence=${relayPersistence} initialConnection=${
        this.initialConnection
      } lastAuthorized=${this.lastAuthorized} trigger=${this.trigger}`,
      socketServerUrl,
      originatorInfo,
    );

    if (!this.channelId) {
      throw new Error('Connection channelId is undefined');
    }

    this.remote = new RemoteCommunication({
      anonId: '', // Note: this can be safely set to an empty string as this is coming from the dApp
      platformType: AppConstants.MM_SDK.PLATFORM as 'metamask-mobile',
      relayPersistence,
      protocolVersion: this.protocolVersion,
      communicationServerUrl: this.socketServerUrl,
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      otherPublicKey,
      reconnect,
      transports: ['websocket'],
      walletInfo: {
        type: 'MetaMask Mobile',
        version: walletVersion,
      },
      ecies: {
        debug: true,
        privateKey,
      },
      context: AppConstants.MM_SDK.PLATFORM,
      analytics: true,
      logging: {
        eciesLayer: false,
        keyExchangeLayer: true,
        remoteLayer: true,
        serviceLayer: true,
        // plaintext: true doesn't do anything unless using custom socket server.
        plaintext: true,
      },
      storage: {
        enabled: false,
      },
    });

    // if relayPersistence is true, automatically setup background bridge
    if (originatorInfo) {
      this.backgroundBridge = setupBridge({
        originatorInfo,
        connection: this,
      });
    }

    this.remote.on(EventType.CLIENTS_CONNECTED, handleClientsConnected(this));

    this.remote.on(
      EventType.CLIENTS_DISCONNECTED,
      handleClientsDisconnected({
        instance: this,
        disapprove,
      }),
    );

    this.remote.on(
      EventType.CLIENTS_WAITING,
      handleClientsWaiting({
        instance: this,
      }),
    );

    this.remote.on(
      EventType.CLIENTS_READY,
      handleClientsReady({
        instance: this,
        disapprove,
        updateOriginatorInfos,
        approveHost,
      }),
    );

    this.remote.on(
      EventType.MESSAGE,
      handleReceivedMessage({ instance: this }),
    );
  }

  public connect({
    withKeyExchange,
    authorized,
    rejected,
  }: {
    authorized: boolean;
    rejected?: boolean;
    withKeyExchange: boolean;
  }) {
    return connect({
      instance: this,
      rejected,
      withKeyExchange,
      authorized,
    });
  }

  sendAuthorized(force?: boolean) {
    return sendAuthorized({ instance: this, force });
  }

  setLoading(loading: boolean) {
    this._loading = loading;
    DevLogger.log(
      `Connection::setLoading() id=${this.channelId} loading=${loading}`,
    );
    this.emit(CONNECTION_LOADING_EVENT, { loading });
  }

  getLoading() {
    return this._loading;
  }

  pause() {
    return pause({ instance: this });
  }

  resume() {
    return resume({ instance: this });
  }

  setTrigger(trigger: ConnectionProps['trigger']) {
    DevLogger.log(
      `Connection::setTrigger() id=${this.channelId} trigger=${trigger}`,
    );
    this.trigger = trigger;
  }

  disconnect({
    terminate,
    context,
  }: {
    terminate: boolean;
    context?: string;
  }): Promise<boolean> {
    return disconnect({ instance: this, terminate, context });
  }

  removeConnection({
    terminate,
    context,
  }: {
    terminate: boolean;
    context?: string;
  }) {
    return removeConnection({ instance: this, terminate, context });
  }
}
