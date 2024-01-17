import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../../core/AppConstants';
import { ConnectionProps } from '../Connection';
import SDKConnect from '../SDKConnect';
import removeAndroidConnection from './removeAndroidConnection';

jest.mock('../../../core/AppConstants');
jest.mock('../SDKConnect');
jest.mock('react-native-default-preference', () => ({
  set: jest.fn().mockResolvedValue(''),
}));

describe('removeAndroidConnection', () => {
  let mockInstance = {} as unknown as SDKConnect;
  const mockEmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        connections: {},
      },
      emit: mockEmit,
    } as unknown as SDKConnect;
  });

  it('should remove the specified connection from the instance state', () => {
    const mockConnection = {
      id: 'test-id',
    };

    mockInstance.state.connections[mockConnection.id] =
      mockConnection as unknown as ConnectionProps;

    removeAndroidConnection(mockConnection.id, mockInstance);

    expect(mockInstance.state.connections[mockConnection.id]).toBeUndefined();
  });

  it('should update the connections in DefaultPreference', () => {
    const mockConnection = {
      id: 'test-id',
    };

    mockInstance.state.connections[mockConnection.id] =
      mockConnection as unknown as ConnectionProps;

    removeAndroidConnection(mockConnection.id, mockInstance);

    expect(DefaultPreference.set).toHaveBeenCalledWith(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
      JSON.stringify(mockInstance.state.connections),
    );
  });

  it('should emit a refresh event', () => {
    const mockConnection = {
      id: 'test-id',
    };

    mockInstance.state.connections[mockConnection.id] =
      mockConnection as unknown as ConnectionProps;

    removeAndroidConnection(mockConnection.id, mockInstance);

    expect(mockEmit).toHaveBeenCalledWith('refresh');
  });
});
