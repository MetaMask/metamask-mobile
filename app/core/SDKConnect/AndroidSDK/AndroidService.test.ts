import { NativeModules } from 'react-native';
import AndroidService from './AndroidService';
import { RPCQueueManager } from '../RPCQueueManager';
import { MessageType } from '@metamask/sdk-communication-layer';
import Logger from '../../../util/Logger';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import BatchRPCManager from '../BatchRPCManager';
import DevLogger from '../utils/DevLogger';
import sendMessage from './AndroidService/sendMessage';
import getDefaultBridgeParams from './getDefaultBridgeParams';
import { getDefaultCaip25CaveatValue } from '../../Permissions';
import Engine from '../../Engine';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../utils/wait.util', () => ({
  wait: jest.fn().mockResolvedValue(undefined),
  waitForAndroidServiceBinding: jest.fn().mockResolvedValue(undefined),
  waitForKeychainUnlocked: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../BackgroundBridge/BackgroundBridge', () =>
  jest.fn().mockImplementation(() => ({
    onMessage: jest.fn(),
  })),
);

jest.mock('../SDKConnect', () => ({
  SDKConnect: {
    getInstance: jest.fn().mockReturnValue({
      loadDappConnections: jest.fn().mockResolvedValue({}),
      bindAndroidSDK: jest.fn().mockResolvedValue(undefined),
      addDappConnection: jest.fn().mockResolvedValue(undefined),
      state: {
        navigation: {
          navigate: jest.fn(),
        },
      },
    }),
  },
}));

// Store event callbacks for testing
const mockEventCallbacks: {
  onClientsConnected?: (clientInfo: string) => void;
  onMessageReceived?: (message: string) => void;
} = {};

jest.mock('./AndroidNativeSDKEventHandler', () =>
  jest.fn().mockImplementation(() => ({
    onClientsConnected: jest.fn().mockImplementation((callback) => {
      // Store the callback for later use in tests
      mockEventCallbacks.onClientsConnected = callback;
      return { removeListener: jest.fn() };
    }),
    onMessageReceived: jest.fn().mockImplementation((callback) => {
      // Store the callback for later use in tests
      mockEventCallbacks.onMessageReceived = callback;
      return { removeListener: jest.fn() };
    }),
    addListener: jest.fn(),
  })),
);

jest.mock('./AndroidService/sendMessage', () =>
  jest.fn().mockResolvedValue(undefined),
);

jest.mock('./getDefaultBridgeParams', () =>
  jest.fn().mockReturnValue({
    webviewRef: null,
    url: 'test-url',
    isMMSDK: true,
  }),
);

jest.mock('../handlers/handleCustomRpcCalls', () =>
  jest.fn().mockResolvedValue({
    id: 'test-id',
    method: 'test-method',
    params: [],
    jsonrpc: '2.0',
  }),
);

jest.mock('../../Permissions', () => ({
  getDefaultCaip25CaveatValue: jest.fn().mockReturnValue({
    requiredScopes: {},
    optionalScopes: {},
    sessionProperties: {},
    isMultichainOrigin: false,
  }),
}));

// // // Mock Engine
// // const Engine = {
// //   context: {
// //     KeyringController: {
// //       isUnlocked: jest.fn().mockReturnValue(true),
// //     },
// //     PermissionController: {
// //       requestPermissions: jest.fn().mockResolvedValue({}),
// //     },
// //     AccountsController: {
// //       getSelectedAccount: jest.fn().mockReturnValue({
// //         address: '0x123',
// //       }),
// //     },
// //     NetworkController: {
// //       getNetworkClientById: jest.fn().mockReturnValue({
// //         configuration: {
// //           chainId: '0x1',
// //         },
// //       }),
// //       state: {
// //         selectedNetworkClientId: 'mainnet',
// //       },
// //     },
// //   },
// // };

// jest.mock('../../Engine', () => Engine);

describe('AndroidService', () => {
  let androidService: AndroidService;

  beforeEach(() => {
    jest.clearAllMocks();
    androidService = new AndroidService();
  });

  describe('constructor', () => {
    it('should initialize properties and setup event listeners', () => {
      expect(androidService.communicationClient).toBe(
        NativeModules.CommunicationClient,
      );
      expect(androidService.connections).toEqual({});
      expect(androidService.rpcQueueManager).toBeInstanceOf(RPCQueueManager);
      expect(androidService.bridgeByClientId).toEqual({});
      expect(androidService.eventHandler).toBeDefined();
      expect(androidService.batchRPCManager).toBeInstanceOf(BatchRPCManager);
      expect(androidService.currentClientId).toBeUndefined();
    });
  });

  describe('getConnections', () => {
    it('should return filtered connections', () => {
      androidService.connections = {
        client1: {
          clientId: 'client1',
          connected: true,
          originatorInfo: {},
          validUntil: 123456789,
        },
        client2: {
          clientId: 'client2',
          connected: false,
          originatorInfo: {},
          validUntil: 123456789,
        },
        empty: {
          clientId: '',
          connected: true,
          originatorInfo: {},
          validUntil: 123456789,
        },
      };

      const connections = androidService.getConnections();
      expect(connections).toHaveLength(2);
      expect(connections[0].clientId).toBe('client1');
      expect(connections[1].clientId).toBe('client2');
      expect(DevLogger.log).toHaveBeenCalled();
    });
  });

  describe('removeConnection', () => {
    it('should remove connection and bridge', async () => {
      androidService.connections = {
        client1: {
          clientId: 'client1',
          connected: true,
          originatorInfo: {},
          validUntil: 123456789,
        },
      };

      androidService.bridgeByClientId = {
        client1: new BackgroundBridge({} as any),
      };

      await androidService.removeConnection('client1');

      expect(androidService.connections).not.toHaveProperty('client1');
      expect(androidService.bridgeByClientId).not.toHaveProperty('client1');
      expect(DevLogger.log).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      // Force an error
      androidService.connections = null as any;

      await androidService.removeConnection('client1');

      expect(Logger.log).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should call sendMessage function', async () => {
      const message = { type: MessageType.READY, data: { id: 'test' } };

      await androidService.sendMessage(message, false);

      expect(sendMessage).toHaveBeenCalledWith(androidService, message, false);
    });
  });

  describe('setupBridge', () => {
    it('should create a new bridge if it does not exist', () => {
      const clientInfo = {
        clientId: 'newClient',
        originatorInfo: { title: 'New Dapp' },
      };

      // Call the private method using any type assertion
      (androidService as any).setupBridge(clientInfo);

      expect(getDefaultBridgeParams).toHaveBeenCalledWith(clientInfo);
      expect(BackgroundBridge).toHaveBeenCalled();
      expect(androidService.bridgeByClientId).toHaveProperty('newClient');
      expect(DevLogger.log).toHaveBeenCalled();
    });

    it('should not create a bridge if it already exists', () => {
      const clientInfo = {
        clientId: 'existingClient',
        originatorInfo: { title: 'Existing Dapp' },
      };

      // Setup existing bridge
      androidService.bridgeByClientId = {
        existingClient: {} as any, // We do not call BackgroundBridge constructor to make sure it will not be called before assertions,
      };

      // Call the private method using any type assertion
      (androidService as any).setupBridge(clientInfo);

      // BackgroundBridge should not be called again
      expect(BackgroundBridge).not.toHaveBeenCalled();
    });
  });

  describe('restorePreviousConnections', () => {
    it('should restore bridges for previous connections', () => {
      androidService.connections = {
        client1: {
          clientId: 'client1',
          connected: false,
          originatorInfo: {},
          validUntil: 123456789,
        },
        client2: {
          clientId: 'client2',
          connected: false,
          originatorInfo: {},
          validUntil: 123456789,
        },
      };

      // Call the private method using any type assertion
      (androidService as any).restorePreviousConnections();

      expect(BackgroundBridge).toHaveBeenCalledTimes(2);
      expect(androidService.bridgeByClientId).toHaveProperty('client1');
      expect(androidService.bridgeByClientId).toHaveProperty('client2');
      expect(sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during bridge setup', () => {
      androidService.connections = {
        client1: {
          clientId: 'client1',
          connected: false,
          originatorInfo: {},
          validUntil: 123456789,
        },
      };

      // Force an error in setupBridge
      jest
        .spyOn(androidService as any, 'setupBridge')
        .mockImplementation(() => {
          throw new Error('Bridge setup failed');
        });

      // Call the private method using any type assertion
      (androidService as any).restorePreviousConnections();

      expect(Logger.log).toHaveBeenCalled();
    });

    it('should do nothing if no connections exist', () => {
      androidService.connections = {};

      // Call the private method using any type assertion
      (androidService as any).restorePreviousConnections();

      expect(BackgroundBridge).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('checkPermission', () => {
    it('should request permissions with correct parameters', async () => {
      const params = {
        originatorInfo: { title: 'Test Dapp' },
        channelId: 'test-channel',
      };

      // Call the private method using any type assertion
      await (androidService as any).checkPermission(params);

      expect(
        Engine.context.PermissionController.requestPermissions,
      ).toHaveBeenCalledWith(
        { origin: 'test-channel' },
        expect.objectContaining({
          [Caip25EndowmentPermissionName]: {
            caveats: [
              {
                type: Caip25CaveatType,
                value: expect.any(Object),
              },
            ],
          },
        }),
      );
      expect(getDefaultCaip25CaveatValue).toHaveBeenCalled();
    });
  });

  describe('setupOnClientsConnectedListener', () => {
    it('should register client connected callback', () => {
      // Call the private method using any type assertion
      (androidService as any).setupOnClientsConnectedListener();

      expect(androidService.eventHandler.onClientsConnected).toHaveBeenCalled();
    });
  });

  describe('setupOnMessageReceivedListener', () => {
    it('should register message received callback', () => {
      // Call the private method using any type assertion
      (androidService as any).setupOnMessageReceivedListener();

      expect(androidService.eventHandler.onMessageReceived).toHaveBeenCalled();
    });
  });
});
