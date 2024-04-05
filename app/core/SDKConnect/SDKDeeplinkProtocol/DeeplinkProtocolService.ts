import { KeyringController } from '@metamask/keyring-controller';
import { NetworkController } from '@metamask/network-controller';
import { PermissionController } from '@metamask/permission-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import { MessageType, OriginatorInfo } from '@metamask/sdk-communication-layer';
import { Linking } from 'react-native';
import { PROTOCOLS } from '../../../constants/deeplinks';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import getRpcMethodMiddleware from '../../../core/RPCMethods/RPCMethodMiddleware';
import Logger from '../../../util/Logger';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { DappConnections } from '../AndroidSDK/dapp-sdk-types';
import BatchRPCManager from '../BatchRPCManager';
import { ECIES } from '../ECIES/ECIES';
import RPCQueueManager from '../RPCQueueManager';
import SDKConnect from '../SDKConnect';
import {
  DEFAULT_SESSION_TIMEOUT_MS,
  METHODS_TO_DELAY,
  RPC_METHODS,
} from '../SDKConnectConstants';
import handleBatchRpcResponse from '../handlers/handleBatchRpcResponse';
import handleCustomRpcCalls from '../handlers/handleCustomRpcCalls';
import DevLogger from '../utils/DevLogger';
import { wait, waitForKeychainUnlocked } from '../utils/wait.util';
import { toHexadecimal } from '../../../util/number';

export default class DeeplinkProtocolService {
  private connections: DappConnections = {};
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};
  private encryptionManagerByClientId: { [clientId: string]: ECIES } = {};
  private rpcQueueManager = new RPCQueueManager();
  private batchRPCManager: BatchRPCManager = new BatchRPCManager('deeplink');
  // To keep track in order to get the associated bridge to handle batch rpc calls
  private currentClientId?: string;
  private dappPublicKeyByClientId: {
    [clientId: string]: string;
  } = {};

  private schemeByClientId: {
    [clientId: string]: string;
  } = {};

  public constructor() {
    DevLogger.log('DeeplinkProtocolService:: initialized');
  }

  private setupBridge(clientInfo: {
    clientId: string;
    originatorInfo: OriginatorInfo;
  }) {
    DevLogger.log(
      `DeeplinkProtocolService::setupBridge for id=${
        clientInfo.clientId
      } exists=${!!this.bridgeByClientId[clientInfo.clientId]}}`,
    );

    if (this.bridgeByClientId[clientInfo.clientId]) {
      return;
    }

    const bridge = new BackgroundBridge({
      webview: null,
      channelId: clientInfo.clientId,
      isMMSDK: true,
      url: PROTOCOLS.METAMASK + '://' + AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
      isRemoteConn: true,
      sendMessage: this.sendMessage.bind(this),
      getApprovedHosts: (host: string) => ({
        [host]: true,
      }),
      remoteConnHost:
        clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
      getRpcMethodMiddleware: ({
        getProviderState,
      }: {
        hostname: string;
        getProviderState: any;
      }) =>
        getRpcMethodMiddleware({
          hostname:
            clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
          channelId: clientInfo.clientId,
          getProviderState,
          isMMSDK: true,
          navigation: null, //props.navigation,
          getApprovedHosts: (host: string) => ({
            [host]: true,
          }),
          setApprovedHosts: () => true,
          approveHost: () => ({}),
          // Website info
          url: {
            current: clientInfo.originatorInfo?.url,
          },
          title: {
            current: clientInfo.originatorInfo?.title,
          },
          icon: {
            current: clientInfo.originatorInfo?.icon,
          },
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
              clientInfo.originatorInfo.platform ??
              AppConstants.MM_SDK.UNKNOWN_PARAM,
          },
          toggleUrlModal: () => null,
          injectHomePageScripts: () => null,
        }),
      isMainFrame: true,
      isWalletConnect: false,
      wcRequestActions: undefined,
    });

    this.bridgeByClientId[clientInfo.clientId] = bridge;
  }

  async sendMessage(message: any, forceRedirect?: boolean) {
    const encryptionManager =
      this.encryptionManagerByClientId[this.currentClientId ?? ''];

    const id = message?.data?.id;

    let rpcMethod = this.rpcQueueManager.getId(id);

    DevLogger.log(
      `DeeplinkProtocolService::sendMessage method=${rpcMethod}`,
      message,
    );
    // handle multichain rpc call responses separately
    const chainRPCs = this.batchRPCManager.getById(id);
    if (chainRPCs) {
      const isLastRpcOrError = await handleBatchRpcResponse({
        chainRpcs: chainRPCs,
        msg: message,
        backgroundBridge: this.bridgeByClientId[this.currentClientId ?? ''],
        batchRPCManager: this.batchRPCManager,
        sendMessage: ({ msg }) => this.sendMessage(msg),
      });

      DevLogger.log(
        `DeeplinkProtocolService::sendMessage isLastRpc=${isLastRpcOrError}`,
        chainRPCs,
      );

      if (!isLastRpcOrError) {
        DevLogger.log(
          `DeeplinkProtocolService::sendMessage NOT last rpc --- skip goBack()`,
          chainRPCs,
        );
        this.rpcQueueManager.remove(id);
        // Only continue processing the message and goback if all rpcs in the batch have been handled
        return;
      }

      // Always set the method to metamask_batch otherwise it may not have been set correctly because of the batch rpc flow.
      rpcMethod = RPC_METHODS.METAMASK_BATCH;
      DevLogger.log(
        `DeeplinkProtocolService::sendMessage chainRPCs=${chainRPCs} COMPLETED!`,
      );
    }

    this.rpcQueueManager.remove(id);

    if (!rpcMethod && forceRedirect !== true) {
      DevLogger.log(
        `DeeplinkProtocolService::sendMessage no rpc method --- rpcMethod=${rpcMethod} forceRedirect=${forceRedirect} --- skip goBack()`,
      );

      return;
    }

    try {
      if (METHODS_TO_DELAY[rpcMethod]) {
        // Add delay to see the feedback modal
        await wait(1000);
      }

      if (!this.rpcQueueManager.isEmpty()) {
        DevLogger.log(
          `DeeplinkProtocolService::sendMessage NOT empty --- skip goBack()`,
          this.rpcQueueManager.get(),
        );
        return;
      }

      DevLogger.log(`DeeplinkProtocolService::sendMessage empty --- goBack()`);

      const dappPublicKey =
        this.dappPublicKeyByClientId[this.currentClientId ?? ''];

      DevLogger.log(
        `DeeplinkProtocolService::sendMessage sending deeplink toHex`,
        message,
        dappPublicKey,
      );

      DevLogger.log(
        `DeeplinkProtocolService::sendMessage sending deeplink message=${JSON.stringify(
          message,
        )}`,
      );

      const encryptedMessage = encryptionManager.encrypt(
        JSON.stringify(message),
        dappPublicKey,
      );

      // TODO: Remove this log after testing
      DevLogger.log(
        `DeeplinkProtocolService::sendMessage sending deeplink`,
        encryptedMessage,
        this.currentClientId,
      );

      this.openDeeplink(encryptedMessage, this.currentClientId ?? '').catch(
        (err) => {
          Logger.log(
            err,
            `DeeplinkProtocolService::sendMessage error sending deeplink`,
          );
        },
      );
    } catch (error) {
      Logger.log(
        error,
        `DeeplinkProtocolService:: error waiting for empty rpc queue`,
      );
    }
  }

  private async openDeeplink(message: string, clientId: string) {
    const scheme = this.schemeByClientId[clientId];
    const encryptionManager = this.encryptionManagerByClientId[clientId];

    const walletPublicKey = encryptionManager.getPublicKey();

    const dappPublicKey = this.dappPublicKeyByClientId[clientId];

    DevLogger.log(
      `DeeplinkProtocolService::openDeeplink walletPublicKey=${walletPublicKey} dappPublicKey=${dappPublicKey}`,
    );

    DevLogger.log(
      `DeeplinkProtocolService::openDeeplink message=${message} clientId=${clientId}`,
    );

    const deeplink = `${scheme}://mmsdk?pubkey=${walletPublicKey}&message=${message}`;

    DevLogger.log(
      `DeeplinkProtocolService::openDeeplink deeplink=${deeplink} clientId=${clientId}`,
    );

    return Linking.openURL(deeplink);
  }
  private async checkPermission({
    channelId,
  }: {
    originatorInfo: OriginatorInfo;
    channelId: string;
  }): Promise<unknown> {
    const permissionsController = (
      Engine.context as { PermissionController: PermissionController<any, any> }
    ).PermissionController;

    return permissionsController.requestPermissions(
      { origin: channelId },
      { eth_accounts: {} },
      { id: channelId },
    );
  }

  public handleConnection(params: {
    dappPublicKey: string;
    url: string;
    scheme: string;
    channelId: string;
    originatorInfo?: OriginatorInfo;
  }) {
    if (!params.originatorInfo) {
      Logger.error(
        'DeeplinkProtocolService::handleConnection no originatorInfo',
        params,
      );

      return;
    }

    this.dappPublicKeyByClientId[params.channelId] = params.dappPublicKey;
    this.schemeByClientId[params.channelId] = params.scheme;

    Logger.log('DeeplinkProtocolService::handleConnection params', params);

    this.encryptionManagerByClientId[params.channelId] = new ECIES();

    const clientInfo = {
      clientId: params.channelId,
      originatorInfo: params.originatorInfo,
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
    };

    this.currentClientId = params.channelId;

    DevLogger.log(`DeeplinkProtocolService::clients_connected`, clientInfo);

    if (this.connections?.[clientInfo.clientId]) {
      // Skip existing client -- bridge has been setup
      Logger.log(
        `DeeplinkProtocolService::clients_connected - existing client, sending ready`,
      );

      // Update connected state
      this.connections[clientInfo.clientId] = {
        ...this.connections[clientInfo.clientId],
        connected: true,
      };

      DevLogger.log(`DeeplinkProtocolService::sendMessage 1`);
      this.sendMessage(
        {
          type: MessageType.READY,
          data: {
            id: clientInfo?.clientId,
          },
        },
        true,
      ).catch((err) => {
        Logger.log(
          `DeeplinkProtocolService::clients_connected - error sending ready message to client ${clientInfo.clientId}`,
          err,
        );
      });
      return;
    }

    const handleEventAsync = async () => {
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;

      await waitForKeychainUnlocked({
        keyringController,
        context: 'DeeplinkProtocolService::setupOnClientsConnectedListener',
      });

      try {
        if (!this.connections?.[clientInfo.clientId]) {
          DevLogger.log(
            `DeeplinkProtocolService::clients_connected - new client ${clientInfo.clientId}}`,
            this.connections,
          );
          // Ask for account permissions
          await this.checkPermission({
            originatorInfo: clientInfo.originatorInfo,
            channelId: clientInfo.clientId,
          });

          this.setupBridge(clientInfo);
          // Save session to SDKConnect
          // Save to local connections
          this.connections[clientInfo.clientId] = {
            connected: true,
            clientId: clientInfo.clientId,
            originatorInfo: clientInfo.originatorInfo,
            validUntil: clientInfo.validUntil,
          };

          await SDKConnect.getInstance().addDappConnection({
            id: clientInfo.clientId,
            lastAuthorized: Date.now(),
            origin: AppConstants.MM_SDK.IOS_SDK,
            originatorInfo: clientInfo.originatorInfo,
            otherPublicKey: '',
            validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
          });
        }

        DevLogger.log(`DeeplinkProtocolService::sendMessage 2`);
        this.sendMessage(
          {
            type: MessageType.READY,
            data: {
              id: clientInfo?.clientId,
            },
          },
          true,
        ).catch((err) => {
          Logger.log(
            err,
            `DeeplinkProtocolService::clients_connected error sending READY message to client`,
          );
        });
      } catch (error) {
        Logger.log(
          error,
          `DeeplinkProtocolService::clients_connected sending jsonrpc error to client - connection rejected`,
        );

        DevLogger.log(`DeeplinkProtocolService::sendMessage 3`);
        this.sendMessage({
          data: {
            error,
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        }).catch((err) => {
          Logger.log(
            err,
            `DeeplinkProtocolService::clients_connected error failed sending jsonrpc error to client`,
          );
        });

        return;
      }
    };

    handleEventAsync().catch((err) => {
      Logger.log(
        err,
        `DeeplinkProtocolService::clients_connected error handling event`,
      );
    });

    // TODO implement deeplink callback
    // copy logic from AndroidService.setupOnClientsConnectedListener

    // Check if existing previous connection for this channelId
    // If not, create a new connection, otherwise update the connection
    // - check permissions
    // - setup background bridge
    // - send message response to the dapp
    // link to the RPCManager
  }

  public handleMessage(params: {
    dappPublicKey: string;
    url: string;
    message: string;
    channelId: string;
  }) {
    DevLogger.log('DeeplinkProtocolService:: params from deeplink', params);

    const encryptionManager =
      this.encryptionManagerByClientId[this.currentClientId ?? ''];

    DevLogger.log(
      'DeeplinkProtocolService:: typeof encryptionManager from deeplink',
      typeof encryptionManager,
    );

    DevLogger.log(
      'DeeplinkProtocolService:: encryptionManager from deeplink',
      encryptionManager,
    );

    const decryptedMessage = encryptionManager.decrypt(params.message);

    const handleEventAsync = async () => {
      let parsedMsg: {
        id: string;
        message: string;
      };

      try {
        await wait(200); // Extra wait to make sure ui is ready

        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;

        await waitForKeychainUnlocked({
          keyringController,
          context: 'DeeplinkProtocolService::setupOnMessageReceivedListener',
        });
      } catch (error) {
        Logger.log(error, `DeeplinkProtocolService::onMessageReceived error`);
      }

      let sessionId: string,
        message: string,
        data: { id: string; jsonrpc: string; method: string; params: any };
      try {
        parsedMsg = JSON.parse(decryptedMessage); // handle message and redirect to corresponding bridge
        sessionId = parsedMsg.id;
        message = parsedMsg.message;
        data = JSON.parse(message);

        // Update connected state
        this.connections[sessionId] = {
          ...this.connections[sessionId],
          connected: true,
        };
      } catch (error) {
        Logger.log(
          error,
          `DeeplinkProtocolService::onMessageReceived invalid json param`,
        );

        DevLogger.log(`DeeplinkProtocolService::sendMessage 4`);
        this.sendMessage({
          data: {
            error,
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        }).catch((err) => {
          Logger.log(
            err,
            `DeeplinkProtocolService::onMessageReceived error sending jsonrpc error message to client ${sessionId}`,
          );
        });
        return;
      }

      let bridge = this.bridgeByClientId[sessionId];

      if (!bridge) {
        console.warn(
          `DeeplinkProtocolService:: Bridge not found for client`,
          `sessionId=${sessionId} data.id=${data.id}`,
        );

        try {
          // Ask users permissions again - it probably means the channel was removed
          await this.checkPermission({
            originatorInfo: this.connections[sessionId]?.originatorInfo ?? {},
            channelId: sessionId,
          });

          // Create new bridge
          this.setupBridge(this.connections[sessionId]);
          bridge = this.bridgeByClientId[sessionId];
        } catch (err) {
          Logger.log(
            err,
            `DeeplinkProtocolService::onMessageReceived error checking permissions`,
          );
          return;
        }
      }

      const preferencesController = (
        Engine.context as {
          PreferencesController: PreferencesController;
        }
      ).PreferencesController;
      const selectedAddress = preferencesController.state.selectedAddress;

      const networkController = (
        Engine.context as {
          NetworkController: NetworkController;
        }
      ).NetworkController;
      const networkId = networkController.state.networkId ?? 1; // default to mainnet;
      // transform networkId to 0x value
      const hexChainId = `0x${networkId.toString(16)}`;

      this.currentClientId = sessionId;
      // Handle custom rpc method
      const processedRpc = await handleCustomRpcCalls({
        batchRPCManager: this.batchRPCManager,
        selectedChainId: hexChainId,
        selectedAddress,
        rpc: { id: data.id, method: data.method, params: data.params },
      });

      DevLogger.log(
        `DeeplinkProtocolService::onMessageReceived processedRpc`,
        processedRpc,
      );

      this.rpcQueueManager.add({
        id: processedRpc?.id ?? data.id,
        method: processedRpc?.method ?? data.method,
      });

      bridge.onMessage({ name: 'metamask-provider', data: processedRpc });
    };

    handleEventAsync().catch((err) => {
      Logger.log(
        err,
        `DeeplinkProtocolService::onMessageReceived error handling event`,
      );
    });
  }
}
