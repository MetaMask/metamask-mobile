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
        androidConnections: {},
      },
      emit: mockEmit,
    } as unknown as SDKConnect;
  });

  it('should add the connection to the instance state', async () => {
    const mockConnection = {
      id: 'test-id',
    } as unknown as ConnectionProps;

    await addAndroidConnection(mockConnection, mockInstance);

    expect(mockInstance.state.androidConnections[mockConnection.id]).toBe(
      mockConnection,
    );
  });
});
