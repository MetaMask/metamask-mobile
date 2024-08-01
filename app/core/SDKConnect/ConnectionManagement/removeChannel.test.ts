import AppConstants from '../../../core/AppConstants';
import SDKConnect from '../SDKConnect';
import removeChannel from './removeChannel';

jest.mock('../../../core/AppConstants');
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue([]),
  getItem: jest.fn().mockResolvedValue(JSON.stringify({})),
}));

describe('removeChannel', () => {
  let mockInstance = {} as unknown as SDKConnect;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        connected: {},
        connections: {},
        approvedHosts: {},
        disabledHosts: {},
        connecting: {},
      },
    } as unknown as SDKConnect;
  });

  describe('Removing a connected channel', () => {
    it('should remove the connection', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';

      mockInstance.state.connected[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
      } as unknown as SDKConnect['state']['connected'][string];

      removeChannel({
        channelId: mockChannelId,
        instance: mockInstance,
      });

      expect(mockInstance.state.connected[mockChannelId]).toBeUndefined();
    });

    it('should delete the channel from the connected state', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';

      mockInstance.state.connected[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
      } as unknown as SDKConnect['state']['connected'][string];

      removeChannel({
        channelId: mockChannelId,
        instance: mockInstance,
      });

      expect(mockInstance.state.connected[mockChannelId]).toBeUndefined();
    });

    it('should delete the channel from the connections state', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';

      mockInstance.state.connected[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
      } as unknown as SDKConnect['state']['connected'][string];

      removeChannel({
        channelId: mockChannelId,
        instance: mockInstance,
      });

      expect(mockInstance.state.connections[mockChannelId]).toBeUndefined();
    });

    it('should delete the channel from the approved hosts', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';
      const mockHost = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + mockChannelId;

      mockInstance.state.connected[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
      } as unknown as SDKConnect['state']['connected'][string];

      mockInstance.state.approvedHosts[mockHost] = 1234567890;

      removeChannel({
        channelId: mockChannelId,
        instance: mockInstance,
      });

      expect(mockInstance.state.approvedHosts[mockHost]).toBeUndefined();
    });

    it('should delete the channel from the disabled hosts', () => {
      const mockChannelId = 'mockChannelId';
      const mockOtherPublicKey = 'mockOtherPublicKey';
      const mockHost = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + mockChannelId;

      mockInstance.state.connected[mockChannelId] = {
        otherPublicKey: mockOtherPublicKey,
      } as unknown as SDKConnect['state']['connected'][string];

      mockInstance.state.disabledHosts[mockHost] = 1234567890;

      removeChannel({
        channelId: mockChannelId,
        instance: mockInstance,
      });

      expect(mockInstance.state.disabledHosts[mockHost]).toBeUndefined();
    });
  });

  it('should delete the channel from the connecting state', () => {
    const mockChannelId = 'mockChannelId';

    mockInstance.state.connecting[mockChannelId] = true;

    removeChannel({
      channelId: mockChannelId,
      instance: mockInstance,
    });

    expect(mockInstance.state.connecting[mockChannelId]).toBeUndefined();
  });
});
