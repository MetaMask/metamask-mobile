import { ConnectionProps } from '@core/SDKConnect/Connection';
import SDKConnect from '@core/SDKConnect/SDKConnect';
import addDappConnection from './addDappConnection';

jest.mock('@core/SDKConnect/Connection');
jest.mock('@core/SDKConnect/SDKConnect');
jest.mock('@core/SDKConnect/utils/DevLogger');
jest.mock('@store/storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue(''),
}));
jest.mock('@core/AppConstants');

describe('addDappConnection', () => {
  let mockInstance = {} as unknown as SDKConnect;
  const mockEmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockInstance = {
      state: {
        connections: {},
        dappConnections: {},
      },
      emit: mockEmit,
    } as unknown as SDKConnect;
  });

  it('should add the connection to the instance state', async () => {
    const mockConnection = {
      id: 'test-id',
    } as unknown as ConnectionProps;

    await addDappConnection(mockConnection, mockInstance);

    expect(mockInstance.state.dappConnections[mockConnection.id]).toBe(
      mockConnection,
    );
  });
});
