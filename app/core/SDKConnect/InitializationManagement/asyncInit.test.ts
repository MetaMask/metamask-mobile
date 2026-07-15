import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
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
  let mockInstance = {} as unknown as SDKConnect;
  let mockNavigation = {} as unknown as NavigationContainerRef<ParamListBase>;

  beforeEach(() => {
    jest.clearAllMocks();

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

  it('should set the initialized state to true after successful initialization', async () => {
    await asyncInit({
      instance: mockInstance,
      navigation: mockNavigation,
    });

    expect(mockInstance.state._initialized).toEqual(true);
  });
});
