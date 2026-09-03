import { getConnectivityControllerInstanceOptions } from './connectivity-controller';
import { NetInfoConnectivityAdapter } from '../../controllers/connectivity';

jest.mock('../../controllers/connectivity', () => ({
  NetInfoConnectivityAdapter: jest
    .fn()
    .mockImplementation(() => ({ name: 'mock-netinfo-adapter' })),
}));

describe('getConnectivityControllerInstanceOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds options with a NetInfo connectivity adapter', () => {
    const options = getConnectivityControllerInstanceOptions();

    expect(NetInfoConnectivityAdapter).toHaveBeenCalledTimes(1);
    expect(options).toEqual({
      connectivityAdapter: { name: 'mock-netinfo-adapter' },
    });
  });
});
