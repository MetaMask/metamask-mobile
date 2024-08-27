import { Connection } from '../Connection';
import SDKConnect from '../SDKConnect';
import { waitForCondition } from '../utils/wait.util';
import reconnect from './reconnect';

jest.mock('../Connection', () => ({
  Connection: jest.fn(
    () =>
      ({
        remote: {
          isReady: jest.fn(),
          isPaused: jest.fn(),
          isConnected: jest.fn(),
          setOtherPublicKey: jest.fn(),
          connect: jest.fn(),
        },
        isReady: false,
        connect: jest.fn(),
        setTrigger: jest.fn(),
      } as unknown as Connection),
  ),
}));
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');

describe('reconnect', () => {
  let mockInstance = {} as unknown as SDKConnect;
  let mockConnection = {} as unknown as Connection;

  const mockRemoteIsReady = jest.fn();
  const mockRemoteIsPaused = jest.fn();
  const mockRemoteIsConnected = jest.fn();
  const mockRemoteSetOtherPublicKey = jest.fn();
  const mockRemoteConnect = jest.fn();
  const mockRemoveChannel = jest.fn();
  const mockWatchConnection = jest.fn();
  const mockSetTrigger = jest.fn();
  const mockApproveHost = jest.fn();
  const mockDisapproveChannel = jest.fn();
  const mockGetApprovedHosts = jest.fn();
  const mockRevalidateChannel = jest.fn();
  const mockIsApproved = jest.fn();
  const mockUpdateOriginatorInfos = jest.fn();
  const mockReconnect = jest.fn();
  const mockUpdateSDKLoadingState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      remote: {
        relayPersistence: false,
        isReady: mockRemoteIsReady,
        isPaused: mockRemoteIsPaused,
        isConnected: mockRemoteIsConnected,
        setOtherPublicKey: mockRemoteSetOtherPublicKey,
        connect: mockRemoteConnect,
      },
      otherPublicKey: 'test-other-public-key-2',
      isReady: false,
      connect: mockRemoteConnect,
      setTrigger: mockSetTrigger,
    } as unknown as Connection;

    mockInstance = {
      state: {
        connected: {
          'test-channel-id': mockConnection,
        },
        connections: {
          'test-channel-id': mockConnection,
        },
        approvedHosts: {},
        connecting: {},
        paused: false,
        socketServerUrl: 'ws://test-url',
        rpcqueueManager: {},
        navigation: {},
      },
      updateSDKLoadingState: mockUpdateSDKLoadingState,
      _approveHost: mockApproveHost,
      disapproveChannel: mockDisapproveChannel,
      getApprovedHosts: mockGetApprovedHosts,
      revalidateChannel: mockRevalidateChannel,
      isApproved: mockIsApproved,
      removeChannel: mockRemoveChannel,
      updateOriginatorInfos: mockUpdateOriginatorInfos,
      reconnect: mockReconnect,
      watchConnection: mockWatchConnection,
    } as unknown as SDKConnect;
  });

  describe('Handling already ready connections', () => {
    it('should skip reconnecting if the connection is already ready', async () => {
      mockRemoteIsReady.mockReturnValue(true);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(mockRemoteIsReady).toHaveBeenCalledTimes(1);
      expect(mockRemoteConnect).toHaveBeenCalledTimes(0);
      expect(mockSetTrigger).toHaveBeenCalledTimes(1);
    });
  });

  describe('Handling connection process', () => {
    it('should wait for the instance to resume from pause', async () => {
      mockRemoteIsReady.mockReturnValue(false);
      mockRemoteIsPaused.mockReturnValue(true);
      mockRemoteIsConnected.mockReturnValue(false);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(waitForCondition).toHaveBeenCalledTimes(1);
      expect(waitForCondition).toHaveBeenCalledWith({
        fn: expect.any(Function),
        context: 'reconnect_from_pause',
      });
    });

    it('should skip reconnecting for certain conditions', async () => {
      mockRemoteIsReady.mockReturnValue(false);
      mockRemoteIsPaused.mockReturnValue(false);
      mockRemoteIsConnected.mockReturnValue(false);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(mockRemoteIsReady).toHaveBeenCalledTimes(1);
      expect(mockRemoteIsPaused).toHaveBeenCalledTimes(1);
      expect(mockRemoteIsConnected).toHaveBeenCalledTimes(2);
    });

    it('should create a new connection instance if necessary', async () => {
      mockRemoteIsReady.mockReturnValue(false);
      mockRemoteIsPaused.mockReturnValue(false);
      mockRemoteIsConnected.mockReturnValue(false);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(mockRemoteIsReady).toHaveBeenCalledTimes(1);
      expect(mockRemoteIsPaused).toHaveBeenCalledTimes(1);
      expect(mockRemoteIsConnected).toHaveBeenCalledTimes(2);
      expect(
        mockInstance.state.connected['test-channel-id'].connect,
      ).toHaveBeenCalledTimes(1);
      expect(mockSetTrigger).toHaveBeenCalledTimes(1);
    });

    it('should initiate the connection with key exchange', async () => {
      mockRemoteIsReady.mockReturnValue(false);
      mockRemoteIsPaused.mockReturnValue(false);
      mockRemoteIsConnected.mockReturnValue(false);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(mockRemoteIsReady).toHaveBeenCalledTimes(1);
      expect(mockRemoteIsPaused).toHaveBeenCalledTimes(1);
      expect(mockRemoteIsConnected).toHaveBeenCalledTimes(2);
      expect(
        mockInstance.state.connected['test-channel-id'].connect,
      ).toHaveBeenCalledTimes(1);
    });

    it('should watch the new connection', async () => {
      mockRemoteIsReady.mockReturnValue(false);
      mockRemoteIsPaused.mockReturnValue(false);
      mockRemoteIsConnected.mockReturnValue(false);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(mockWatchConnection).toHaveBeenCalledTimes(1);
      expect(mockWatchConnection).toHaveBeenCalledWith(
        mockInstance.state.connected['test-channel-id'],
      );
    });

    it('should update connecting state after reconnecting', async () => {
      mockRemoteIsReady.mockReturnValue(false);
      mockRemoteIsPaused.mockReturnValue(false);
      mockRemoteIsConnected.mockReturnValue(false);

      await reconnect({
        initialConnection: false,
        instance: mockInstance,
        channelId: 'test-channel-id',
        trigger: 'deeplink',
        otherPublicKey: 'test-other-public-key',
        context: 'test-context',
      });

      expect(mockInstance.state.connecting['test-channel-id']).toEqual(true);
    });
  });
});
