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

jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

// Import the mocked checkPermissions
import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import { analytics } from '@metamask/sdk-analytics';
import { NavigationContainerRef } from '@react-navigation/native';
import type { RootParamList } from '../../../types/navigation';
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
  let mockConnectionRemoteReject: jest.Mock;

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

    mockGetKeyInfo.mockReturnValue({
      ecies: { otherPubKey: 'default-pub-key', private: 'default-priv-key' },
    });

    mockConnectionRemoteReject = jest.fn().mockResolvedValue(undefined);

    mockInstance = {
      state: {
        connected: {},
        connections: {},
        approvedHosts: {},
        connecting: {},
        paused: false,
        socketServerUrl: 'ws://test-url',
        rpcqueueManager: {},
        navigation: {
          getCurrentRoute: jest
            .fn()
            .mockReturnValue({ name: 'default-main-route' }),
          navigate: jest.fn(),
          dispatch: jest.fn(),
          reset: jest.fn(),
          goBack: jest.fn(),
          isFocused: jest.fn().mockReturnValue(true),
          canGoBack: jest.fn().mockReturnValue(true),
          getParent: jest.fn(),
          getState: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
          setParams: jest.fn(),
          setOptions: jest.fn(),
        } as unknown as NavigationContainerRef<RootParamList>,
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
        getKeyInfo: mockGetKeyInfo,
        connect: mockConnect,
        reject: mockConnectionRemoteReject,
        state: {},
      },
      connect: mockConnect,
      navigation: {
        getCurrentRoute: jest
          .fn()
          .mockReturnValue({ name: 'default-mock-conn-route' }),
        navigate: jest.fn(),
      } as unknown as NavigationContainerRef<RootParamList>,
    } as unknown as Connection;

    MockedConnection = Connection as jest.MockedClass<typeof Connection>;
    MockedConnection.mockClear();
    MockedConnection.mockImplementation(
      (props: ConnectionProps) =>
        ({
          ...props,
          remote: {
            getKeyInfo: mockGetKeyInfo,
            reject: mockConnectionRemoteReject,
            connect: jest.fn().mockResolvedValue(undefined),
            state: {},
            sendMessage: jest.fn().mockResolvedValue(undefined),
          },
          connect: jest.fn().mockResolvedValue(undefined),
          isReady: false,
          navigation: {
            getCurrentRoute: jest
              .fn()
              .mockReturnValue({ name: 'default-new-conn-route' }),
            navigate: jest.fn(),
            dispatch: jest.fn(),
            reset: jest.fn(),
            goBack: jest.fn(),
            isFocused: jest.fn().mockReturnValue(true),
            canGoBack: jest.fn().mockReturnValue(true),
            getParent: jest.fn(),
            getState: jest.fn(),
            addListener: jest.fn(),
            removeListener: jest.fn(),
            setParams: jest.fn(),
            setOptions: jest.fn(),
          } as unknown as NavigationContainerRef<RootParamList>,
        }) as unknown as Connection,
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
        otherPublicKey: 'default-pub-key',
        protocolVersion: undefined,
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

  describe('Analytics', () => {
    it('should track wallet_connection_request_received when anonId is present', async () => {
      originatorInfo.anonId = 'test-anon-id';
      (checkPermissions as jest.Mock).mockResolvedValue(true); // Ensure checkPermissions resolves

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

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_request_received',
        { anon_id: 'test-anon-id' },
      );
    });

    it('should track wallet_connection_user_approved when checkPermissions resolves', async () => {
      originatorInfo.anonId = 'test-anon-id';
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

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_user_approved',
        { anon_id: 'test-anon-id' },
      );
    });

    it('should track wallet_connection_user_rejected when checkPermissions rejects', async () => {
      originatorInfo.anonId = 'test-anon-id';
      (checkPermissions as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      );

      if (mockInstance.state.navigation) {
        mockInstance.state.navigation.getCurrentRoute = jest
          .fn()
          .mockReturnValue({ name: 'rejection-test-route' });
      }

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

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_user_rejected',
        { anon_id: 'test-anon-id' },
      );
    });
  });
});
