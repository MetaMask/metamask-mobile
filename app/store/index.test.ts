import ReadOnlyNetworkStore from '../util/test/network-store';

jest.mock('../util/test/utils', () => ({
  isTest: true,
  getFixturesServerPortInApp: () => 12345,
  FIXTURE_SERVER_PORT: 12345,
}));

jest.mock('../util/test/network-store');

describe('Store initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
    // Re-mock these after reset
    jest.mock('../util/test/utils', () => ({
      isTest: true,
      getFixturesServerPortInApp: () => 12345,
      FIXTURE_SERVER_PORT: 12345,
    }));
    jest.mock('../util/test/network-store');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load initial state from network store in test environment', async () => {
    const mockState = {
      _asyncState: { some: 'async state' },
      _state: { some: 'state' }
    };

    (ReadOnlyNetworkStore.getState as jest.Mock).mockResolvedValue(mockState);

    await jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { store } = require('./index');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(store).toBeDefined();
      expect(ReadOnlyNetworkStore.getState).toHaveBeenCalled();
    });
  });

  it('should set initialState to undefined if network store returns empty state', async () => {
    const emptyState = {
      _asyncState: undefined,
      _state: undefined
    };

    (ReadOnlyNetworkStore.getState as jest.Mock).mockResolvedValue(emptyState);

    await jest.isolateModules(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { store } = require('./index');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(store).toBeDefined();
      expect(ReadOnlyNetworkStore.getState).toHaveBeenCalled();
    });
  });

  it('should set initialState to undefined in non-test environment', async () => {
    jest.resetModules();
    jest.mock('../util/test/utils', () => ({
      isTest: false,
    }));

    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const { store } = require('./index');
        expect(store).toBeDefined();
        expect(ReadOnlyNetworkStore.getState).not.toHaveBeenCalled();
    });
  });
});
