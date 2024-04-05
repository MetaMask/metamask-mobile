import DefaultPreference from 'react-native-default-preference';
import loadDappConnections from './loadDappConnections';

jest.mock('../../../core/AppConstants');
jest.mock('react-native-default-preference', () => ({
  get: jest.fn().mockResolvedValue(''),
  set: jest.fn().mockResolvedValue(''),
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

    (DefaultPreference.get as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockConnections),
    );

    const result = await loadDappConnections();

    expect(result).toStrictEqual(mockConnections);
  });
});
