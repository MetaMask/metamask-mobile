/* eslint-disable padding-line-between-statements */
import { EventEmitter2 } from 'eventemitter2';
import { NativeModules } from 'react-native';
import Engine from '../../Engine';
import { ethErrors } from 'eth-rpc-errors';
import { Minimizer } from '../../NativeModules';

import { EventType, MessageType } from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';

import {
  wait,
  waitForKeychainUnlocked,
  waitForReadyClient,
} from '../utils/wait.util';

import {
  METHODS_TO_REDIRECT,
  SDKConnect,
  DEFAULT_SESSION_TIMEOUT_MS,
} from '../SDKConnect';
import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../../RPCMethods/RPCMethodMiddleware';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';

import { ApprovalController } from '@metamask/approval-controller';
import { KeyringController } from '@metamask/keyring-controller';

import NativeSDKEventHandler from './NativeSDKEventHandler';
import { AndroidClient } from './android-sdk-types';
import RPCQueueManager from '../RPCQueueManager';

export default class AndroidService extends EventEmitter2 {
  private communicationClient = NativeModules.CommunicationClient;
  private connectedClients: { [clientId: string]: AndroidClient } = {};
  private rpcQueueManager = new RPCQueueManager();
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};

  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    NativeSDKEventHandler.onMessageReceived(async (jsonMessage: string) => {
      let parsedMsg: {
        id: string;
        message: string;
      };

      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({ keyringController });

      Logger.log(`AndroidService - onMessageReceived - keychain is unlocked`);
      let id: string,
        message: string,
        data: { id: string; jsonrpc: string; method: string; params: any };
      try {
        parsedMsg = JSON.parse(jsonMessage); // handle message and redirect to corresponding bridge
        id = parsedMsg.id;
        message = parsedMsg.message;
        data = JSON.parse(message);
        Logger.log(
          `AndroidService - onMessageReceived - id=${id} message`,
          data,
        );
      } catch (error) {
        console.error(`invalid json param`, jsonMessage);
        this.sendMessage({
          data: {
            error,
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        });
        return;
      }

      Logger.log(`adding rpc method id=${data.id} to queue`, data.method);
      this.rpcQueueManager.add({
        id: data.id,
        method: data.method,
      });

      // await waitForReadyClient(id, this.connectedClients);
      // Send message to bridge
      const bridge = this.bridgeByClientId[id];

      if (!bridge) {
        console.warn(
          `AndroidService - onMessageReceived - bridge not found for client ${id}`,
        );
        return;
      }

      bridge.onMessage({ name: 'metamask-provider', data });
    });

    NativeSDKEventHandler.onClientsConnected(async (sClientInfo: string) => {
      const clientInfo: AndroidClient = JSON.parse(sClientInfo);

      Logger.log(
        `AndroidService::clients_connected id=${clientInfo.clientId}`,
        clientInfo.originatorInfo,
      );

      if (this.connectedClients[clientInfo.clientId]) {
        console.warn(
          'AndroidService::cliensts_connected bridge already set for client',
          clientInfo.clientId,
        );
        // Skip existing client -- bridge has been setup
        return;
      }

      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({ keyringController });
      await wait(500); // Extra wait to make sure ui is ready

      try {
        // check if we have existing connection
        const current = SDKConnect.getInstance().getConnections();
        if (!current?.[clientInfo.clientId]) {
          await this.requestApproval(clientInfo);
          // Save session to SDKConnect
          SDKConnect.getInstance().addAndroidConnection({
            id: clientInfo.clientId,
            origin: AppConstants.MM_SDK.ANDROID_SDK,
            originatorInfo: clientInfo.originatorInfo,
            otherPublicKey: '',
            validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
          });
        }

        // initialize background rpc bridge
        this.setupBridge(clientInfo);

        this.sendMessage(
          {
            type: MessageType.READY,
          },
          true,
        );
      } catch (error) {
        console.warn(
          `AndroidService - clients_connected - error requesting approval`,
          error,
        );
        // Permissions denied -- send error to client
        this.sendMessage({
          data: {
            error,
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        });
        return;
      }

      // extract originatorInfo
      this.emit(EventType.CLIENTS_CONNECTED);
    });

    // NativeSDKEventHandler.onClientsDisconnected((id: string) => {
    //   this.emit(EventType.CLIENTS_DISCONNECTED);
    //   SDKConnect.getInstance().removeAndroidConnection(id);
    // });
  }

  private async requestApproval(clientInfo: AndroidClient) {
    // Ask permissions controller if the connection is accepted
    const approvalController = (
      Engine.context as { ApprovalController: ApprovalController }
    ).ApprovalController;

    // clear previous pending approval
    if (approvalController.get(clientInfo.clientId)) {
      Logger.log(
        `AndroidService - clients_connected - clearing previous pending approval`,
      );
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
        hostname: 'Android Demo',
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

    this.connectedClients[clientInfo.clientId] = clientInfo;

    await approvalController.add(approvalRequest);
  }

  private setupBridge(clientInfo: AndroidClient) {
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

  sendMessage(message: any, forceRedirect?: boolean) {
    const id = message?.data?.id;
    Logger.log(
      `AndroidService::sendMessage() id=${id} `,
      JSON.stringify(message),
    );
    this.communicationClient.sendMessage(JSON.stringify(message));

    Logger.log(`current rpc queue`, this.rpcQueueManager.get());

    const rpcMethod = this.rpcQueueManager.getId(id);
    const needsRedirect = METHODS_TO_REDIRECT[rpcMethod];

    Logger.log(
      `AndroidService::sendMessage() id=${id} needsRedirect=${needsRedirect} rpcMethod`,
      rpcMethod,
    );
    // check if needs redirect

    this.rpcQueueManager.remove(id);

    Logger.log(
      `before minimizer forceRedirect=${forceRedirect} needsRedirect=${needsRedirect}`,
    );

    if (needsRedirect || forceRedirect === true) {
      // handle goBack depending on message type
      Minimizer.goBack();
    }
  }
}
