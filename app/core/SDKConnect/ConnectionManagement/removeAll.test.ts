import SDKConnect from '../SDKConnect';
import removeAll from './removeAll';

jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue([]),
  getItem: jest.fn().mockResolvedValue(JSON.stringify({})),
  clearAll: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../AppConstants');
jest.mock('../SDKConnect');

describe('removeAll', () => {
  let mockInstance = {} as unknown as SDKConnect;
  const mockRemoveChannel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveChannel.mockResolvedValue(true);

    mockInstance = {
      state: {
        connections: {},
        approvedHosts: {},
        disabledHosts: {},
        connected: {},
        connecting: {},
        paused: true,
      },
      removeChannel: mockRemoveChannel,
      loadDappConnections: jest.fn().mockResolvedValue({}),
      emit: jest.fn(),
    } as unknown as SDKConnect;
  });

  it('should keep session state when a channel is not revoked', async () => {
    mockInstance.state.connections.channelA = {
      otherPublicKey: 'a',
    } as unknown as SDKConnect['state']['connections'][string];
    mockInstance.state.approvedHosts = { host: 1 };
    mockRemoveChannel.mockResolvedValueOnce(false);

    const result = await removeAll(mockInstance);

    expect(result).toBe(false);
    expect(mockInstance.state.approvedHosts).toEqual({ host: 1 });
    expect(mockInstance.state.connections.channelA).toBeDefined();
  });

  it('should remove each channel in connections', async () => {
    const mockChannelId = 'mockChannelId';

    mockInstance.state.connections[mockChannelId] = {
      otherPublicKey: 'mockOtherPublicKey',
    } as unknown as SDKConnect['state']['connections'][string];

    await removeAll(mockInstance);

    expect(mockRemoveChannel).toHaveBeenCalledWith({
      channelId: mockChannelId,
      sendTerminate: true,
    });
  });

  describe('Resetting state properties', () => {
    it('should reset approved hosts', async () => {
      await removeAll(mockInstance);

      expect(mockInstance.state.approvedHosts).toEqual({});
    });

    it('should reset disabled hosts', async () => {
      await removeAll(mockInstance);

      expect(mockInstance.state.disabledHosts).toEqual({});
    });

    it('should reset connections', async () => {
      await removeAll(mockInstance);

      expect(mockInstance.state.connections).toEqual({});
    });

    it('should reset connected channels', async () => {
      await removeAll(mockInstance);

      expect(mockInstance.state.connected).toEqual({});
    });

    it('should reset connecting channels', async () => {
      await removeAll(mockInstance);

      expect(mockInstance.state.connecting).toEqual({});
    });

    it('should reset paused state', async () => {
      await removeAll(mockInstance);

      expect(mockInstance.state.paused).toBe(false);
    });
  });
});
