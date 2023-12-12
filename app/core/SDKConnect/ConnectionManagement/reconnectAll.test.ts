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
      },
      reconnect: mockReconnect,
    } as unknown as SDKConnect;
  });

  it('should skip reconnecting if already reconnected', () => {
    mockInstance.state.reconnected = true;

    reconnectAll(mockInstance);

    expect(mockReconnect).not.toHaveBeenCalled();
  });

  describe('Reconnecting process', () => {
    it('should reconnect to each channel in the connections list', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';

      mockInstance.state.connections[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
      } as unknown as SDKConnect['state']['connections'][string];

      reconnectAll(mockInstance);

      expect(mockReconnect).toHaveBeenCalledWith({
        channelId: mockChannelId,
        otherPublicKey: mockOtherPublicKey,
        initialConnection: false,
        trigger: 'reconnect',
        context: 'reconnectAll',
      });
    });
  });

  it('should set the reconnected state to true after reconnecting', () => {
    reconnectAll(mockInstance);

    expect(mockInstance.state.reconnected).toBe(true);
  });
});
