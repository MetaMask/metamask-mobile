import { Connection, ConnectionProps } from '../Connection';
import { DEFAULT_SESSION_TIMEOUT_MS } from '../SDKConnectConstants';
import { SDKConnect } from './../SDKConnect';
import connectToChannel from './connectToChannel';

jest.mock('react-native-default-preference', () => ({
  set: jest.fn().mockResolvedValue(''),
  get: jest.fn().mockResolvedValue(''),
}));
jest.mock('../../AppConstants');
jest.mock('../Connection');
jest.mock('./../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../SDKConnectConstants');

describe('connectToChannel', () => {
  let mockInstance = {} as unknown as SDKConnect;
  let mockConnection = {} as unknown as Connection;
  let id = '';
  let trigger = '' as ConnectionProps['trigger'];
  let otherPublicKey = '';
  let origin = '';
  let validUntil = Date.now();

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

  beforeEach(() => {
    jest.clearAllMocks();

    id = 'test-id';
    trigger = 'deeplink';
    otherPublicKey = 'test-otherPublicKey';
    origin = 'test-origin';
    validUntil = Date.now() + DEFAULT_SESSION_TIMEOUT_MS;

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

  //TODO: Needs to completely redo the connection logic in a separate PR since the protovol is in v2
  // describe('Creating new connections', () => {
  //   it('should create a new connection instance', async () => {
  //     mockConnection.isReady = false;

  //     await connectToChannel({
  //       instance: mockInstance,
  //       id,
  //       trigger,
  //       otherPublicKey,
  //       origin,
  //       validUntil,
  //     });

  //     const calledWithArg = (Connection as jest.MockedClass<typeof Connection>)
  //       .mock.calls[0][0];

  //     expect(JSON.stringify(calledWithArg)).toEqual(
  //       JSON.stringify({
  //         ...mockInstance.state.connections[id],
  //         socketServerUrl: mockInstance.state.socketServerUrl,
  //         initialConnection: mockInstance.state.approvedHosts[id] === undefined,
  //         trigger,
  //         rpcQueueManager: mockInstance.state.rpcqueueManager,
  //         navigation: mockInstance.state.navigation,
  //         updateOriginatorInfos:
  //           mockInstance.updateOriginatorInfos.bind(mockInstance),
  //         approveHost: mockInstance._approveHost.bind(mockInstance),
  //         disapprove: mockInstance.disapproveChannel.bind(mockInstance),
  //         getApprovedHosts: mockInstance.getApprovedHosts.bind(mockInstance),
  //         revalidate: mockInstance.revalidateChannel.bind(mockInstance),
  //         isApproved: mockInstance.isApproved.bind(mockInstance),
  //         onTerminate: ({
  //           channelId,
  //           sendTerminate,
  //         }: {
  //           channelId: string;
  //           sendTerminate?: boolean;
  //         }) => {
  //           mockInstance.removeChannel({ channelId, sendTerminate });
  //         },
  //       }),
  //     );
  //   });

  //   it('should initialize connection properties', async () => {
  //     mockConnection.isReady = false;

  //     await connectToChannel({
  //       instance: mockInstance,
  //       id,
  //       trigger,
  //       otherPublicKey,
  //       origin,
  //       validUntil,
  //     });

  //     expect(mockInstance.state.connections[id]).toEqual({
  //       id,
  //       initialConnection: true,
  //       otherPublicKey,
  //       origin,
  //       validUntil,
  //       lastAuthorized: 0,
  //     });
  //   });

  //   it('should watch the new connection', async () => {
  //     mockConnection.isReady = false;

  //     await connectToChannel({
  //       instance: mockInstance,
  //       id,
  //       trigger,
  //       otherPublicKey,
  //       origin,
  //       validUntil,
  //     });

  //     expect(mockWatchConnection).toHaveBeenCalledWith(
  //       mockInstance.state.connected[id],
  //     );
  //   });

  //   it('should initiate the connection with key exchange', async () => {
  //     mockConnection.isReady = false;

  //     await connectToChannel({
  //       instance: mockInstance,
  //       id,
  //       trigger,
  //       otherPublicKey,
  //       origin,
  //       validUntil,
  //     });

  //     expect(mockInstance.state.connected[id].connect).toHaveBeenCalledWith({
  //       withKeyExchange: true,
  //     });
  //   });

  //   it('should reset the connecting state after connecting', async () => {
  //     mockConnection.isReady = false;

  //     await connectToChannel({
  //       instance: mockInstance,
  //       id,
  //       trigger,
  //       otherPublicKey,
  //       origin,
  //       validUntil,
  //     });

  //     expect(mockInstance.state.connecting[id]).toBe(false);
  //   });
  // });
});
