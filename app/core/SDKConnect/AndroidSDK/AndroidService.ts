import { EventEmitter2 } from 'eventemitter2';
import { NativeModules } from 'react-native';
import Engine from '../../Engine';
import { Minimizer } from '../../NativeModules';
import { RPCQueueManager } from '../RPCQueueManager';

import {
  EventType,
  MessageType,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';

import {
  wait,
  waitForAndroidServiceBinding,
  waitForKeychainUnlocked,
} from '../utils/wait.util';

import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware from '../../RPCMethods/RPCMethodMiddleware';
import {
  DEFAULT_SESSION_TIMEOUT_MS,
  METHODS_TO_DELAY,
  METHODS_TO_REDIRECT,
  SDKConnect,
} from '../SDKConnect';

import { KeyringController } from '@metamask/keyring-controller';

import { PROTOCOLS } from '../../../constants/deeplinks';
import handleCustomRpcCalls from '../handlers/handleCustomRpcCalls';
import DevLogger from '../utils/DevLogger';
import AndroidSDKEventHandler from './AndroidNativeSDKEventHandler';
import { AndroidClient } from './android-sdk-types';
import BatchRPCManager from '../BatchRPCManager';
import { PreferencesController } from '@metamask/preferences-controller';
import handleBatchRpcResponse from '../handlers/handleBatchRpcResponse';

export default class AndroidService extends EventEmitter2 {
  private communicationClient = NativeModules.CommunicationClient;
  private connectedClients: { [clientId: string]: AndroidClient } = {};
  private rpcQueueManager = new RPCQueueManager();
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};
  private eventHandler: AndroidSDKEventHandler;
  private batchRPCManager: BatchRPCManager = new BatchRPCManager('android');

  constructor() {
    super();
    this.eventHandler = new AndroidSDKEventHandler();
    this.setupEventListeners()
      .then(() => {
        DevLogger.log(
          `AndroidService::constructor event listeners setup completed`,
        );
        //
      })
      .catch((err) => {
        Logger.log(err, `AndroidService:: error setting up event listeners`);
      });
  }

  private async setupEventListeners(): Promise<void> {
    try {
      // Wait for keychain to be unlocked before handling rpc calls.
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({
        keyringController,
        context: 'AndroidService::setupEventListener',
      });

      DevLogger.log(`AndroidService::setupEventListeners loading connections`);
      const rawConnections =
        await SDKConnect.getInstance().loadAndroidConnections();

      if (rawConnections) {
        Object.values(rawConnections).forEach((connection) => {
          DevLogger.log(
            `AndroidService::setupEventListeners recover client: ${connection.id}`,
          );
          this.connectedClients[connection.id] = {
            clientId: connection.id,
            originatorInfo: connection.originatorInfo as OriginatorInfo,
          };
        });
      } else {
        DevLogger.log(
          `AndroidService::setupEventListeners no previous connections found`,
        );
      }
    } catch (err) {
      // Ignore
    }

    this.setupOnClientsConnectedListener();
    this.setupOnMessageReceivedListener();

    // Bind native module to client
    await SDKConnect.getInstance().bindAndroidSDK();
    this.restorePreviousConnections();
  }

  private setupOnClientsConnectedListener() {
    this.eventHandler.onClientsConnected((sClientInfo: string) => {
      const clientInfo: AndroidClient = JSON.parse(sClientInfo);

      DevLogger.log(`AndroidService::clients_connected`, clientInfo);
      if (this.connectedClients?.[clientInfo.clientId]) {
        // Skip existing client -- bridge has been setup
        Logger.log(
          `AndroidService::clients_connected - existing client, sending ready`,
        );

        this.sendMessage(
          {
            type: MessageType.READY,
            data: {
              id: clientInfo?.clientId,
            },
          },
          false,
        ).catch((err) => {
          Logger.log(
            `AndroidService::clients_connected - error sending ready message to client ${clientInfo.clientId}`,
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
          context: 'AndroidService::setupOnClientsConnectedListener',
        });

        try {
          if (!this.connectedClients?.[clientInfo.clientId]) {
            this.setupBridge(clientInfo);
            // Save session to SDKConnect
            await SDKConnect.getInstance().addAndroidConnection({
              id: clientInfo.clientId,
              lastAuthorized: Date.now(),
              origin: AppConstants.MM_SDK.ANDROID_SDK,
              originatorInfo: clientInfo.originatorInfo,
              otherPublicKey: '',
              validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
            });
          }

          this.sendMessage(
            {
              type: MessageType.READY,
              data: {
                id: clientInfo?.clientId,
              },
            },
            false,
          ).catch((err) => {
            Logger.log(
              err,
              `AndroidService::clients_connected error sending READY message to client`,
            );
          });
        } catch (error) {
          Logger.log(
            error,
            `AndroidService::clients_connected sending jsonrpc error to client - connection rejected`,
          );
          this.sendMessage({
            data: {
              error,
              jsonrpc: '2.0',
            },
            name: 'metamask-provider',
          }).catch((err) => {
            Logger.log(
              err,
              `AndroidService::clients_connected error failed sending jsonrpc error to client`,
            );
          });
          Minimizer.goBack();
          return;
        }

        this.emit(EventType.CLIENTS_CONNECTED);
      };

      handleEventAsync().catch((err) => {
        Logger.log(
          err,
          `AndroidService::clients_connected error handling event`,
        );
      });
    });
  }

  private setupOnMessageReceivedListener() {
    this.eventHandler.onMessageReceived((jsonMessage: string) => {
      const handleEventAsync = async () => {
        let parsedMsg: {
          id: string;
          message: string;
        };

        DevLogger.log(`AndroidService::onMessageReceived`, jsonMessage);
        try {
          await wait(200); // Extra wait to make sure ui is ready

          await waitForAndroidServiceBinding();
          const keyringController = (
            Engine.context as { KeyringController: KeyringController }
          ).KeyringController;
          await waitForKeychainUnlocked({
            keyringController,
            context: 'AndroidService::setupOnMessageReceivedListener',
          });
        } catch (error) {
          Logger.log(error, `AndroidService::onMessageReceived error`);
        }

        let sessionId: string,
          message: string,
          data: { id: string; jsonrpc: string; method: string; params: any };
        try {
          parsedMsg = JSON.parse(jsonMessage); // handle message and redirect to corresponding bridge
          sessionId = parsedMsg.id;
          message = parsedMsg.message;
          data = JSON.parse(message);
        } catch (error) {
          Logger.log(
            error,
            `AndroidService::onMessageReceived invalid json param`,
          );
          this.sendMessage({
            data: {
              error,
              jsonrpc: '2.0',
            },
            name: 'metamask-provider',
          }).catch((err) => {
            Logger.log(
              err,
              `AndroidService::onMessageReceived error sending jsonrpc error message to client ${sessionId}`,
            );
          });
          return;
        }

        const bridge = this.bridgeByClientId[sessionId];

        if (!bridge) {
          console.warn(
            `AndroidService:: Bridge not found for client`,
            `sessionId=${sessionId} data.id=${data.id}`,
          );
          return;
        }

        const preferencesController = (
          Engine.context as {
            PreferencesController: PreferencesController;
          }
        ).PreferencesController;
        const selectedAddress = preferencesController.state.selectedAddress;

        // Handle custom rpc method
        const processedRpc = await handleCustomRpcCalls({
          batchRPCManager: this.batchRPCManager,
          selectedAddress,
          rpc: { id: data.id, method: data.method, params: data.params },
        });

        DevLogger.log(
          `AndroidService::onMessageReceived processedRpc`,
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
          `AndroidService::onMessageReceived error handling event`,
        );
      });
    });
  }

  private restorePreviousConnections() {
    if (Object.keys(this.connectedClients ?? {}).length) {
      Object.values(this.connectedClients).forEach((clientInfo) => {
        try {
          this.setupBridge(clientInfo);
          this.sendMessage(
            {
              type: MessageType.READY,
              data: {
                id: clientInfo?.clientId,
              },
            },
            false,
          ).catch((err) => {
            Logger.log(
              err,
              `AndroidService:: error sending jsonrpc error to client ${clientInfo.clientId}`,
            );
          });
        } catch (error) {
          Logger.log(
            error,
            `AndroidService:: error setting up bridge for client ${clientInfo.clientId}`,
          );
        }
      });
    }
  }

  private setupBridge(clientInfo: AndroidClient) {
    DevLogger.log(
      `AndroidService::setupBridge for id=${clientInfo.clientId} exists=${!!this
        .bridgeByClientId[clientInfo.clientId]}}`,
    );

    if (this.bridgeByClientId[clientInfo.clientId]) {
      return;
    }

    const bridge = new BackgroundBridge({
      webview: null,
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
    const id = message?.data?.id;
    this.communicationClient.sendMessage(JSON.stringify(message));
    const rpcMethod = this.rpcQueueManager.getId(id);

    DevLogger.log(`AndroidService::sendMessage method=${rpcMethod}`, message);
    // handle multichain rpc call responses separately
    const chainRPCs = this.batchRPCManager.getById(id);
    if (chainRPCs) {
      await handleBatchRpcResponse({
        chainRpcs: chainRPCs,
        msg: message,
        batchRPCManager: this.batchRPCManager,
        // backgroundBridge: this.bridgeByClientId[chainRPCs.],
        sendMessage: ({ msg }) => this.sendMessage(msg),
      });
      return;
    }

    if (!rpcMethod && forceRedirect !== true) {
      return;
    }
    const needsRedirect = METHODS_TO_REDIRECT[rpcMethod];

    this.rpcQueueManager.remove(id);

    if (needsRedirect || forceRedirect === true) {
      try {
        if (METHODS_TO_DELAY[rpcMethod]) {
          // Add delay to see the feedback modal
          await wait(1000);
        }

        if (!this.rpcQueueManager.isEmpty()) {
          DevLogger.log(`Connection::sendMessage NOT empty --- skip goBack()`);
          return;
        }

        Minimizer.goBack();
      } catch (error) {
        Logger.log(error, `AndroidService:: error waiting for empty rpc queue`);
      }
    }
  }
}
