import {
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';
import { Platform } from 'react-native';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import BackgroundBridge from '../BackgroundBridge/BackgroundBridge';
import Engine from '../Engine';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../RPCMethods/RPCMethodMiddleware';

import { ApprovalController } from '@metamask/approval-controller';
import { Json } from '@metamask/utils';
import { KeyringController } from '@metamask/keyring-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  CommunicationLayerMessage,
  CommunicationLayerPreference,
  EventType,
  MessageType,
  OriginatorInfo,
  RemoteCommunication,
} from '@metamask/sdk-communication-layer';
import { ethErrors } from 'eth-rpc-errors';
import { EventEmitter2 } from 'eventemitter2';
import { PROTOCOLS } from '../../constants/deeplinks';
import { Minimizer } from '../NativeModules';
import RPCQueueManager from './RPCQueueManager';
import {
  ApprovedHosts,
  CONNECTION_LOADING_EVENT,
  HOUR_IN_MS,
  METHODS_TO_DELAY,
  METHODS_TO_REDIRECT,
  approveHostProps,
} from './SDKConnect';
import DevLogger from './utils/DevLogger';
import generateOTP from './utils/generateOTP.util';
import {
  wait,
  waitForConnectionReadiness,
  waitForEmptyRPCQueue,
  waitForKeychainUnlocked,
} from './utils/wait.util';
import BatchRPCManager, { BatchRPCState } from './BatchRPCManager';

export interface ConnectionProps {
  id: string;
  otherPublicKey: string;
  origin: string;
  reconnect?: boolean;
  initialConnection?: boolean;
  originatorInfo?: OriginatorInfo;
  validUntil?: number;
  lastAuthorized?: number; // timestamp of last received activity
}

// eslint-disable-next-line
const { version } = require('../../../package.json');

export const RPC_METHODS = {
  METAMASK_GETPROVIDERSTATE: 'metamask_getProviderState',
  METAMASK_CONNECTSIGN: 'metamask_connectSign',
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

  private batchRPCManager: BatchRPCManager;

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
      `Connection::constructor() id=${this.channelId} initialConnection=${this.initialConnection} lastAuthorized=${this.lastAuthorized}`,
    );

    if (!this.channelId) {
      throw new Error('Connection channelId is undefined');
    }

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
        const approvalController = (
          Engine.context as { ApprovalController: ApprovalController }
        ).ApprovalController;

        // clients_ready may be sent multple time (from sdk <0.2.0).
        const updatedOriginatorInfo = clientsReadyMsg?.originatorInfo;
        const apiVersion = updatedOriginatorInfo?.apiVersion;
        this.receivedClientsReady = true;

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

        DevLogger.log(
          `SDKConnect::CLIENTS_READY id=${this.channelId} apiVersion=${apiVersion}`,
        );
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
        } else if (message.type === 'ping') {
          DevLogger.log(`Connection::ping id=${this.channelId}`);
          return;
        }

        // ignore anything other than RPC methods
        if (!message.method || !message.id) {
          return;
        }

        const lcMethod = message.method.toLowerCase();
        let needsRedirect = METHODS_TO_REDIRECT[message?.method] ?? false;

        if (needsRedirect) {
          this.requestsToRedirect[message?.id] = true;
        }

        // Keep this section only for backward compatibility otherwise metamask doesn't redirect properly.
        if (
          !this.originatorInfo?.apiVersion &&
          !needsRedirect &&
          // this.originatorInfo?.platform !== 'unity' &&
          lcMethod === RPC_METHODS.METAMASK_GETPROVIDERSTATE.toLowerCase()
        ) {
          // Manually force redirect if apiVersion isn't defined for backward compatibility
          needsRedirect = true;
          this.requestsToRedirect[message?.id] = true;
        }

        // Wait for keychain to be unlocked before handling rpc calls.
        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;
        await waitForKeychainUnlocked({
          keyringController,
          context: 'connection::on_message',
        });

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
        if (lcMethod === RPC_METHODS.METAMASK_CONNECTSIGN.toLowerCase()) {
          // Replace with personal_sign
          message.method = RPC_METHODS.PERSONAL_SIGN;
          if (
            !(
              message?.params &&
              Array.isArray(message.params) &&
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
        } else if (lcMethod === RPC_METHODS.METAMASK_BATCH.toLowerCase()) {
          DevLogger.log(`metamask_batch`, JSON.stringify(message, null, 2));
          if (
            !(
              message?.params &&
              Array.isArray(message.params) &&
              message.params.length > 0
            )
          ) {
            throw new Error('Invalid message format');
          }
          const rpcs = message.params;
          // Add rpcs to the batch manager
          this.batchRPCManager.add({ id: message.id, rpcs });

          // Send the first rpc method to the background bridge
          const rpc = rpcs[0];
          rpc.id = message.id + `_0`; // Add index to id to keep track of the order
          rpc.jsonrpc = '2.0';
          DevLogger.log(
            `metamask_batch method=${rpc.method} id=${rpc.id}`,
            rpc.params,
          );
          this.backgroundBridge?.onMessage({
            name: 'metamask-provider',
            data: rpc,
            origin: 'sdk',
          });

          return;
        }

        this.rpcQueueManager.add({
          id: (message.id as string) ?? 'unknown',
          method: message.method,
        });

        // We have to implement this method here since the eth_sendTransaction in Engine is not working because we can't send correct origin
        if (lcMethod === RPC_METHODS.ETH_SENDTRANSACTION.toLowerCase()) {
          if (
            !(
              message?.params &&
              Array.isArray(message.params) &&
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
    DevLogger.log(`Connection::resume() id=${this.channelId}`);
    this.remote.resume();
    this.isResumed = true;
    this.setLoading(false);
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

  async handleBatchRpcResponse({
    chainRpcs,
    msg,
  }: {
    chainRpcs: BatchRPCState;
    msg: any;
  }) {
    const isLastRpc = chainRpcs.index === chainRpcs.rpcs.length - 1;
    const hasError = msg?.data?.error;
    const origRpcId = parseInt(chainRpcs.baseId);
    const result = chainRpcs.rpcs
      .filter((rpc) => rpc.response !== undefined)
      .map((rpc) => rpc.response);
    result.push(msg?.data?.result);

    DevLogger.log(
      `handleChainRpcResponse origRpcId=${origRpcId} isLastRpc=${isLastRpc} hasError=${hasError}`,
      chainRpcs,
    );

    if (hasError) {
      // Cancel the whole chain if any of the rpcs fails, send previous responses with current error
      const data = {
        id: origRpcId,
        jsonrpc: '2.0',
        result,
        error: msg?.data?.error,
      };
      const response = {
        data,
        name: 'metamask-provider',
      };
      await this.sendMessage(response);
      // Delete the chain from the chainRPCManager
      this.batchRPCManager.remove(chainRpcs.baseId);
    } else if (isLastRpc) {
      // Respond to the original rpc call with the list of responses append the current response
      DevLogger.log(
        `handleChainRpcResponse id=${chainRpcs.baseId} result`,
        result,
      );
      const data = {
        id: origRpcId,
        jsonrpc: '2.0',
        result,
      };
      const response = {
        data,
        name: 'metamask-provider',
      };
      await this.sendMessage(response);
      // Delete the chain from the chainRPCManager
      this.batchRPCManager.remove(chainRpcs.baseId);
    } else {
      // Save response and send the next rpc method
      this.batchRPCManager.addResponse({
        id: chainRpcs.baseId,
        index: chainRpcs.index,
        response: msg?.data?.result,
      });
      // Send the next rpc method to the background bridge
      const nextRpc = chainRpcs.rpcs[chainRpcs.index + 1];
      nextRpc.id = chainRpcs.baseId + `_${chainRpcs.index + 1}`; // Add index to id to keep track of the order
      nextRpc.jsonrpc = '2.0';
      DevLogger.log(
        `handleChainRpcResponse method=${nextRpc.method} id=${nextRpc.id}`,
        nextRpc.params,
      );
      this.backgroundBridge?.onMessage({
        name: 'metamask-provider',
        data: nextRpc,
        origin: 'sdk',
      });
    }
  }

  async sendMessage(msg: any) {
    const msgId = msg?.data?.id + '';
    const needsRedirect = this.requestsToRedirect[msgId] !== undefined;
    const method = this.rpcQueueManager.getId(msgId);

    DevLogger.log(`Connection::sendMessage`, msg);
    // handle multichain rpc call responses separately
    const chainRPCs = this.batchRPCManager.getById(msgId);
    if (chainRPCs) {
      await this.handleBatchRpcResponse({ chainRpcs: chainRPCs, msg });
      return;
    }

    if (msgId && method) {
      this.rpcQueueManager.remove(msgId);
    }

    this.remote.sendMessage(msg).catch((err) => {
      Logger.log(err, `Connection::sendMessage failed to send`);
    });

    DevLogger.log(
      `Connection::sendMessage method=${method} id=${msgId} needsRedirect=${needsRedirect} origin=${this.origin}`,
    );

    if (!needsRedirect) {
      return;
    }

    delete this.requestsToRedirect[msgId];

    if (this.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE) return;

    try {
      if (METHODS_TO_DELAY[method]) {
        await wait(1200);
      }
      await waitForEmptyRPCQueue(this.rpcQueueManager);
      DevLogger.log(
        `Connection::sendMessage method=${method} origin=${origin} id=${msgId} goBack()`,
      );

      await wait(100);
      Minimizer.goBack();
    } catch (err) {
      Logger.log(
        err,
        `Connection::sendMessage error while waiting for empty rpc queue`,
      );
    }
  }
}
