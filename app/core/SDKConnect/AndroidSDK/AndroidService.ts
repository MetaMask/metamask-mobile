import { ethErrors } from 'eth-rpc-errors';
import { EventEmitter2 } from 'eventemitter2';
import { NativeModules } from 'react-native';
import Engine from '../../Engine';
import { Minimizer } from '../../NativeModules';

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
  waitForEmptyRPCQueue,
  waitForKeychainUnlocked,
} from '../utils/wait.util';

import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../../RPCMethods/RPCMethodMiddleware';
import {
  DEFAULT_SESSION_TIMEOUT_MS,
  METHODS_TO_DELAY,
  METHODS_TO_REDIRECT,
  SDKConnect,
} from '../SDKConnect';

import { ApprovalController } from '@metamask/approval-controller';
import { KeyringController } from '@metamask/keyring-controller';

import RPCQueueManager from '../RPCQueueManager';
import AndroidSDKEventHandler from './AndroidNativeSDKEventHandler';
import { AndroidClient } from './android-sdk-types';

export default class AndroidService extends EventEmitter2 {
  private communicationClient = NativeModules.CommunicationClient;
  private connectedClients: { [clientId: string]: AndroidClient } = {};
  private rpcQueueManager = new RPCQueueManager();
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};
  private eventHandler: AndroidSDKEventHandler;

  constructor() {
    super();
    this.eventHandler = new AndroidSDKEventHandler();
    this.setupEventListeners()
      .then(() => {
        //
      })
      .catch((err) => {
        Logger.log(err, `AndroidService:: error setting up event listeners`);
      });
  }

  private async setupEventListeners(): Promise<void> {
    try {
      await wait(200); // Extra wait to make sure ui is ready
      // Wait for keychain to be unlocked before handling rpc calls.
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({ keyringController });

      const rawConnections =
        await SDKConnect.getInstance().loadAndroidConnections();

      if (rawConnections) {
        Object.values(rawConnections).forEach((connection) => {
          this.connectedClients[connection.id] = {
            clientId: connection.id,
            originatorInfo: connection.originatorInfo as OriginatorInfo,
          };
        });
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

      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;

      const handleEventAsync = async () => {
        await waitForKeychainUnlocked({ keyringController });

        try {
          if (!this.connectedClients?.[clientInfo.clientId]) {
            await this.requestApproval(clientInfo);
            this.setupBridge(clientInfo);
            // Save session to SDKConnect
            SDKConnect.getInstance().addAndroidConnection({
              id: clientInfo.clientId,
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

        try {
          await wait(200); // Extra wait to make sure ui is ready

          await waitForAndroidServiceBinding();
          const keyringController = (
            Engine.context as { KeyringController: KeyringController }
          ).KeyringController;
          await waitForKeychainUnlocked({ keyringController });
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
          Logger.log(
            `AndroidService:: Bridge not found for client`,
            `sessionId=${sessionId} data.id=${data.id}`,
          );
          return;
        }

        this.rpcQueueManager.add({
          id: data.id,
          method: data.method,
        });
        bridge.onMessage({ name: 'metamask-provider', data });
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

  private async requestApproval(clientInfo: AndroidClient) {
    const approvalController = (
      Engine.context as { ApprovalController: ApprovalController }
    ).ApprovalController;

    // Clear any previous pending approval requests
    if (approvalController.get(clientInfo.clientId)) {
      approvalController.reject(
        clientInfo.clientId,
        ethErrors.provider.userRejectedRequest(),
      );
    }

    // ask for accounts permissions
    const approvalRequest = {
      id: clientInfo.clientId,
      origin: 'Android',
      type: ApprovalTypes.CONNECT_ACCOUNTS,
      requestData: {
        hostname: 'Android SDK',
        pageMeta: {
          channelId: clientInfo.clientId,
          url: clientInfo.originatorInfo.url ?? '',
          title: clientInfo.originatorInfo.url ?? '',
          icon: clientInfo.originatorInfo.icon ?? '',
          analytics: {
            request_source: AppConstants.REQUEST_SOURCES.SDK_ANDROID,
            request_platform: 'android',
          },
        },
      },
    };

    await approvalController.add(approvalRequest);

    this.connectedClients[clientInfo.clientId] = clientInfo;
  }

  private setupBridge(clientInfo: AndroidClient) {
    if (this.bridgeByClientId[clientInfo.clientId]) {
      return;
    }

    const bridge = new BackgroundBridge({
      webview: null,
      isMMSDK: false,
      url: clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
      isRemoteConn: true,
      sendMessage: this.sendMessage.bind(this),
      getApprovedHosts: () => false,
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
          isMMSDK: false,
          navigation: null, //props.navigation,
          getApprovedHosts: () => ({}),
          setApprovedHosts: () => ({}),
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
        // Make sure we have replied to all messages before redirecting
        await waitForEmptyRPCQueue(this.rpcQueueManager);

        Minimizer.goBack();
      } catch (error) {
        Logger.log(error, `AndroidService:: error waiting for empty rpc queue`);
      }
    }
  }
}
