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
import getDefaultBridgeParams from '../AndroidSDK/getDefaultBridgeParams';

export default class DeeplinkProtocolService {
  private connections: DappConnections = {};
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};
  private rpcQueueManager = new RPCQueueManager();
  private batchRPCManager: BatchRPCManager = new BatchRPCManager('deeplink');
  // To keep track in order to get the associated bridge to handle batch rpc calls
  private currentClientId?: string;
  private dappPublicKeyByClientId: {
    [clientId: string]: string;
  } = {};

  private isInitialized = false;

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

  private async init() {
    if (this.isInitialized) {
      return;
    }

    const rawConnections = await SDKConnect.getInstance().loadDappConnections();

    if (rawConnections) {
      Object.values(rawConnections).forEach((connection) => {
        DevLogger.log(
          `DeeplinkProtocolService::init recover client: ${connection.id}`,
        );
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
    } else {
      DevLogger.log(
        `DeeplinkProtocolService::init no previous connections found`,
      );
    }
  }

  private setupBridge(clientInfo: DappClient) {
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

      DevLogger.log(
        `DeeplinkProtocolService::sendMessage isLastRpc=${isLastRpcOrError}`,
        chainRPCs,
      );

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

      DevLogger.log(
        `DeeplinkProtocolService::sendMessage chainRPCs=${chainRPCs} COMPLETED!`,
      );
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

  private async openDeeplink({
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
        error,
        `DeeplinkProtocolService::openDeeplink error opening deeplink`,
      );
    }
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

    Logger.log('DeeplinkProtocolService::handleConnection params', params);

    const decodedOriginatorInfo = Buffer.from(
      params.originatorInfo,
      'base64',
    ).toString('utf-8');

    const originatorInfoJson = JSON.parse(decodedOriginatorInfo);

    DevLogger.log(
      `DeeplinkProtocolService::handleConnection originatorInfoJson`,
      originatorInfoJson,
    );

    const originatorInfo = originatorInfoJson.originatorInfo;

    Logger.log(
      `DeeplinkProtocolService::originatorInfo: ${originatorInfo.url}  ${originatorInfo.title}`,
    );

    const clientInfo: DappClient = {
      clientId: params.channelId,
      originatorInfo,
      connected: true,
      validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
      scheme: params.scheme,
    };

    this.currentClientId = params.channelId;

    DevLogger.log(`DeeplinkProtocolService::clients_connected`, clientInfo);

    const isSessionExists = this.connections?.[clientInfo.clientId];

    if (isSessionExists) {
      // Skip existing client -- bridge has been setup

      Logger.log(
        `DeeplinkProtocolService::clients_connected - existing client, sending ready`,
      );

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

        DevLogger.log(`DeeplinkProtocolService::sendMessage 2`);

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

        // TODO: Remove this log after testing
        DevLogger.log(
          `DeeplinkProtocolService::sendMessage handleEventAsync hasError ===> sending deeplink`,
          message,
          this.currentClientId,
        );

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

  private async processDappRpcRequest(params: {
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

    const connectedAddresses = (
      permissions?.eth_accounts?.caveats?.[0]?.value as {
        address: string;
        lastUsed: number;
      }[]
    )?.map((caveat) => caveat.address);

    DevLogger.log(
      `DeeplinkProtocolService::clients_connected connectedAddresses`,
      connectedAddresses,
    );

    return connectedAddresses ?? [];
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
  }) {
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
