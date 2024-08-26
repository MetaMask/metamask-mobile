import { ConnectionProps } from '../Connection';
import SDKConnect from '../SDKConnect';
import addDappConnection from './addDappConnection';

jest.mock('../Connection');
jest.mock('../SDKConnect');
jest.mock('../utils/DevLogger');
jest.mock('../../../store/storage-wrapper', () => ({
  setItem: jest.fn().mockResolvedValue(''),
}));
jest.mock('../../../core/AppConstants');

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
