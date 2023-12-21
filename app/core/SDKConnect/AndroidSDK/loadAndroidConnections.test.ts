import DefaultPreference from 'react-native-default-preference';
import AppConstants from '../../../core/AppConstants';
import loadAndroidConnections from './loadAndroidConnections';

jest.mock('../../../core/AppConstants');
jest.mock('react-native-default-preference', () => ({
  get: jest.fn().mockResolvedValue(''),
  set: jest.fn().mockResolvedValue(''),
}));
jest.mock('../utils/DevLogger');

describe('loadAndroidConnections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve Android connections from DefaultPreference', async () => {
    await loadAndroidConnections();

    expect(DefaultPreference.get).toHaveBeenCalledWith(
      AppConstants.MM_SDK.ANDROID_CONNECTIONS,
    );
  });

  it('should return an empty object if no connections are found', async () => {
    const result = await loadAndroidConnections();

    expect(result).toStrictEqual({});
  });

  it('should parse the retrieved connections', async () => {
    const mockConnections = {
      'test-id': {
        id: 'test-id',
      },
    };

    (DefaultPreference.get as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(mockConnections),
    );

    const result = await loadAndroidConnections();

    expect(result).toStrictEqual(mockConnections);
  });
});
