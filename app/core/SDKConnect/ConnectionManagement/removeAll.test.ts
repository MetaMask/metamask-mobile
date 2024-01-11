import removeAll from './removeAll';
import SDKConnect from '../SDKConnect';
import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../AppConstants';

jest.mock('react-native-default-preference', () => ({
  set: jest.fn().mockResolvedValue([]),
  get: jest.fn().mockResolvedValue(JSON.stringify({})),
  clear: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../AppConstants');
jest.mock('../SDKConnect');

describe('removeAll', () => {
  let mockInstance = {} as unknown as SDKConnect;
  const mockRemoveChannel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

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
    } as unknown as SDKConnect;
  });

  it('should remove each channel in connections', async () => {
    const mockChannelId = 'mockChannelId';

    mockInstance.state.connections[mockChannelId] = {
      otherPublicKey: 'mockOtherPublicKey',
    } as unknown as SDKConnect['state']['connections'][string];

    await removeAll(mockInstance);

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannelId, true);
  });

  it('should clear all android connections from DefaultPreference', async () => {
    await removeAll(mockInstance);

    expect(DefaultPreference.clear).toHaveBeenCalledWith(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
    );
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

  it('should clear SDK connections from DefaultPreference', async () => {
    await removeAll(mockInstance);

    expect(DefaultPreference.clear).toHaveBeenCalledWith(
      AppConstants.MM_SDK.SDK_CONNECTIONS,
    );
  });

  it('should clear approved hosts from DefaultPreference', async () => {
    await removeAll(mockInstance);

    expect(DefaultPreference.clear).toHaveBeenCalledWith(
      AppConstants.MM_SDK.SDK_APPROVEDHOSTS,
    );
  });
});
