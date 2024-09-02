import StorageWrapper from '../../../store/storage-wrapper';
import loadDappConnections from './loadDappConnections';

jest.mock('../../../core/AppConstants');
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn().mockResolvedValue(''),
  setItem: jest.fn().mockResolvedValue(''),
}));
jest.mock('../utils/DevLogger');
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      sdk: {
        connections: {},
        approvedHosts: {},
      },
    })),
  },
}));

describe('loadDappConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty object if no connections are found', async () => {
    const result = await loadDappConnections();

    expect(result).toStrictEqual({});
  });

  it('should parse the retrieved connections', async () => {
    const mockConnections = {};

    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockConnections),
    );

    const result = await loadDappConnections();

    expect(result).toStrictEqual(mockConnections);
  });
});
