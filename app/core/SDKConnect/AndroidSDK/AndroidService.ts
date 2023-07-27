/* eslint-disable padding-line-between-statements */
import { ethErrors } from 'eth-rpc-errors';
import { EventEmitter2 } from 'eventemitter2';
import { NativeModules } from 'react-native';
import Engine from '../../Engine';
import { Minimizer } from '../../NativeModules';

import { EventType, MessageType } from '@metamask/sdk-communication-layer';
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
import NativeSDKEventHandler from './NativeSDKEventHandler';
import { AndroidClient } from './android-sdk-types';

export default class AndroidService extends EventEmitter2 {
  private communicationClient = NativeModules.CommunicationClient;
  private connectedClients: { [clientId: string]: AndroidClient } = {};
  private rpcQueueManager = new RPCQueueManager();
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};

  constructor() {
    super();
    this.setupEventListeners()
      .then(() => {
        console.debug(`AndroidService - setupEventListeners - done`);
      })
      .catch((err) => {
        console.error(`AndroidService - error setting up event listeners`, err);
      });
  }

  private async setupEventListeners(): Promise<void> {
    try {
      console.log(`wait for android service binding`);
      // Wait for AndroidService to bind
      await waitForAndroidServiceBinding();
      console.log(`restoring previous connections`);
      const rawConnections =
        await SDKConnect.getInstance().loadAndroidConnections();

      console.debug(`previous connections restored`, rawConnections);

      if (rawConnections) {
        console.debug(
          `initialize connectedClients from restored connections...`,
        );
        Object.values(rawConnections).forEach((connection) => {
          this.connectedClients[connection.id] = {
            clientId: connection.id,
            originatorInfo: connection.originatorInfo,
          };
        });
      }
    } catch (err) {
      console.warn(
        `AndroidService - setupEventListeners - error loading android connections`,
        err,
      );
    }

    console.debug(
      `AndroidService - setupEventListeners - connectedClients`,
      JSON.stringify(this.connectedClients, null, 2),
    );

    NativeSDKEventHandler.onMessageReceived(async (jsonMessage: string) => {
      let parsedMsg: {
        id: string;
        message: string;
      };

      console.log(
        `AndroidService - onMessageReceived - jsonMessage`,
        JSON.stringify(jsonMessage, null, 2),
      );
      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      await waitForKeychainUnlocked({ keyringController });
      console.log(
        `AndroidService - onMessageReceived - keychain is unlocked -- wait for binding`,
      );

      await waitForAndroidServiceBinding();

      console.debug(
        `AndroidService - onMessageReceived - servive is binded -- continue`,
      );
      let sessionId: string,
        message: string,
        data: { id: string; jsonrpc: string; method: string; params: any };
      try {
        parsedMsg = JSON.parse(jsonMessage); // handle message and redirect to corresponding bridge
        sessionId = parsedMsg.id;
        message = parsedMsg.message;
        data = JSON.parse(message);
        console.log(
          `AndroidService - onMessageReceived - sessionId=${sessionId} rpcId=${data.id} message`,
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

      console.log(
        `AndroidService - onMessageReceived - adding rpc method id=${data.id} to queue`,
        data.method,
      );
      this.rpcQueueManager.add({
        id: data.id,
        method: data.method,
      });

      // await waitForReadyClient(id, this.connectedClients);
      // Send message to bridge
      const bridge = this.bridgeByClientId[sessionId];

      if (!bridge) {
        console.warn(
          `AndroidService - onMessageReceived - bridge not found for client ${sessionId}`,
        );
        console.debug(`existing clients`, Object.keys(this.connectedClients));
        console.debug(`existing bridges`, Object.keys(this.bridgeByClientId));
        return;
      }

      bridge.onMessage({ name: 'metamask-provider', data });
    });

    NativeSDKEventHandler.onClientsConnected(async (sClientInfo: string) => {
      const clientInfo: AndroidClient = JSON.parse(sClientInfo);

      console.log(
        `AndroidService::clients_connected id=${clientInfo.clientId}`,
        clientInfo.originatorInfo,
      );

      if (this.connectedClients?.[clientInfo.clientId]) {
        console.warn(
          'AndroidService::cliensts_connected bridge already set for client',
          clientInfo.clientId,
        );
        // Skip existing client -- bridge has been setup
        return;
      }

      console.debug(`AndroidService - clients_connected - clientInfo`);
      await wait(500); // Extra wait to make sure ui is ready

      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;

      console.debug(
        `AndroidService - clients_connected - waitForKeychainUnlocked`,
      );
      await waitForKeychainUnlocked({ keyringController });

      try {
        // check if we have existing connection
        // const current = SDKConnect.getInstance().getConnections();
        console.debug(
          `check if we have existing connection for ${clientInfo.clientId}`,
          this.connectedClients,
        );
        if (!this.connectedClients?.[clientInfo.clientId]) {
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
            data: {
              id: clientInfo?.clientId,
            },
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

    if (this.connectedClients) {
      // setup rpc bridge from previously connected clients
      Object.values(this.connectedClients).forEach((clientInfo) => {
        try {
          this.setupBridge(clientInfo);
          console.log(`SENDING READY MESSAGE to ${clientInfo.clientId}`);
          this.sendMessage(
            {
              type: MessageType.READY,
              data: {
                id: clientInfo?.clientId,
              },
            },
            false,
          );
        } catch (error) {
          console.warn(
            `AndroidService - setupEventListeners - error setting up bridge for client ${clientInfo.clientId}`,
            error,
          );
        }
      });
    } else {
      console.warn(
        `AndroidService - setupEventListeners - no connected clients`,
      );
    }
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
    // check if bridge already exists
    if (this.bridgeByClientId[clientInfo.clientId]) {
      console.warn(
        `AndroidService - setupBridge - bridge already exists for client ${clientInfo.clientId}`,
      );
      return;
    }

    console.debug(`AndroidService - setupBridge - clientInfo`, clientInfo);
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
    console.log(
      `AndroidService::sendMessage() id=${id} `,
      JSON.stringify(message),
    );
    this.communicationClient.sendMessage(JSON.stringify(message));

    console.log(`current rpc queue`, this.rpcQueueManager.get());

    const rpcMethod = this.rpcQueueManager.getId(id);

    if (!rpcMethod && forceRedirect !== true) {
      console.debug(`rpcMethod not found for id=${id} --- ignoring`, message);
      return;
    }
    const needsRedirect = METHODS_TO_REDIRECT[rpcMethod];

    console.log(
      `AndroidService::sendMessage() id=${id} needsRedirect=${needsRedirect} rpcMethod`,
      rpcMethod,
    );
    // check if needs redirect

    this.rpcQueueManager.remove(id);

    console.log(
      `before minimizer  id=${id} rpcMethod=${rpcMethod} forceRedirect=${forceRedirect} needsRedirect=${needsRedirect}`,
      this.rpcQueueManager.get(),
    );

    if (needsRedirect || forceRedirect === true) {
      try {
        if (METHODS_TO_DELAY[rpcMethod]) {
          // Add delay to see the feedback modal
          await wait(1000);
        }
        // Make sure we have replied to all messages before redirecting
        await waitForEmptyRPCQueue(this.rpcQueueManager);

        console.log(`minimize app  id=${id}  rpcMethod=${rpcMethod}`);
        // handle goBack depending on message type
        Minimizer.goBack();
      } catch (error) {
        console.error(`error waiting for empty rpc queue`, error);
      }
    }
  }
}
