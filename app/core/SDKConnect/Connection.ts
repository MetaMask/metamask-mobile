import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';

import { KeyringController } from '@metamask/keyring-controller';
import {
  CommunicationLayerMessage,
  CommunicationLayerPreference,
  EventType,
  MessageType,
  OriginatorInfo,
  RemoteCommunication,
} from '@metamask/sdk-communication-layer';
import { NavigationContainerRef } from '@react-navigation/native';
import { EventEmitter2 } from 'eventemitter2';
import BatchRPCManager from './BatchRPCManager';
import RPCQueueManager from './RPCQueueManager';
import {
  ApprovedHosts,
  CONNECTION_LOADING_EVENT,
  approveHostProps,
} from './SDKConnect';
import { handleConnectionMessage } from './handlers/handleConnectionMessage';
import handleConnectionReady from './handlers/handleConnectionReady';
import DevLogger from './utils/DevLogger';
import { waitForKeychainUnlocked } from './utils/wait.util';

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
  // Only userful in case of reconnection
  trigger?: 'deeplink' | 'resume' | 'reconnect';
  initialConnection?: boolean;
  navigation?: NavigationContainerRef;
  originatorInfo?: OriginatorInfo;
  validUntil?: number;
  lastAuthorized?: number; // timestamp of last received activity
}

// eslint-disable-next-line
const { version } = require('../../../package.json');

export const RPC_METHODS = {
  METAMASK_GETPROVIDERSTATE: 'metamask_getProviderState',
  METAMASK_CONNECTSIGN: 'metamask_connectSign',
  METAMASK_CONNECTWITH: 'metamask_connectWith',
  METAMASK_BATCH: 'metamask_batch',
  PERSONAL_SIGN: 'personal_sign',
  ETH_SIGN: 'eth_sign',
  ETH_REQUESTACCOUNTS: 'eth_requestAccounts',
  ETH_SENDTRANSACTION: 'eth_sendTransaction',
  ETH_SIGNTRANSACTION: 'eth_signTransaction',
  ETH_SIGNTYPEDEATA: 'eth_signTypedData',
  ETH_SIGNTYPEDEATAV3: 'eth_signTypedData_v3',
  ETH_SIGNTYPEDEATAV4: 'eth_signTypedData_v4',
  WALLET_WATCHASSET: 'wallet_watchAsset',
  WALLET_ADDETHEREUMCHAIN: 'wallet_addEthereumChain',
  WALLET_SWITCHETHEREUMCHAIN: 'wallet_switchEthereumChain',
  ETH_ACCOUNTS: 'eth_accounts',
  ETH_CHAINID: 'eth_chainId',
};
export class Connection extends EventEmitter2 {
  channelId;
  remote: RemoteCommunication;
  requestsToRedirect: { [request: string]: boolean } = {};
  origin: string;
  host: string;
  navigation?: NavigationContainerRef;
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
    origin,
    reconnect,
    initialConnection,
    rpcQueueManager,
    originatorInfo,
    socketServerUrl,
    trigger,
    navigation,
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
    this.origin = origin;
    this.trigger = trigger;
    this.channelId = id;
    this.navigation = navigation;
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
    this.approveHost = approveHost;
    this.getApprovedHosts = getApprovedHosts;
    this.disapprove = disapprove;
    this.revalidate = revalidate;
    this.isApproved = isApproved;
    this.onTerminate = onTerminate;

    this.setLoading(true);

    DevLogger.log(
      `Connection::constructor() id=${this.channelId} initialConnection=${this.initialConnection} lastAuthorized=${this.lastAuthorized} trigger=${this.trigger}`,
      socketServerUrl,
    );

    if (!this.channelId) {
      throw new Error('Connection channelId is undefined');
    }

    this.remote = new RemoteCommunication({
      platformType: AppConstants.MM_SDK.PLATFORM as 'metamask-mobile',
      communicationServerUrl: this.socketServerUrl,
      communicationLayerPreference: CommunicationLayerPreference.SOCKET,
      otherPublicKey,
      reconnect,
      walletInfo: {
        type: 'MetaMask Mobile',
        version,
      },
      context: AppConstants.MM_SDK.PLATFORM,
      analytics: true,
      logging: {
        eciesLayer: false,
        keyExchangeLayer: false,
        remoteLayer: false,
        serviceLayer: false,
        // plaintext: true doesn't do anything unless using custom socket server.
        plaintext: true,
      },
      storage: {
        enabled: false,
      },
    });

    this.requestsToRedirect = {};

    this.remote.on(EventType.CLIENTS_CONNECTED, () => {
      DevLogger.log(
        `Connection::CLIENTS_CONNECTED id=${this.channelId} receivedDisconnect=${this.receivedDisconnect} origin=${this.origin}`,
      );
      this.setLoading(true);
      this.receivedDisconnect = false;

      // Auto hide 3seconds after keychain has unlocked if 'ready' wasn't received
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      waitForKeychainUnlocked({ keyringController })
        .then(() => {
          setTimeout(() => {
            if (this._loading) {
              DevLogger.log(
                `Connection::CLIENTS_CONNECTED auto-hide loading after 3s`,
              );
              this.setLoading(false);
            }
          }, 3000);
        })
        .catch((err) => {
          Logger.log(
            err,
            `Connection::CLIENTS_CONNECTED error while waiting for keychain to be unlocked`,
          );
        });
    });

    this.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
      this.setLoading(false);
      DevLogger.log(
        `Connection::CLIENTS_DISCONNECTED id=${
          this.channelId
        } paused=${this.remote.isPaused()} ready=${this.isReady} origin=${
          this.origin
        }`,
      );
      // Disapprove a given host everytime there is a disconnection to prevent hijacking.
      if (!this.remote.isPaused()) {
        // don't disapprove on deeplink
        if (this.origin !== AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
          disapprove(this.channelId);
        }
        this.initialConnection = false;
        this.otps = undefined;
      }

      // detect interruption of connection (can happen on mobile browser ios) - We need to warm the user to redo the connection.
      if (!this.receivedClientsReady && !this.remote.isPaused()) {
        // SOCKET CONNECTION WAS INTERRUPTED
        console.warn(`dApp connection interrupted - please try again`);
        // Terminate to prevent bypassing initial approval when auto-reconnect on deeplink.
        this.disconnect({ terminate: true, context: 'CLIENTS_DISCONNECTED' });
      }

      this.receivedDisconnect = true;
      // Reset connection state
      this.isReady = false;
      this.receivedClientsReady = false;
      DevLogger.log(
        `Connection::CLIENTS_DISCONNECTED id=${this.channelId} switch isReady ==> false`,
      );
    });

    this.remote.on(
      EventType.CLIENTS_READY,
      async (clientsReadyMsg: { originatorInfo: OriginatorInfo }) => {
        try {
          await handleConnectionReady({
            originatorInfo: clientsReadyMsg.originatorInfo,
            Engine,
            updateOriginatorInfos,
            approveHost,
            disapprove,
            rpcQueueManager: this.rpcQueueManager,
            batchRpcManager: this.batchRPCManager,
            connection: this,
          });
        } catch (error) {
          Logger.error(error as Error, 'Connection not initialized');
          throw error;
        }
      },
    );

    this.remote.on(
      EventType.MESSAGE,
      async (message: CommunicationLayerMessage) => {
        if (
          !this.backgroundBridge ||
          !this.rpcQueueManager ||
          !this.batchRPCManager
        ) {
          throw new Error('Connection not initialized');
        }

        try {
          await handleConnectionMessage({
            message,
            Engine,
            backgroundBridge: this.backgroundBridge,
            rpcQueueManager: this.rpcQueueManager,
            batchRpcManager: this.batchRPCManager,
            connection: this,
          });
        } catch (error) {
          Logger.error(error as Error, 'Connection not initialized');
          throw error;
        }
      },
    );
  }

  public connect({ withKeyExchange }: { withKeyExchange: boolean }) {
    DevLogger.log(
      `Connection::connect() withKeyExchange=${withKeyExchange} id=${this.channelId}`,
    );
    this.remote.connectToChannel(this.channelId, withKeyExchange);
    this.receivedDisconnect = false;
    this.setLoading(true);
  }

  sendAuthorized(force?: boolean) {
    if (this.authorizedSent && force !== true) {
      // Prevent double sending authorized event.
      return;
    }

    this.remote
      .sendMessage({ type: MessageType.AUTHORIZED })
      .then(() => {
        this.authorizedSent = true;
      })
      .catch((err) => {
        Logger.log(err, `sendAuthorized() failed to send 'authorized'`);
      });
  }

  setLoading(loading: boolean) {
    this._loading = loading;
    this.emit(CONNECTION_LOADING_EVENT, { loading });
  }

  getLoading() {
    return this._loading;
  }

  pause() {
    this.remote.pause();
  }

  resume() {
    DevLogger.log(`Connection::resume() id=${this.channelId}`);
    this.remote.resume();
    this.isResumed = true;
    this.setLoading(false);
  }

  setTrigger(trigger: ConnectionProps['trigger']) {
    DevLogger.log(
      `Connection::setTrigger() id=${this.channelId} trigger=${trigger}`,
    );
    this.trigger = trigger;
  }

  disconnect({ terminate, context }: { terminate: boolean; context?: string }) {
    DevLogger.log(
      `Connection::disconnect() context=${context} id=${this.channelId} terminate=${terminate}`,
    );
    this.receivedClientsReady = false;
    if (terminate) {
      this.remote
        .sendMessage({
          type: MessageType.TERMINATE,
        })
        .catch((err) => {
          Logger.log(err, `Connection failed to send terminate`);
        });
    }
    this.remote.disconnect();
  }

  removeConnection({
    terminate,
    context,
  }: {
    terminate: boolean;
    context?: string;
  }) {
    this.isReady = false;
    this.lastAuthorized = 0;
    this.authorizedSent = false;
    DevLogger.log(
      `Connection::removeConnection() context=${context} id=${this.channelId}`,
    );
    this.disapprove(this.channelId);
    this.disconnect({ terminate, context: 'Connection::removeConnection' });
    this.backgroundBridge?.onDisconnect();
    this.setLoading(false);
  }
}
