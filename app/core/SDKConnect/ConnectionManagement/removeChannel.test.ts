import AppConstants from '../../../core/AppConstants';
import Engine from '../../Engine';
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

  it('revokes permissions and deletes the channel when terminate fails', async () => {
    const mockChannelId = 'mockChannelId';
    const revokeAllPermissions = jest.fn();
    const mockHost = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + mockChannelId;

    mockInstance.state.connected[mockChannelId] = {
      removeConnection: jest.fn().mockResolvedValue(false),
    } as unknown as SDKConnect['state']['connected'][string];
    mockInstance.state.connections[mockChannelId] = {
      otherPublicKey: 'key',
    } as unknown as SDKConnect['state']['connections'][string];
    mockInstance.state.approvedHosts[mockHost] = 1234567890;

    const engine = {
      context: {
        PermissionController: {
          getPermissions: jest.fn().mockReturnValue({ eth_accounts: {} }),
          revokeAllPermissions,
        },
      },
    } as unknown as typeof Engine;

    const result = await removeChannel({
      channelId: mockChannelId,
      engine,
      instance: mockInstance,
    });

    expect(result).toBe(true);
    expect(revokeAllPermissions).toHaveBeenCalledWith(mockChannelId);
    expect(mockInstance.state.connected[mockChannelId]).toBeUndefined();
    expect(mockInstance.state.connections[mockChannelId]).toBeUndefined();
    expect(mockInstance.state.approvedHosts[mockHost]).toBeUndefined();
  });

  it('keeps the channel when revoking permissions throws', async () => {
    const mockChannelId = 'mockChannelId';
    const mockHost = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + mockChannelId;

    mockInstance.state.connected[mockChannelId] = {
      removeConnection: jest.fn().mockResolvedValue(true),
    } as unknown as SDKConnect['state']['connected'][string];
    mockInstance.state.approvedHosts[mockHost] = 1234567890;

    const engine = {
      context: {
        PermissionController: {
          getPermissions: jest.fn().mockReturnValue({ eth_accounts: {} }),
          revokeAllPermissions: jest.fn(() => {
            throw new Error('revoke failed');
          }),
        },
      },
    } as unknown as typeof Engine;

    const result = await removeChannel({
      channelId: mockChannelId,
      engine,
      instance: mockInstance,
    });

    expect(result).toBe(false);
    expect(mockInstance.state.connected[mockChannelId]).toBeDefined();
    expect(mockInstance.state.approvedHosts[mockHost]).toBe(1234567890);
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
