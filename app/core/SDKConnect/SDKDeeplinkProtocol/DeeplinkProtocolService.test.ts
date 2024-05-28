/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Linking } from 'react-native';
import Engine from '../../../core/Engine';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import SDKConnect from '../SDKConnect';
import handleCustomRpcCalls from '../handlers/handleCustomRpcCalls';
import DevLogger from '../utils/DevLogger';
import DeeplinkProtocolService from './DeeplinkProtocolService';

jest.mock('../SDKConnect');
jest.mock('../../../core/Engine');
jest.mock('react-native');
jest.mock('../../BackgroundBridge/BackgroundBridge');
jest.mock('../utils/DevLogger');
jest.mock('../../../util/Logger');
jest.mock('../handlers/handleCustomRpcCalls');

describe('DeeplinkProtocolService', () => {
  let service: DeeplinkProtocolService;

  beforeEach(() => {
    jest.clearAllMocks();
    (SDKConnect.getInstance as jest.Mock).mockReturnValue({
      loadDappConnections: jest.fn().mockResolvedValue([]),
      addDappConnection: jest.fn().mockResolvedValue(null),
    });

    (Engine.context as any) = {
      PermissionController: {
        requestPermissions: jest.fn().mockResolvedValue(null),
        getPermissions: jest
          .fn()
          .mockReturnValue({ eth_accounts: { caveats: [{ value: [] }] } }),
      },
      KeyringController: { unlock: jest.fn() },
      NetworkController: { state: { providerConfig: { chainId: '0x1' } } },
      PreferencesController: { state: { selectedAddress: '0xAddress' } },
    };

    (Linking.openURL as jest.Mock).mockResolvedValue(null);
    service = new DeeplinkProtocolService();
  });

  describe('init', () => {
    it('should initialize and load connections', async () => {
      const spy = jest.spyOn(SDKConnect.getInstance(), 'loadDappConnections');
      // @ts-ignore
      await service.init();
      expect(spy).toHaveBeenCalled();
      // @ts-ignore
      expect(service.isInitialized).toBe(true);
    });
  });

  describe('setupBridge', () => {
    it('should set up a bridge for the client', () => {
      const clientInfo = {
        clientId: 'client1',
        originatorInfo: { url: 'test.com', title: 'Test' },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };
      // @ts-ignore
      service.setupBridge(clientInfo);
      // @ts-ignore
      expect(service.bridgeByClientId[clientInfo.clientId]).toBeInstanceOf(
        BackgroundBridge,
      );
    });
  });

  describe('sendMessage', () => {
    it('should handle sending messages correctly', async () => {
      // @ts-ignore
      service.rpcQueueManager.getId = jest.fn().mockReturnValue('rpcMethod');
      // @ts-ignore
      service.batchRPCManager.getById = jest.fn().mockReturnValue(null);
      // @ts-ignore
      service.rpcQueueManager.isEmpty = jest.fn().mockReturnValue(true);
      // @ts-ignore
      service.rpcQueueManager.remove = jest.fn(); // Mock the remove method

      await service.sendMessage({ data: { id: '1' } }, true);
      // @ts-ignore
      expect(service.rpcQueueManager.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('openDeeplink', () => {
    it('should open a deeplink with the provided message', async () => {
      const spy = jest.spyOn(Linking, 'openURL');
      // @ts-ignore
      await service.openDeeplink({
        message: { test: 'test' },
        clientId: 'client1',
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('checkPermission', () => {
    it('should request permissions', async () => {
      const spy = jest.spyOn(
        Engine.context.PermissionController,
        'requestPermissions',
      );
      // @ts-ignore
      await service.checkPermission({
        channelId: 'channel1',
        originatorInfo: {
          url: 'test.com',
          title: 'Test',
          icon: 'icon',
          platform: 'platform',
          dappId: 'dappId',
        },
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('processDappRpcRequest', () => {
    it('should process a dapp RPC request', async () => {
      const params = {
        dappPublicKey: 'key',
        url: 'url',
        scheme: 'scheme',
        channelId: 'channel1',
        originatorInfo: 'info',
        request: JSON.stringify({ id: '1', method: 'test', params: [] }),
      };
      // @ts-ignore
      service.bridgeByClientId.channel1 = { onMessage: jest.fn() } as any;
      // @ts-ignore
      await service.processDappRpcRequest(params);
      expect(handleCustomRpcCalls).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should handle an incoming message', () => {
      const params = {
        dappPublicKey: 'key',
        url: 'url',
        message: Buffer.from(
          JSON.stringify({ id: '1', method: 'test', params: [] }),
        ).toString('base64'),
        channelId: 'channel1',
        scheme: 'scheme',
        account: '0xAddress@1',
      };
      service.handleMessage(params);
      expect(DevLogger.log).toHaveBeenCalled();
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      // @ts-ignore
      service.connections.channel1 = {} as any;
      service.removeConnection('channel1');
      // @ts-ignore
      expect(service.connections.channel1).toBeUndefined();
    });
  });
});
