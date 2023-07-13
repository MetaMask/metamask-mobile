/* eslint-disable padding-line-between-statements */
import { EventEmitter2 } from 'eventemitter2';
import { NativeModules } from 'react-native';
import Engine from '../../Engine';
import { ethErrors } from 'eth-rpc-errors';
import { StackNavigationProp } from '@react-navigation/stack';

import {
  CommunicationLayerMessage,
  DisconnectOptions,
  EventType,
  MessageType,
  KeyInfo,
} from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import AppConstants from '../../AppConstants';

import {
  wait,
  waitForEmptyRPCQueue,
  waitForKeychainUnlocked,
} from '../utils/wait.util';
import Routes from '../../../../app/constants/navigation/Routes';

import getRpcMethodMiddleware, {
  ApprovalTypes,
} from '../../RPCMethods/RPCMethodMiddleware';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';

import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import { KeyringController } from '@metamask/keyring-controller';

import NativeSDKEventHandler from './NativeSDKEventHandler';
import { CommunicationLayer } from '@metamask/sdk-communication-layer/dist/browser/es/src/types/CommunicationLayer';
import { Channel } from '@metamask/sdk-communication-layer/dist/browser/es/src/types/Channel';
import { AndroidClient } from './android-sdk-types';

// eslint-disable-next-line import/prefer-default-export
export class AndroidService
  extends EventEmitter2
  implements CommunicationLayer
{
  private communicationClient = NativeModules.CommunicationClient;
  private connectedClients: {[clientId: string]: AndroidClient} = {}
  private bridgeByClientId: {[clientId: string]: BackgroundBridge} = {};
  private navigation?: StackNavigationProp<{
    [route: string]: { screen: string };
  }>;
  private sdkLoadingState: { [channelId: string]: boolean } = {};

  constructor(navigation: StackNavigationProp<{
    [route: string]: { screen: string };
  }>) {
    super();
    this.navigation = navigation;
    console.log(`AndroidService - constructor - navigation`, navigation);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    NativeSDKEventHandler.onMessageReceived(async (jsonMessage: string) => {

      let parsedMsg: {
        id: string,
        message: {
          id: string, // rpcid
          method: string,
          params: unknown[],
        }
      };

      console.log(`AndroidService - onMessageReceived - jsonMessage`, jsonMessage);

      const keyringController = (
        Engine.context as { KeyringController: KeyringController }
      ).KeyringController;
      console.log(`Engine.context`, Engine.context);
      await waitForKeychainUnlocked({ keyringController });

      console.log(`AndroidService - onMessageReceived - keychain is unlocked`);
      try {
        parsedMsg = JSON.parse(jsonMessage);

      } catch(error) {
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
      console.log(parsedMsg);
      console.log(`connectedClients`, this.connectedClients);
      console.log(`bridges`, this.bridgeByClientId);

      // handle message and redirect to corresponding bridge
      const { id, message } = parsedMsg;

      console.log(`AndroidService - onMessageReceived - id=${id} message`, message);

      const waitForReadyClient = async () => {
        let i = 0;
        while(!this.connectedClients[id]) {
          // print every 5 seconds
          if(i % 5 === 0) {
            console.log(`AndroidService - onMessageReceived - waiting for client ${id} to be ready`);
          }
          i+=1;
          await wait(1000);
        }
      }

      await waitForReadyClient();
      // Send message to bridge
      const bridge = this.bridgeByClientId[id];
      const clientInfo = this.connectedClients[id];

      this.updateSDKLoadingState({channelId: clientInfo.clientId, loading: false})

      console.info(`AndroidService - onMessageReceived - clientInfo`, clientInfo);
      if(!bridge) {
        console.warn(`AndroidService - onMessageReceived - bridge not found for client ${id}`);
        return;
      }

      bridge.onMessage(message);
    });

    NativeSDKEventHandler.onClientsConnected(async (sClientInfo: string) => {
        console.log(EventType.CLIENTS_CONNECTED);
        // console.log(`clients_connected`, JSON.stringify(sClientInfo, null, 2));
        let clientInfo: AndroidClient = JSON.parse(sClientInfo);
        const clientId = (sClientInfo + '').replace(/"/g, '');
        this.updateSDKLoadingState({channelId: clientId, loading: true})
        try {
          //JSON.parse(sClientInfo);
          // clientInfo = {
          //   clientId,
          //   originatorInfo: {
          //     title: 'Android Demo',
          //     url: 'https://metamask.io',
          //     platform: 'android',
          //   }
          // }
        } catch (error) {
          console.error(`invalid json param`, sClientInfo)
          throw error;
        }

        console.log(`clients_connected client id: `, clientInfo.clientId);
        console.log(`clients_connected client url: `, clientInfo.originatorInfo.url);
        console.log(`clients_connected`, JSON.stringify(clientInfo, null, 2));
        console.log(`bridges`, this.bridgeByClientId);
        // how to uniquely identify this client?
        // extract id
        // is it an existing client?
        // if so create a background bridge with the wallet to handle rpc calls
        if(this.connectedClients[clientInfo.clientId]) {
          console.warn('bridge already set for client', clientInfo.clientId)
          // Skip existing client -- bridge has been setup
          return;
        }

        const keyringController = (
          Engine.context as { KeyringController: KeyringController }
        ).KeyringController;
        await waitForKeychainUnlocked({ keyringController });

        await wait(3000);
        console.log(`AndroidService - clients_connected - keychain is unlocked`);
        
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
              analytics: {
                request_source: AppConstants.REQUEST_SOURCES.SDK_ANDROID,
                request_platform: 'android'
              }
            }
          }
        }

        console.log(`Add client ${clientInfo.clientId} to connected clients`, clientInfo)
        this.connectedClients[clientInfo.clientId] = clientInfo;

        try {                    
          console.log(`AndroidService - clients_connected - requesting approval`, approvalController);
          await approvalController.add(approvalRequest);

          console.log(`AndroidService - clients_connected - approval granted`);

          // initialize background rpc bridge
          this.setupBridge(clientInfo);          

          this.sendMessage({
            type: MessageType.READY,
          });


        } catch( error ) {
          console.warn(`AndroidService - clients_connected - error requesting approval`, error);
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

    NativeSDKEventHandler.onClientsDisconnected(() => {
        console.log(EventType.CLIENTS_DISCONNECTED);
      this.emit(EventType.CLIENTS_DISCONNECTED);
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
    await waitForKeychainUnlocked({ keyringController });

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

  private setupBridge(clientInfo: AndroidClient) {
    console.log(`Client url: ${clientInfo.originatorInfo.url}`);
    console.debug(`Setting up bridge for client`, clientInfo);
    const bridge = new BackgroundBridge({
      webview: null,
      isMMSDK: false,
      url: clientInfo.originatorInfo.url ?? clientInfo.originatorInfo.title,
      isRemoteConn: false,
      sendMessage: this.sendMessage.bind(this),
      getApprovedHosts: () => {},
      remoteConnHost: '',
      getRpcMethodMiddleware: ({ getProviderState }: {
        hostname: string;
        getProviderState: any;
      }) => 
      getRpcMethodMiddleware({
        hostname: clientInfo.originatorInfo?.title,
        getProviderState,
        isMMSDK: true,
        navigation: null, //props.navigation,
        getApprovedHosts: () => {},
        setApprovedHosts: (hostname: string) => {
        },
        approveHost: (approveHostname) => {

        },
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
            clientInfo.originatorInfo.platform ?? AppConstants.MM_SDK.UNKNOWN_PARAM,
        },
        toggleUrlModal: () => null,
        injectHomePageScripts: () => null,
      }),
      isMainFrame: true,
      isWalletConnect: false,
      wcRequestActions: undefined,
    })

    console.log(`Bridge created for client ${clientInfo.clientId}`);

    this.bridgeByClientId[clientInfo.clientId] = bridge;
  }

  createChannel(): Channel {
    return {
      channelId: '',
      pubKey: '',
    };
  }

  sendMessage(message: CommunicationLayerMessage) {
    console.log(JSON.stringify(message));
    this.communicationClient.sendMessage(JSON.stringify(message));
  }

  getKeyInfo(): KeyInfo {
    return {
      step: '',
      ecies: {
        public: '',
        private: '',
      },
      keysExchanged: true,
    };
  }

  isConnected(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  connectToChannel(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  pause(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resetKeys(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  ping(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  keyCheck(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  resume(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(_options?: DisconnectOptions | undefined): void {}
}