import { KeyringController } from '@metamask/keyring-controller';
import { NetworkController } from '@metamask/network-controller';
import { PermissionController } from '@metamask/permission-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { Linking } from 'react-native';
import { PROTOCOLS } from '../../../constants/deeplinks';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import { DappClient, DappConnections } from '../AndroidSDK/dapp-sdk-types';
import getDefaultBridgeParams from '../AndroidSDK/getDefaultBridgeParams';
import BatchRPCManager from '../BatchRPCManager';
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

export default class DeeplinkProtocolService {
  public connections: DappConnections = {};
  public bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};
  public rpcQueueManager = new RPCQueueManager();
  public batchRPCManager: BatchRPCManager = new BatchRPCManager('deeplink');
  // To keep track in order to get the associated bridge to handle batch rpc calls
  public currentClientId?: string;
  public dappPublicKeyByClientId: {
    [clientId: string]: string;
  } = {};

  public isInitialized = false;

  public constructor() {
    if (!this.isInitialized) {
      this.init()
        .then(() => {
          this.isInitialized = true;
          DevLogger.log('DeeplinkProtocolService:: initialized');
        })
        .catch((err) => {
          this.isInitialized = false;
          Logger.log(err, 'DeeplinkProtocolService:: error initializing');
        });
    }
  }

  public async init() {
    if (this.isInitialized) {
      return;
    }

    const rawConnections = await SDKConnect.getInstance().loadDappConnections();

    if (rawConnections) {
      Object.values(rawConnections).forEach((connection) => {
        const clientInfo = {
          connected: false,
          clientId: connection.id,
          originatorInfo: connection.originatorInfo as OriginatorInfo,
          validUntil: connection.validUntil,
          scheme: connection.scheme,
        };

        this.connections[connection.id] = clientInfo;

        this.setupBridge(clientInfo);
      });
    }
  }

  public setupBridge(clientInfo: DappClient) {
    DevLogger.log(
      `DeeplinkProtocolService::setupBridge for id=${
        clientInfo.clientId
      } exists=${!!this.bridgeByClientId[
        clientInfo.clientId
      ]}} originatorInfo=${clientInfo.originatorInfo.url}\n${
        clientInfo.originatorInfo.title
      }`,
    );

    if (this.bridgeByClientId[clientInfo.clientId]) {
      return;
    }

    const defaultBridgeParams = getDefaultBridgeParams(clientInfo);

    const bridge = new BackgroundBridge({
      webview: null,
      channelId: clientInfo.clientId,
      isMMSDK: true,
      url: PROTOCOLS.METAMASK + '://' + AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
      isRemoteConn: true,
      sendMessage: (msg: any) => {
        const response = {
          ...msg,
          data: {
            ...msg.data,
            chainId: this.getChainId(),
            accounts: this.getSelectedAccounts(),
          },
        };

        return this.sendMessage(response);
      },
      ...defaultBridgeParams,
    });

    this.bridgeByClientId[clientInfo.clientId] = bridge;
  }

  async sendMessage(message: any, forceRedirect?: boolean) {
    const id = message?.data?.id;

    DevLogger.log(`DeeplinkProtocolService::sendMessage id=${id}`);

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

      const hasError = !!message?.data?.error;

      if (!isLastRpcOrError) {
        DevLogger.log(
          `DeeplinkProtocolService::sendMessage NOT last rpc --- skip goBack()`,
          chainRPCs,
        );
        this.rpcQueueManager.remove(id);

        // Only continue processing the message and goback if all rpcs in the batch have been handled

        if (hasError) {
          this.openDeeplink({
            message,
            clientId: this.currentClientId ?? '',
          });
          return;
        }
      }

      // Always set the method to metamask_batch otherwise it may not have been set correctly because of the batch rpc flow.
      rpcMethod = RPC_METHODS.METAMASK_BATCH;
    }

    this.rpcQueueManager.remove(id);

    const shouldSkipGoBack = !rpcMethod && forceRedirect !== true;

    if (shouldSkipGoBack) {
      DevLogger.log(
        `DeeplinkProtocolService::sendMessage no rpc method --- rpcMethod=${rpcMethod} forceRedirect=${forceRedirect} --- skip goBack()`,
      );

      return;
    }

    try {
      const shouldDelay = METHODS_TO_DELAY[rpcMethod];

      if (shouldDelay) {
        // Add delay to see the feedback modal
        await wait(1000);
      }

      const isRpcQueueEmpty = this.rpcQueueManager.isEmpty();

      if (!isRpcQueueEmpty) {
        DevLogger.log(
          `DeeplinkProtocolService::sendMessage NOT empty --- skip goBack()`,
          this.rpcQueueManager.get(),
        );

        return;
      }

      DevLogger.log(`DeeplinkProtocolService::sendMessage empty --- goBack()`);

      DevLogger.log(
        `DeeplinkProtocolService::sendMessage sending deeplink message=${JSON.stringify(
          message,
        )}`,
      );

      this.openDeeplink({
        message,
        clientId: this.currentClientId ?? '',
      });
    } catch (error) {
      Logger.log(
        error,
        `DeeplinkProtocolService:: error waiting for empty rpc queue`,
      );
    }
  }

  public async openDeeplink({
    message,
    clientId,
    scheme,
  }: {
    message: any;
    clientId: string;
    scheme?: string;
  }) {
    try {
      const jsonMessage = JSON.stringify(message);
      const base64Message = Buffer.from(jsonMessage).toString('base64');
      const dappScheme = this.connections[clientId]?.scheme ?? scheme;

      DevLogger.log(
        `DeeplinkProtocolService::openDeeplink scheme=${scheme} dappScheme=${dappScheme} clientId=${clientId}`,
      );

      DevLogger.log(`DeeplinkProtocolService::openDeeplink message=${message}`);

      const deeplink = `${dappScheme}://mmsdk?message=${base64Message}`;

      DevLogger.log(
        `DeeplinkProtocolService::openDeeplink deeplink=${deeplink} clientId=${clientId}`,
      );

      await Linking.openURL(deeplink);
    } catch (error) {
      Logger.error(
        error as Error,
        `DeeplinkProtocolService::openDeeplink error opening deeplink`,
      );
    }
  }

  public async checkPermission({
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
    );
  }

  public async handleConnection(params: {
    dappPublicKey: string;
    url: string;
    scheme: string;
    channelId: string;
    originatorInfo?: string;
    request?: string;
  }) {
    if (!params.originatorInfo) {
      const deepLinkError = new Error(
        'DeeplinkProtocolService::handleConnection no originatorInfo',
      );
      Logger.error(deepLinkError, params);

      return;
    }

    this.dappPublicKeyByClientId[params.channelId] = params.dappPublicKey;

    const decodedOriginatorInfo = Buffer.from(
      params.originatorInfo,
      'base64',
    ).toString('utf-8');

    const originatorInfoJson = JSON.parse(decodedOriginatorInfo);

    const originatorInfo = originatorInfoJson.originatorInfo;

    const clientInfo: DappClient = {
      clientId: params.channelId,
      originatorInfo,
      connected: true,
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
      scheme: params.scheme,
    };

    this.currentClientId = params.channelId;

    const isSessionExists = this.connections?.[clientInfo.clientId];

    if (isSessionExists) {
      // Skip existing client -- bridge has been setup

      // Update connected state
      this.connections[clientInfo.clientId] = {
        ...this.connections[clientInfo.clientId],
        connected: true,
      };

      if (params.request) {
        await this.processDappRpcRequest(params);
      } else {
        this.sendMessage(
          {
            data: {
              chainId: this.getChainId(),
              accounts: this.getSelectedAccounts(),
            },
          },
          true,
        ).catch((err) => {
          Logger.log(
            `DeeplinkProtocolService::clients_connected - error sending ready message to client ${clientInfo.clientId}`,
            err,
          );
        });
      }

      return;
    }

    await SDKConnect.getInstance().addDappConnection({
      id: clientInfo.clientId,
      lastAuthorized: Date.now(),
      origin: AppConstants.MM_SDK.IOS_SDK,
      originatorInfo: clientInfo.originatorInfo,
      otherPublicKey: this.dappPublicKeyByClientId[clientInfo.clientId],
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
      scheme: clientInfo.scheme,
    });

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
            scheme: clientInfo.scheme,
          };

          await SDKConnect.getInstance().addDappConnection({
            id: clientInfo.clientId,
            lastAuthorized: Date.now(),
            origin: AppConstants.MM_SDK.IOS_SDK,
            originatorInfo: clientInfo.originatorInfo,
            otherPublicKey: this.dappPublicKeyByClientId[clientInfo.clientId],
            validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
            scheme: clientInfo.scheme,
          });
        }

        if (params.request) {
          await this.processDappRpcRequest(params);

          return;
        }

        this.sendMessage(
          {
            data: {
              chainId: this.getChainId(),
              accounts: this.getSelectedAccounts(),
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

        const message = {
          data: {
            error,
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        };

        this.openDeeplink({
          message,
          clientId: this.currentClientId ?? '',
          scheme: clientInfo.scheme,
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
  }

  public async processDappRpcRequest(params: {
    dappPublicKey: string;
    url: string;
    scheme: string;
    channelId: string;
    originatorInfo?: string;
    request?: string;
  }) {
    const bridge = this.bridgeByClientId[params.channelId];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const requestObject = JSON.parse(params.request!) as {
      id: string;
      method: string;
      params: any;
    };

    // Handle custom rpc method
    const processedRpc = await handleCustomRpcCalls({
      batchRPCManager: this.batchRPCManager,
      selectedChainId: this.getChainId(),
      selectedAddress: this.getSelectedAddress(),
      rpc: {
        id: requestObject.id,
        method: requestObject.method,
        params: requestObject.params,
      },
    });

    DevLogger.log(
      `DeeplinkProtocolService::onMessageReceived processedRpc`,
      processedRpc,
    );

    this.rpcQueueManager.add({
      id: requestObject.id,
      method: requestObject.method,
    });

    bridge.onMessage({ name: 'metamask-provider', data: processedRpc });
  }

  public getChainId() {
    const networkController = (
      Engine.context as {
        NetworkController: NetworkController;
      }
    ).NetworkController;

    const hexChainId = networkController.state.providerConfig.chainId ?? '0x'; // default to mainnet

    DevLogger.log(
      `DeeplinkProtocolService::clients_connected hexChainId`,
      hexChainId,
    );

    return hexChainId;
  }

  public getSelectedAccounts() {
    const permissionController = (
      Engine.context as {
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;

    const permissions = permissionController.getPermissions(
      this.currentClientId ?? '',
    );

    const preferencesController = (
      Engine.context as { PreferencesController: PreferencesController }
    ).PreferencesController;

    const selectedAddress = preferencesController.state.selectedAddress;

    let connectedAddresses = permissions?.eth_accounts?.caveats?.[0]
      ?.value as string[];

    DevLogger.log(
      `DeeplinkProtocolService::clients_connected connectedAddresses`,
      connectedAddresses,
    );

    if (!Array.isArray(connectedAddresses)) {
      return [];
    }

    const lowerCaseConnectedAddresses = connectedAddresses.map((address) =>
      address.toLowerCase(),
    );

    const isPartOfConnectedAddresses = lowerCaseConnectedAddresses.includes(
      selectedAddress.toLowerCase(),
    );

    if (isPartOfConnectedAddresses) {
      // Create a new array with selectedAddress at the first position
      connectedAddresses = [
        selectedAddress,
        ...connectedAddresses.filter(
          (address) => address.toLowerCase() !== selectedAddress.toLowerCase(),
        ),
      ];
    }

    return connectedAddresses;
  }

  public getSelectedAddress() {
    const preferencesController = (
      Engine.context as {
        PreferencesController: PreferencesController;
      }
    ).PreferencesController;

    const selectedAddress = preferencesController.state.selectedAddress;

    DevLogger.log(
      `DeeplinkProtocolService::clients_connected selectedAddress`,
      selectedAddress,
    );

    return selectedAddress;
  }

  public handleMessage(params: {
    dappPublicKey: string;
    url: string;
    message: string;
    channelId: string;
    scheme: string;
    account: string; // account@chainid
  }) {
    let walletSelectedAddress = '';
    let walletSelectedChainId = '';
    let dappAccountChainId = '';
    let dappAccountAddress = '';

    if (!params.account?.includes('@')) {
      DevLogger.log(
        `DeeplinkProtocolService:: handleMessage invalid params.account format ${params.account}`,
      );
    } else {
      const account = params.account.split('@');
      walletSelectedAddress = this.getSelectedAddress();
      walletSelectedChainId = this.getChainId();
      dappAccountChainId = account[1];
      dappAccountAddress = account[0];
    }

    DevLogger.log(
      'DeeplinkProtocolService:: handleMessage params from deeplink',
      params,
    );

    DevLogger.log('DeeplinkProtocolService:: message', params.message);

    const parsedMessage = Buffer.from(params.message, 'base64').toString(
      'utf-8',
    );

    DevLogger.log('DeeplinkProtocolService:: parsedMessage', parsedMessage);

    const handleEventAsync = async () => {
      let data: {
        id: string;
        method: string;
        params?: any;
      };

      const sessionId: string = params.channelId;

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

      try {
        const message = JSON.parse(parsedMessage); // handle message and redirect to corresponding bridge
        DevLogger.log('DeeplinkProtocolService:: parsed message:-', message);
        data = message;

        const isAccountChanged = dappAccountAddress !== walletSelectedAddress;
        const isChainChanged = dappAccountChainId !== walletSelectedChainId;

        if (isAccountChanged || isChainChanged) {
          this.sendMessage(
            {
              data: {
                id: data.id,
                accounts: this.getSelectedAccounts(),
                chainId: this.getChainId(),
                error: {
                  code: -32602,
                  message:
                    'The selected account or chain has changed. Please try again.',
                },
                jsonrpc: '2.0',
              },
              name: 'metamask-provider',
            },
            true,
          ).catch((err) => {
            Logger.log(
              err,
              `DeeplinkProtocolService::onMessageReceived error sending jsonrpc error message to client ${sessionId}`,
            );
          });

          return;
        }
      } catch (error) {
        Logger.log(
          error,
          `DeeplinkProtocolService::onMessageReceived invalid json param`,
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
            `DeeplinkProtocolService::onMessageReceived error sending jsonrpc error message to client ${sessionId}`,
          );
        });

        return;
      }

      const isSessionExists = this.connections?.[sessionId];

      DevLogger.log(
        `DeeplinkProtocolService::onMessageReceived connections=`,
        this.connections,
      );

      DevLogger.log(
        `DeeplinkProtocolService::onMessageReceived sessionId=${sessionId}`,
      );

      DevLogger.log(
        `DeeplinkProtocolService::onMessageReceived isSessionExists`,
        isSessionExists,
      );

      if (!isSessionExists) {
        const message = {
          data: {
            id: data.id,
            error: {
              code: 4100,
              message: 'Unauthorized request',
            },
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        };

        this.openDeeplink({
          message,
          clientId: sessionId,
          scheme: params.scheme,
        });

        return;
      }

      // Update connected state
      this.connections[sessionId] = {
        ...this.connections[sessionId],
        connected: true,
      };

      let bridge = this.bridgeByClientId[sessionId];

      if (!bridge) {
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

      this.currentClientId = sessionId;
      // Handle custom rpc method
      const processedRpc = await handleCustomRpcCalls({
        batchRPCManager: this.batchRPCManager,
        selectedChainId: this.getChainId(),
        selectedAddress: this.getSelectedAddress(),
        rpc: { id: data.id, method: data.method, params: data.params },
      });

      DevLogger.log(
        `DeeplinkProtocolService::onMessageReceived processedRpc`,
        processedRpc,
      );

      this.rpcQueueManager.add({
        id: data.id,
        method: data.method,
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

  removeConnection(channelId: string) {
    try {
      if (this.connections[channelId]) {
        DevLogger.log(
          `DeeplinkProtocolService::remove client ${channelId} exists --- remove bridge`,
        );

        delete this.bridgeByClientId[channelId];
      }

      delete this.connections[channelId];
    } catch (err) {
      Logger.log(err, `DeeplinkProtocolService::remove error`);
    }
  }
}
