import { StackNavigationProp } from '@react-navigation/stack';
import BackgroundTimer from 'react-native-background-timer';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../AppConstants';
import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';
import {
  AppState,
  NativeEventSubscription,
  NativeModules,
  Platform,
} from 'react-native';
import Logger from '../../util/Logger';
import Device from '../../util/device';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';

import { ApprovalController } from '@metamask/approval-controller';
import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  CommunicationLayerMessage,
  CommunicationLayerPreference,
  ConnectionStatus,
  EventType,
  MessageType,
  OriginatorInfo,
  RemoteCommunication,
} from '@metamask/sdk-communication-layer';
import { ethErrors } from 'eth-rpc-errors';
import { EventEmitter2 } from 'eventemitter2';
import Routes from '../../../app/constants/navigation/Routes';
import generateOTP from './utils/generateOTP.util';
import {
  wait,
  waitForConnectionReadiness,
  waitForEmptyRPCQueue,
  waitForKeychainUnlocked,
} from './utils/wait.util';
import { Json } from '@metamask/controller-utils';
import { PROTOCOLS } from '../../constants/deeplinks';
import { Minimizer } from '../NativeModules';
import AndroidService from './AndroidSDK/AndroidService';
import RPCQueueManager from './RPCQueueManager';
import DevLogger from './utils/DevLogger';

export const MIN_IN_MS = 1000 * 60;
export const HOUR_IN_MS = MIN_IN_MS * 60;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const DEFAULT_SESSION_TIMEOUT_MS = 30 * DAY_IN_MS;

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
  initialConnection?: boolean;
  originatorInfo?: OriginatorInfo;
  validUntil: number;
  lastAuthorized?: number; // timestamp of last received activity
}
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

const CONNECTION_LOADING_EVENT = 'loading';

export const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
  eth_requestAccounts: true,
  eth_sendTransaction: true,
  eth_signTransaction: true,
  eth_sign: true,
  personal_sign: true,
  eth_signTypedData: true,
  eth_signTypedData_v3: true,
  eth_signTypedData_v4: true,
  wallet_watchAsset: true,
  wallet_addEthereumChain: true,
  wallet_switchEthereumChain: true,
  metamask_connectSign: true,
};

export const METHODS_TO_DELAY: { [method: string]: boolean } = {
  ...METHODS_TO_REDIRECT,
  eth_requestAccounts: false,
};

// eslint-disable-next-line
const { version } = require('../../../package.json');

export class Connection extends EventEmitter2 {
  channelId;
  remote: RemoteCommunication;
  requestsToRedirect: { [request: string]: boolean } = {};
  origin: string;
  host: string;
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
   * isResumed is used to manage the loading state.
   */
  isResumed = false;
  initialConnection: boolean;

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

  /**
   * Should only be accesses via getter / setter.
   */
  private _loading = false;
  private approvalPromise?: Promise<unknown>;

  private rpcQueueManager: RPCQueueManager;

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
    approveHost,
    lastAuthorized,
    getApprovedHosts,
    disapprove,
    revalidate,
    isApproved,
    updateOriginatorInfos,
    onTerminate,
  }: ConnectionProps & {
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
    this.channelId = id;
    this.lastAuthorized = lastAuthorized;
    this.reconnect = reconnect || false;
    this.isResumed = false;
    this.originatorInfo = originatorInfo;
    this.initialConnection = initialConnection === true;
    this.host = `${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}${this.channelId}`;
    this.rpcQueueManager = rpcQueueManager;
    this.approveHost = approveHost;
    this.getApprovedHosts = getApprovedHosts;
    this.disapprove = disapprove;
    this.revalidate = revalidate;
    this.isApproved = isApproved;
    this.onTerminate = onTerminate;

    this.setLoading(true);

    DevLogger.log(
      `Connection::constructor() id=${this.channelId} initialConnection=${this.initialConnection} lastAuthorized=${this.lastAuthorized}`,
    );

    this.remote = new RemoteCommunication({
      platformType: AppConstants.MM_SDK.PLATFORM as 'metamask-mobile',
      communicationServerUrl: AppConstants.MM_SDK.SERVER_URL,
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

    this.sendMessage = this.sendMessage.bind(this);

    this.remote.on(EventType.CLIENTS_CONNECTED, () => {
      this.setLoading(true);
      this.receivedDisconnect = false;
      // Auto hide after 3seconds if 'ready' wasn't received
      setTimeout(() => {
        this.setLoading(false);
      }, 3000);
    });

    this.remote.on(EventType.CLIENTS_DISCONNECTED, () => {
      this.setLoading(false);
      // Disapprove a given host everytime there is a disconnection to prevent hijacking.
      if (!this.remote.isPaused()) {
        // don't disapprove on deeplink
        if (this.origin !== AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
          disapprove(this.channelId);
        }
        this.initialConnection = false;
        this.otps = undefined;
      }
      this.receivedDisconnect = true;
      this.isReady = false;
    });

    this.remote.on(
      EventType.CLIENTS_READY,
      async (clientsReadyMsg: { originatorInfo: OriginatorInfo }) => {
        const approvalController = (
          Engine.context as { ApprovalController: ApprovalController }
        ).ApprovalController;

        // clients_ready may be sent multple time (from sdk <0.2.0).
        const updatedOriginatorInfo = clientsReadyMsg?.originatorInfo;
        const apiVersion = updatedOriginatorInfo?.apiVersion;

        // backward compatibility with older sdk -- always first request approval
        if (!apiVersion) {
          // clear previous pending approval
          if (approvalController.get(this.channelId)) {
            approvalController.reject(
              this.channelId,
              ethErrors.provider.userRejectedRequest(),
            );
          }

          this.approvalPromise = undefined;
        }

        if (!updatedOriginatorInfo) {
          return;
        }

        this.originatorInfo = updatedOriginatorInfo;
        updateOriginatorInfos({
          channelId: this.channelId,
          originatorInfo: updatedOriginatorInfo,
        });

        if (this.isReady) {
          return;
        }

        // TODO following logic blocks should be simplified (too many conditions)
        // Should be done in a separate PR to avoid breaking changes and separate SDKConnect / Connection logic in different files.
        if (
          this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
        ) {
          // Ask for authorisation?
          // Always need to re-approve connection first.
          await this.checkPermissions({
            lastAuthorized: this.lastAuthorized,
          });

          this.sendAuthorized(true);
        } else if (
          !this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
        ) {
          const currentTime = Date.now();

          const OTPExpirationDuration =
            Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || HOUR_IN_MS;

          const channelWasActiveRecently =
            !!this.lastAuthorized &&
            currentTime - this.lastAuthorized < OTPExpirationDuration;

          if (channelWasActiveRecently) {
            this.approvalPromise = undefined;

            // Prevent auto approval if metamask is killed and restarted
            disapprove(this.channelId);

            // Always need to re-approve connection first.
            await this.checkPermissions({
              lastAuthorized: this.lastAuthorized,
            });

            this.sendAuthorized(true);
          } else {
            if (approvalController.get(this.channelId)) {
              // cleaning previous pending approval
              approvalController.reject(
                this.channelId,
                ethErrors.provider.userRejectedRequest(),
              );
            }
            this.approvalPromise = undefined;

            if (!this.otps) {
              this.otps = generateOTP();
            }
            this.sendMessage({
              type: MessageType.OTP,
              otpAnswer: this.otps?.[0],
            }).catch((err) => {
              Logger.log(err, `SDKConnect:: Connection failed to send otp`);
            });
            // Prevent auto approval if metamask is killed and restarted
            disapprove(this.channelId);

            // Always need to re-approve connection first.
            await this.checkPermissions();
            this.sendAuthorized(true);
            this.lastAuthorized = Date.now();
          }
        } else if (
          !this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
        ) {
          // Deeplink channels are automatically approved on re-connection.
          const hostname =
            AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + this.channelId;
          approveHost({
            host: hostname,
            hostname,
            context: 'clients_ready',
          });
          this.remote
            .sendMessage({ type: 'authorized' as MessageType })
            .catch((err) => {
              Logger.log(err, `Connection failed to send 'authorized`);
            });
        } else if (
          this.initialConnection &&
          this.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
        ) {
          // Should ask for confirmation to reconnect?
          await this.checkPermissions();
          this.sendAuthorized(true);
        }

        this.setupBridge(updatedOriginatorInfo);
        this.isReady = true;
      },
    );

    this.remote.on(
      EventType.MESSAGE,
      async (message: CommunicationLayerMessage) => {
        // TODO should probably handle this in a separate EventType.TERMINATE event.
        // handle termination message
        if (message.type === MessageType.TERMINATE) {
          // Delete connection from storage
          this.onTerminate({ channelId: this.channelId });
          return;
        }

        // ignore anything other than RPC methods
        if (!message.method || !message.id) {
          return;
        }

        let needsRedirect = METHODS_TO_REDIRECT[message?.method] ?? false;

        if (needsRedirect) {
          this.requestsToRedirect[message?.id] = true;
        }

        // Keep this section only for backward compatibility otherwise metamask doesn't redirect properly.
        if (
          !this.originatorInfo?.apiVersion &&
          !needsRedirect &&
          // this.originatorInfo?.platform !== 'unity' &&
          message?.method === 'metamask_getProviderState'
        ) {
          // Manually force redirect if apiVersion isn't defined for backward compatibility
          needsRedirect = true;
          this.requestsToRedirect[message?.id] = true;
        }

        // Wait for keychain to be unlocked before handling rpc calls.
        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;
        await waitForKeychainUnlocked({ keyringController });

        this.setLoading(false);

        // Wait for bridge to be ready before handling messages.
        // It will wait until user accept/reject the connection request.
        try {
          await this.checkPermissions({ message });
          if (!this.receivedDisconnect) {
            await waitForConnectionReadiness({ connection: this });
            this.sendAuthorized();
          } else {
            // Reset state to continue communication after reconnection.
            this.isReady = true;
            this.receivedDisconnect = false;
          }
        } catch (error) {
          // Approval failed - redirect to app with error.
          this.sendMessage({
            data: {
              error,
              id: message.id,
              jsonrpc: '2.0',
            },
            name: 'metamask-provider',
          }).catch(() => {
            Logger.log(error, `Connection approval failed`);
          });
          this.approvalPromise = undefined;
          return;
        }

        // Special case for metamask_connectSign
        if (message.method === 'metamask_connectSign') {
          // Replace with personal_sign
          message.method = 'personal_sign';
          if (
            !(
              message.params &&
              Array.isArray(message?.params) &&
              message.params.length > 0
            )
          ) {
            throw new Error('Invalid message format');
          }
          // Append selected address to params
          const preferencesController = (
            Engine.context as {
              PreferencesController: PreferencesController;
            }
          ).PreferencesController;
          const selectedAddress = preferencesController.state.selectedAddress;
          message.params = [(message.params as string[])[0], selectedAddress];
          if (Platform.OS === 'ios') {
            // TODO: why does ios (older devices) requires a delay after request is initially approved?
            await wait(500);
          }
          Logger.log(`metamask_connectSign`, message.params);
        }

        this.rpcQueueManager.add({
          id: (message.id as string) ?? 'unknown',
          method: message.method,
        });

        // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
        if (message.method === 'eth_sendTransaction') {
          if (
            !(
              message.params &&
              Array.isArray(message?.params) &&
              message.params.length > 0
            )
          ) {
            throw new Error('Invalid message format');
          }

          const transactionController = (
            Engine.context as { TransactionController: TransactionController }
          ).TransactionController;
          try {
            const hash = await (
              await transactionController.addTransaction(message.params[0], {
                deviceConfirmedOn: WalletDevice.MM_MOBILE,
                origin: this.originatorInfo?.url
                  ? AppConstants.MM_SDK.SDK_REMOTE_ORIGIN +
                    this.originatorInfo?.url
                  : undefined,
              })
            ).result;
            await this.sendMessage({
              data: {
                id: message.id,
                jsonrpc: '2.0',
                result: hash,
              },
              name: 'metamask-provider',
            });
          } catch (error) {
            this.sendMessage({
              data: {
                error,
                id: message.id,
                jsonrpc: '2.0',
              },
              name: 'metamask-provider',
            }).catch((err) => {
              Logger.log(err, `Connection failed to send otp`);
            });
          }
          return;
        }

        this.backgroundBridge?.onMessage({
          name: 'metamask-provider',
          data: message,
          origin: 'sdk',
        });
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
      .sendMessage({ type: 'authorized' as MessageType })
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

  private setupBridge(originatorInfo: OriginatorInfo) {
    if (this.backgroundBridge) {
      return;
    }

    this.backgroundBridge = new BackgroundBridge({
      webview: null,
      isMMSDK: true,
      // TODO: need to rewrite backgroundBridge to directly provide the origin instead of url format.
      url: PROTOCOLS.METAMASK + '://' + AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
      isRemoteConn: true,
      sendMessage: this.sendMessage,
      getApprovedHosts: () => this.getApprovedHosts('backgroundBridge'),
      remoteConnHost: this.host,
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        hostname: string;
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname: this.host,
          getProviderState,
          isMMSDK: true,
          navigation: null, //props.navigation,
          getApprovedHosts: () => this.getApprovedHosts('rpcMethodMiddleWare'),
          setApprovedHosts: (hostname: string) => {
            this.approveHost({
              host: hostname,
              hostname,
              context: 'setApprovedHosts',
            });
          },
          approveHost: (approveHostname) =>
            this.approveHost({
              host: this.host,
              hostname: approveHostname,
              context: 'rpcMethodMiddleWare',
            }),
          // Website info
          url: {
            current: originatorInfo?.url,
          },
          title: {
            current: originatorInfo?.title,
          },
          icon: { current: undefined },
          // Bookmarks
          isHomepage: () => false,
          // Show autocomplete
          fromHomepage: { current: false },
          // Wizard
          wizardScrollAdjusted: { current: false },
          tabId: '',
          isWalletConnect: false,
          analytics: {
            isRemoteConn: true,
            platform:
              originatorInfo?.platform ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
          toggleUrlModal: () => null,
          injectHomePageScripts: () => null,
        }),
      isMainFrame: true,
      isWalletConnect: false,
      wcRequestActions: undefined,
    });
  }

  /**
   * Check if current channel has been allowed.
   *
   * @param message
   * @returns {boolean} true when host is approved or user approved the request.
   * @throws error if the user reject approval request.
   */
  private async checkPermissions({
    // eslint-disable-next-line
    message,
    lastAuthorized,
  }: {
    message?: CommunicationLayerMessage;
    lastAuthorized?: number;
  } = {}): Promise<boolean> {
    const OTPExpirationDuration =
      Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || HOUR_IN_MS;

    const channelWasActiveRecently =
      !!lastAuthorized && Date.now() - lastAuthorized < OTPExpirationDuration;

    DevLogger.log(
      `SDKConnect checkPermissions initialConnection=${this.initialConnection} lastAuthorized=${lastAuthorized} OTPExpirationDuration ${OTPExpirationDuration} channelWasActiveRecently ${channelWasActiveRecently}`,
    );
    // only ask approval if needed
    const approved = this.isApproved({
      channelId: this.channelId,
      context: 'checkPermission',
    });

    const preferencesController = (
      Engine.context as { PreferencesController: PreferencesController }
    ).PreferencesController;
    const selectedAddress = preferencesController.state.selectedAddress;

    if (approved && selectedAddress) {
      return true;
    }

    const approvalController = (
      Engine.context as { ApprovalController: ApprovalController }
    ).ApprovalController;

    if (this.approvalPromise) {
      // Wait for result and clean the promise afterwards.
      await this.approvalPromise;
      this.approvalPromise = undefined;
      return true;
    }

    if (!this.initialConnection && AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
      this.revalidate({ channelId: this.channelId });
    }

    if (channelWasActiveRecently) {
      return true;
    }

    const approvalRequest = {
      origin: this.origin,
      type: ApprovalTypes.CONNECT_ACCOUNTS,
      requestData: {
        hostname: this.originatorInfo?.title ?? '',
        pageMeta: {
          channelId: this.channelId,
          reconnect: !this.initialConnection,
          origin: this.origin,
          url: this.originatorInfo?.url ?? '',
          title: this.originatorInfo?.title ?? '',
          icon: this.originatorInfo?.icon ?? '',
          otps: this.otps ?? [],
          apiVersion: this.originatorInfo?.apiVersion,
          analytics: {
            request_source: AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN,
            request_platform:
              this.originatorInfo?.platform ??
              AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
        } as Json,
      },
      id: this.channelId,
    };
    this.approvalPromise = approvalController.add(approvalRequest);

    await this.approvalPromise;
    // Clear previous permissions if already approved.
    this.revalidate({ channelId: this.channelId });
    this.approvalPromise = undefined;
    return true;
  }

  pause() {
    this.remote.pause();
  }

  resume() {
    this.remote.resume();
    this.isResumed = true;
    this.setLoading(false);
  }

  disconnect({ terminate, context }: { terminate: boolean; context?: string }) {
    DevLogger.log(
      `Connection::disconnect() context=${context} id=${this.channelId} terminate=${terminate}`,
    );
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

  async sendMessage(msg: any) {
    const needsRedirect = this.requestsToRedirect[msg?.data?.id] !== undefined;
    const method = this.rpcQueueManager.getId(msg?.data?.id);

    if (msg?.data?.id && method) {
      this.rpcQueueManager.remove(msg?.data?.id);
    }

    this.remote.sendMessage(msg).catch((err) => {
      Logger.log(err, `Connection::sendMessage failed to send`);
    });

    if (!needsRedirect) {
      return;
    }

    delete this.requestsToRedirect[msg?.data?.id];

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    try {
      await waitForEmptyRPCQueue(this.rpcQueueManager);
      if (METHODS_TO_DELAY[method]) {
        await wait(1000);
      }
      this.setLoading(false);

      Minimizer.goBack();
    } catch (err) {
      Logger.log(
        err,
        `Connection::sendMessage error while waiting for empty rpc queue`,
      );
    }
  }
}

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

    await wait(1000);
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
