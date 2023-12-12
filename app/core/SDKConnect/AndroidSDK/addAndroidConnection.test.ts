import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../../core/AppConstants';
import { ConnectionProps } from '../Connection';
import SDKConnect from '../SDKConnect';
import addAndroidConnection from './addAndroidConnection';

jest.mock('../Connection');
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('react-native-default-preference', () => ({
  set: jest.fn().mockResolvedValue(''),
}));
jest.mock('../../../core/AppConstants');

describe('addAndroidConnection', () => {
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

  it('should add the connection to the instance state', async () => {
    const mockConnection = {
      id: 'test-id',
    } as unknown as ConnectionProps;

    await addAndroidConnection(mockConnection, mockInstance);

    expect(mockInstance.state.connections[mockConnection.id]).toBe(
      mockConnection,
    );
  });

  it('should save the updated connections to DefaultPreference', async () => {
    const mockConnection = {
      id: 'test-id',
    } as unknown as ConnectionProps;

    await addAndroidConnection(mockConnection, mockInstance);

    expect(DefaultPreference.set).toHaveBeenCalledWith(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
      JSON.stringify(mockInstance.state.connections),
    );
  });

  it('should emit a refresh event', async () => {
    const mockConnection = {
      id: 'test-id',
    } as unknown as ConnectionProps;

    await addAndroidConnection(mockConnection, mockInstance);

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('refresh');
  });
});
