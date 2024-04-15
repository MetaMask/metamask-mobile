import DefaultPreference from 'react-native-default-preference';
import loadAndroidConnections from './loadAndroidConnections';

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

describe('loadAndroidConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty object if no connections are found', async () => {
    const result = await loadAndroidConnections();

    expect(result).toStrictEqual({});
  });

  it('should parse the retrieved connections', async () => {
    const mockConnections = {};

    (DefaultPreference.get as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockConnections),
    );

    const result = await loadAndroidConnections();

    expect(result).toStrictEqual(mockConnections);
  });
});
