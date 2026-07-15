import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { Connection } from './Connection';
import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import RPCQueueManager from '../RPCQueueManager';
import sendAuthorized from './Auth/sendAuthorized';
import {
  connect,
  disconnect,
  pause,
  removeConnection,
  resume,
} from './ConnectionLifecycle';
import {
  handleClientsConnected,
  handleClientsDisconnected,
  handleClientsReady,
  handleReceivedMessage,
} from './EventListenersHandlers';

jest.mock('@metamask/sdk-communication-layer');
jest.mock('../RPCQueueManager');
jest.mock('./Auth/sendAuthorized');
jest.mock('./ConnectionLifecycle');
jest.mock('./EventListenersHandlers');
jest.mock('../../BackgroundBridge/BackgroundBridge');

describe('Connection', () => {
  let connection: Connection;

  const mockHandleClientsConnected =
    handleClientsConnected as jest.MockedFunction<
      typeof handleClientsConnected
    >;
  const mockHandleClientsDisconnected =
    handleClientsDisconnected as jest.MockedFunction<
      typeof handleClientsDisconnected
    >;
  const mockHandleClientsReady = handleClientsReady as jest.MockedFunction<
    typeof handleClientsReady
  >;
  const mockHandleReceivedMessage =
    handleReceivedMessage as jest.MockedFunction<typeof handleReceivedMessage>;

  const mockConnect = connect as jest.MockedFunction<typeof connect>;
  const mockDisconnect = disconnect as jest.MockedFunction<typeof disconnect>;
  const mockPause = pause as jest.MockedFunction<typeof pause>;
  const mockRemoveConnection = removeConnection as jest.MockedFunction<
    typeof removeConnection
  >;
  const mockResume = resume as jest.MockedFunction<typeof resume>;

  const mockSendAuthorized = sendAuthorized as jest.MockedFunction<
    typeof sendAuthorized
  >;

  const mockId = 'testChannelId';
  const mockOtherPublicKey = 'testPublicKey';
  const mockOrigin = 'testOrigin';
  const mockReconnect = true;
  const mockInitialConnection = true;
  const mockNavigation = {} as NavigationContainerRef<ParamListBase>;
  const mockOriginatorInfo = {} as OriginatorInfo;
  const mockRpcManager = {} as RPCQueueManager;
  const mockSocketServerUrl = 'testSocketServerUrl';
  const mockTrigger = 'deeplink';
  const mockLastAuthorized = 123456789;
  const mockApproveHost = jest.fn();
  const mockGetApprovedHosts = jest.fn();
  const mockDisapprove = jest.fn();
  const mockRevalidate = jest.fn();
  const mockIsApproved = jest.fn();
  const mockUpdateOriginatorInfos = jest.fn();
  const mockOnTerminate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    connection = new Connection({
      id: mockId,
      otherPublicKey: mockOtherPublicKey,
      origin: mockOrigin,
      reconnect: mockReconnect,
      initialConnection: mockInitialConnection,
      navigation: mockNavigation,
      originatorInfo: mockOriginatorInfo,
      trigger: mockTrigger,
      lastAuthorized: mockLastAuthorized,
      onTerminate: mockOnTerminate,
      isApproved: mockIsApproved,
      approveHost: mockApproveHost,
      disapprove: mockDisapprove,
      getApprovedHosts: mockGetApprovedHosts,
      revalidate: mockRevalidate,
      updateOriginatorInfos: mockUpdateOriginatorInfos,
      socketServerUrl: mockSocketServerUrl,
      rpcQueueManager: mockRpcManager,
    });
  });

  describe('constructor', () => {
    it('should initialize the connection with provided parameters', () => {
      expect(connection).toBeDefined();
      expect(connection.channelId).toBe(mockId);
      expect(connection.origin).toBe(mockOrigin);
      expect(connection.reconnect).toBe(mockReconnect);
      expect(connection.initialConnection).toBe(mockInitialConnection);
      expect(connection.navigation).toBe(mockNavigation);
      expect(connection.originatorInfo).toBe(mockOriginatorInfo);
      expect(connection.trigger).toBe(mockTrigger);
      expect(connection.lastAuthorized).toBe(mockLastAuthorized);
      expect(connection.approveHost).toBe(mockApproveHost);
      expect(connection.getApprovedHosts).toBe(mockGetApprovedHosts);
      expect(connection.disapprove).toBe(mockDisapprove);
      expect(connection.revalidate).toBe(mockRevalidate);
      expect(connection.isApproved).toBe(mockIsApproved);
      expect(connection.onTerminate).toBe(mockOnTerminate);
      expect(connection.rpcQueueManager).toBe(mockRpcManager);
      expect(connection.socketServerUrl).toBe(mockSocketServerUrl);
    });
  });

  describe('connect', () => {
    it('should initiate connection with or without key exchange', () => {
      connection.connect({
        withKeyExchange: true,
        authorized: false,
      });

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledWith({
        instance: connection,
        withKeyExchange: true,
        authorized: false,
      });
    });
  });

  describe('sendAuthorized', () => {
    it('should send authorized message', () => {
      connection.sendAuthorized();

      expect(mockSendAuthorized).toHaveBeenCalledTimes(1);
      expect(mockSendAuthorized).toHaveBeenCalledWith({
        instance: connection,
      });
    });
  });

  describe('setLoading', () => {
    it('should set loading state and emit event', () => {
      connection.setLoading(true);

      expect(connection._loading).toBe(true);
    });
  });

  describe('getLoading', () => {
    it('should return current loading state', () => {
      connection._loading = true;

      expect(connection.getLoading()).toBe(true);
    });
  });

  describe('pause', () => {
    it('should pause the connection', () => {
      connection.pause();

      expect(mockPause).toHaveBeenCalledTimes(1);
      expect(mockPause).toHaveBeenCalledWith({
        instance: connection,
      });
    });
  });

  describe('resume', () => {
    it('should resume the connection', () => {
      connection.resume();

      expect(mockResume).toHaveBeenCalledTimes(1);
      expect(mockResume).toHaveBeenCalledWith({
        instance: connection,
      });
    });
  });

  describe('setTrigger', () => {
    it('should set the trigger for the connection', () => {
      connection.setTrigger('deeplink');

      expect(connection.trigger).toBe('deeplink');
    });
  });

  describe('disconnect', () => {
    it('should disconnect the connection with an optional termination flag', () => {
      connection.disconnect({
        terminate: true,
      });

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledWith({
        instance: connection,
        terminate: true,
      });
    });
  });

  describe('removeConnection', () => {
    it('should remove the connection with an optional termination flag', () => {
      connection.removeConnection({
        terminate: true,
      });

      expect(mockRemoveConnection).toHaveBeenCalledTimes(1);
      expect(mockRemoveConnection).toHaveBeenCalledWith({
        instance: connection,
        terminate: true,
      });
    });
  });

  describe('EventListenersHandlers', () => {
    describe('handleClientsConnected', () => {
      it('should handle clients connected event', () => {
        expect(mockHandleClientsConnected).toHaveBeenCalledTimes(1);
        expect(mockHandleClientsConnected).toHaveBeenCalledWith(connection);
      });
    });

    describe('handleClientsDisconnected', () => {
      it('should handle clients disconnected event', () => {
        expect(mockHandleClientsDisconnected).toHaveBeenCalledTimes(1);
        expect(mockHandleClientsDisconnected).toHaveBeenCalledWith({
          disapprove: mockDisapprove,
          instance: connection,
        });
      });
    });

    describe('handleClientsReady', () => {
      it('should handle clients ready event', () => {
        expect(mockHandleClientsReady).toHaveBeenCalledTimes(1);
        expect(mockHandleClientsReady).toHaveBeenCalledWith({
          instance: connection,
          disapprove: mockDisapprove,
          updateOriginatorInfos: mockUpdateOriginatorInfos,
          approveHost: mockApproveHost,
        });
      });
    });

    describe('handleReceivedMessage', () => {
      it('should handle received message event', () => {
        expect(mockHandleReceivedMessage).toHaveBeenCalledTimes(1);
        expect(mockHandleReceivedMessage).toHaveBeenCalledWith({
          instance: connection,
        });
      });
    });
  });
});
