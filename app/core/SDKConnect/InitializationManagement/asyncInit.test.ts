import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import AppConstants from '../../AppConstants';
import Engine from '../../Engine';
import { store } from '../../../store';
import SDKConnect from '../SDKConnect';
import { wait } from '../utils/wait.util';
import asyncInit from './asyncInit';

jest.mock('@react-navigation/native');
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn().mockResolvedValue([]),
  setItem: jest.fn(),
  clearAll: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../AppConstants');
jest.mock('../../../util/Logger');
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');
jest.mock('../../Engine', () => ({
  context: {
    PermissionController: {
      getPermissions: jest.fn(),
      revokeAllPermissions: jest.fn(),
    },
  },
}));
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      sdk: {
        connections: {},
        approvedHosts: {},
      },
    })),
    dispatch: jest.fn(),
  },
}));

describe('asyncInit', () => {
  const { getPermissions, revokeAllPermissions } = (
    Engine.context as unknown as {
      PermissionController: {
        getPermissions: jest.Mock;
        revokeAllPermissions: jest.Mock;
      };
    }
  ).PermissionController;
  let mockInstance = {} as unknown as SDKConnect;
  let mockNavigation = {} as unknown as NavigationContainerRef<ParamListBase>;

  beforeEach(() => {
    jest.clearAllMocks();
    getPermissions.mockReset();
    revokeAllPermissions.mockReset();

    mockInstance = {
      state: {
        navigation: undefined,
        appState: '',
        connections: {},
        approvedHosts: {},
        _initialized: false,
      },
    } as unknown as SDKConnect;

    mockNavigation = {
      /* mock properties and methods as needed */
    } as unknown as NavigationContainerRef<ParamListBase>;
  });

  it('should set the navigation reference in the instance state', async () => {
    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(mockInstance.state.navigation).toEqual(mockNavigation);
  });

  it('should set the app state to active', async () => {
    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(mockInstance.state.appState).toEqual('active');
  });

  it('should wait for a brief period before continuing initialization', async () => {
    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(wait).toHaveBeenCalledTimes(1);
  });

  describe('Loading connections and hosts from storage', () => {
    it('should parse and set connections from the storage', async () => {
      await asyncInit({
        instance: mockInstance,
        navigation: mockNavigation,
      });

      expect(mockInstance.state.connections).toEqual({});
    });

    it('should check and update approved hosts from the storage', async () => {
      await asyncInit({
        instance: mockInstance,
        navigation: mockNavigation,
      });

      expect(mockInstance.state.approvedHosts).toEqual({});
    });
  });

  it('revokes permissions when an expired connection is dropped', async () => {
    getPermissions.mockReturnValue({ eth_accounts: {} });
    (store.getState as jest.Mock).mockReturnValueOnce({
      sdk: {
        connections: {
          channel1: { validUntil: Date.now() - 1000 },
        },
        approvedHosts: {},
        dappConnections: {},
      },
    });

    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(revokeAllPermissions).toHaveBeenCalledWith('channel1');
    expect(mockInstance.state.connections.channel1).toBeUndefined();
  });

  it('drops an expired connection even when its permissions cannot be revoked', async () => {
    getPermissions.mockReturnValue({ eth_accounts: {} });
    revokeAllPermissions.mockImplementationOnce(() => {
      throw new Error('revoke failed');
    });
    (store.getState as jest.Mock).mockReturnValueOnce({
      sdk: {
        connections: {
          channel1: { validUntil: Date.now() - 1000 },
        },
        approvedHosts: {
          [`${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}channel1`]: 1,
        },
        dappConnections: {},
      },
    });

    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(revokeAllPermissions).toHaveBeenCalledWith('channel1');
    expect(mockInstance.state.connections.channel1).toBeUndefined();
    expect(
      mockInstance.state.approvedHosts[
        `${AppConstants.MM_SDK.SDK_REMOTE_ORIGIN}channel1`
      ],
    ).toBeUndefined();
    expect(mockInstance.state._initialized).toBe(true);
  });

  it('should set the initialized state to true after successful initialization', async () => {
    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(mockInstance.state._initialized).toEqual(true);
  });
});
