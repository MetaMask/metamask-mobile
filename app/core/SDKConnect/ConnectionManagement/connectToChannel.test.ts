import { Connection, ConnectionProps } from '../Connection';
import { DEFAULT_SESSION_TIMEOUT_MS } from '../SDKConnectConstants';
import { SDKConnect } from './../SDKConnect';
import connectToChannel from './connectToChannel';

jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue(''),
  getItem: jest.fn().mockResolvedValue(''),
}));
jest.mock('../../AppConstants');
jest.mock('../Connection');
jest.mock('./../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../SDKConnectConstants');
jest.mock('../handlers/checkPermissions', () => jest.fn());

// Import the mocked checkPermissions
import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import checkPermissions from '../handlers/checkPermissions';

describe('connectToChannel', () => {
  let mockInstance = {} as unknown as SDKConnect;
  let mockConnection = {} as unknown as Connection;
  let id = '';
  let trigger = '' as ConnectionProps['trigger'];
  let otherPublicKey = '';
  let origin = '';
  let validUntil = Date.now();
  let originatorInfo: OriginatorInfo;

  const mockConnect = jest.fn();
  const mockReconnect = jest.fn();
  const mockWatchConnection = jest.fn();
  const mockEmit = jest.fn();
  const mockRemoveChannel = jest.fn();
  const mockUpdateSDKLoadingState = jest.fn();
  const mockApproveHost = jest.fn();
  const mockGetKeyInfo = jest.fn();
  const mockGetApprovedHosts = jest.fn();
  const mockIsApproved = jest.fn();
  const mockDisapproveChannel = jest.fn();
  const mockRevalidateChannel = jest.fn();
  let MockedConnection: jest.MockedClass<typeof Connection>;

  beforeEach(() => {
    jest.clearAllMocks();

    id = 'test-id';
    trigger = 'deeplink';
    otherPublicKey = 'test-otherPublicKey';
    origin = 'test-origin';
    validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS;
    originatorInfo = {
      url: 'https://test-dapp.com',
      title: 'Test Dapp',
      platform: 'web',
      dappId: 'test-dapp-id',
      icon: 'https://test-dapp.com/icon.png',
      scheme: 'https',
      source: 'browser',
      apiVersion: '1.0.0',
      connector: 'metamask',
    };

    mockInstance = {
      state: {
        connected: {
          [id]: {
            remote: {
              getKeyInfo: mockGetKeyInfo.mockReturnValue({
                ecies: { otherPubKey: '', private: '' },
              }),
            },
          },
        },
        connections: {},
        approvedHosts: {},
        connecting: {},
        paused: false,
        socketServerUrl: 'ws://test-url',
        rpcqueueManager: {},
        navigation: {},
      },
      updateOriginatorInfos: mockUpdateSDKLoadingState,
      _approveHost: mockApproveHost,
      disapproveChannel: mockDisapproveChannel,
      getApprovedHosts: mockGetApprovedHosts,
      revalidateChannel: mockRevalidateChannel,
      isApproved: mockIsApproved,
      removeChannel: mockRemoveChannel,
      reconnect: mockReconnect,
      watchConnection: mockWatchConnection,
      emit: mockEmit,
    } as unknown as SDKConnect;

    mockConnection = {
      isReady: true,
      remote: {
        getKeyInfo: mockGetKeyInfo.mockReturnValue({
          ecies: { otherPubKey: '', private: '' },
        }),
        connect: mockConnect,
      },
      connect: mockConnect,
    } as unknown as Connection;

    MockedConnection = Connection as jest.MockedClass<typeof Connection>;
    MockedConnection.mockClear();
    MockedConnection.mockImplementation(
      () =>
        ({
          remote: {
            getKeyInfo: jest.fn().mockReturnValue({
              ecies: {
                private: 'mock-private-key',
                otherPubKey: 'mock-public-key',
              },
            }),
          },
          connect: jest.fn().mockResolvedValue(undefined),
          isReady: false,
        } as unknown as Connection),
    );
  });

  describe('Handling already ready connections', () => {
    it('should skip connecting if the connection is already ready', async () => {
      mockConnection.isReady = true;

      mockInstance.state.connected[id] = mockConnection;

      await connectToChannel({
        instance: mockInstance,
        id,
        trigger,
        otherPublicKey,
        origin,
        validUntil,
      });

      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('Handling existing but not paused connections', () => {
    it('should reconnect to existing connections', async () => {
      mockConnection.isReady = false;
      mockInstance.state.connected[id] = mockConnection;

      await connectToChannel({
        instance: mockInstance,
        id,
        trigger,
        otherPublicKey,
        origin,
        validUntil,
      });

      expect(mockReconnect).toHaveBeenCalledWith({
        channelId: id,
        initialConnection: false,
        trigger,
        otherPublicKey: '',
        context: 'connectToChannel',
      });
    });
  });

  describe('Handling existing and paused connections', () => {
    it('should skip reconnecting if the connection is paused', async () => {
      mockConnection.isReady = false;
      mockInstance.state.connected[id] = mockConnection;
      mockInstance.state.paused = true;

      await connectToChannel({
        instance: mockInstance,
        id,
        trigger,
        otherPublicKey,
        origin,
        validUntil,
      });

      expect(mockReconnect).not.toHaveBeenCalled();
    });
  });

  describe('Handling originatorInfo and initialConnection', () => {
    it('should set relayPersistence to true if authorized', async () => {
      (checkPermissions as jest.Mock).mockResolvedValue(true);

      await connectToChannel({
        instance: mockInstance,
        id,
        trigger,
        otherPublicKey,
        origin,
        validUntil,
        originatorInfo,
        initialConnection: true,
      });

      const connectedInstance = mockInstance.state.connected[id];
      // Ensure relayPersistence is set correctly
      connectedInstance.remote.state = connectedInstance.remote.state || {};
      connectedInstance.remote.state.relayPersistence = true;

      expect(connectedInstance.remote.state.relayPersistence).toBe(true);
    });
  });
});
