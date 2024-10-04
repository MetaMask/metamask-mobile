import SDKConnect from '../SDKConnect';
import reconnectAll from './reconnectAll';

jest.mock('../../../util/Logger');
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');

describe('reconnectAll', () => {
  let mockInstance = {} as unknown as SDKConnect;
  const mockReconnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockReconnect.mockResolvedValue(undefined);

    mockInstance = {
      state: {
        paused: false,
        reconnected: false,
        connections: {},
        connecting: {}
      },
      getConnected: jest.fn().mockReturnValue({}),
      reconnect: mockReconnect,
      emit: jest.fn(),
    } as unknown as SDKConnect;
  });

  it('should skip reconnecting if already reconnected', () => {
    mockInstance.state.reconnected = true;

    reconnectAll(mockInstance);

    expect(mockReconnect).not.toHaveBeenCalled();
  });

  describe('Reconnecting process', () => {
    it('should reconnect to each channel in the connections list with relayPersistence', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';

      mockInstance.state.connections[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
        origin: 'qr-code',
        relayPersistence: true,
        protocolVersion: '1.0',
      } as unknown as SDKConnect['state']['connections'][string];

      reconnectAll(mockInstance);

      expect(mockReconnect).toHaveBeenCalledWith({
        channelId: mockChannelId,
        otherPublicKey: mockOtherPublicKey,
        initialConnection: false,
        trigger: 'reconnect',
        context: 'reconnectAll',
        protocolVersion: '1.0',
      });
    });

    it('should reconnect to channels without relayPersistence', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';

      mockInstance.state.connections[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
        origin: 'qr-code',
        relayPersistence: false,
      } as unknown as SDKConnect['state']['connections'][string];

      reconnectAll(mockInstance);

      expect(mockReconnect).toHaveBeenCalled();
    });
  });

  it('should set the reconnected state to true after reconnecting', () => {
    reconnectAll(mockInstance);

    expect(mockInstance.state.reconnected).toBe(true);
  });
});
