import migrate, { migrationVersion } from './114';
import FilesystemStorage from 'redux-persist-filesystem-storage';

// Storage key constants matching the migration
const STORAGE_KEY_PREFIX = 'storageService:';
const CONTROLLER_NAME = 'TokenListController';
const CACHE_KEY_PREFIX = 'tokensChainsCache';

function makeStorageKey(chainId: string): string {
  return `${STORAGE_KEY_PREFIX}${CONTROLLER_NAME}:${CACHE_KEY_PREFIX}:${chainId}`;
}

jest.mock('redux-persist-filesystem-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../util/device', () => ({
  isIos: jest.fn().mockReturnValue(false),
}));

const mockFilesystemStorage = FilesystemStorage as jest.Mocked<
  typeof FilesystemStorage
>;

const createValidState = (
  tokenListControllerState: Record<string, unknown> = {},
) => ({
  engine: {
    backgroundState: {
      TokenListController: {
        tokensChainsCache: {},
        preventPollingOnNetworkRestart: false,
        ...tokenListControllerState,
      },
    },
  },
});

describe(`Migration ${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilesystemStorage.getItem.mockResolvedValue(undefined);
    mockFilesystemStorage.setItem.mockResolvedValue(undefined);
  });

  it('returns state unchanged if state is invalid', async () => {
    const invalidState = null;
    const result = await migrate(invalidState);
    expect(result).toBe(invalidState);
  });

  it('returns state unchanged if engine is missing', async () => {
    const invalidState = { foo: 'bar' };
    const result = await migrate(invalidState);
    expect(result).toStrictEqual(invalidState);
  });

  it('returns state unchanged if TokenListController is missing', async () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const result = await migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged if tokensChainsCache is missing', async () => {
    const state = createValidState({
      tokensChainsCache: undefined,
    });
    const result = await migrate(state);
    // tokensChainsCache should remain as-is (not modified)
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged if tokensChainsCache is empty', async () => {
    const state = createValidState({
      tokensChainsCache: {},
    });
    const result = await migrate(state);
    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .tokensChainsCache,
    ).toStrictEqual({});
  });

  it('migrates tokensChainsCache to FilesystemStorage for single chain', async () => {
    const chainId = '0x1';
    const cacheData = {
      timestamp: 1234567890,
      data: { token1: { name: 'Token1' } },
    };

    const state = createValidState({
      tokensChainsCache: {
        [chainId]: cacheData,
      },
    });

    const result = await migrate(state);

    // Verify data was saved to FilesystemStorage
    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      makeStorageKey(chainId),
      JSON.stringify(cacheData),
      false, // Device.isIos() returns false in mock
    );

    // Verify tokensChainsCache was cleared from state
    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .tokensChainsCache,
    ).toStrictEqual({});
  });

  it('migrates tokensChainsCache to FilesystemStorage for multiple chains', async () => {
    const chainIds = ['0x1', '0x89', '0xa'] as const;
    const cacheData = {
      '0x1': { timestamp: 1234567890, data: { token1: { name: 'Token1' } } },
      '0x89': { timestamp: 1234567891, data: { token2: { name: 'Token2' } } },
      '0xa': { timestamp: 1234567892, data: { token3: { name: 'Token3' } } },
    };

    const state = createValidState({
      tokensChainsCache: cacheData,
    });

    const result = await migrate(state);

    // Verify data was saved for each chain
    expect(mockFilesystemStorage.setItem).toHaveBeenCalledTimes(3);
    chainIds.forEach((chainId) => {
      expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
        makeStorageKey(chainId),
        JSON.stringify(cacheData[chainId]),
        false,
      );
    });

    // Verify tokensChainsCache was cleared from state
    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .tokensChainsCache,
    ).toStrictEqual({});
  });

  it('does not overwrite existing data in FilesystemStorage', async () => {
    const existingChainId = '0x1';
    const newChainId = '0x89';

    // Mock that 0x1 already exists in storage
    mockFilesystemStorage.getItem.mockImplementation(async (key: string) => {
      if (key === makeStorageKey(existingChainId)) {
        return JSON.stringify({ timestamp: 999, data: {} });
      }
      return undefined;
    });

    const state = createValidState({
      tokensChainsCache: {
        [existingChainId]: { timestamp: 1234567890, data: {} },
        [newChainId]: { timestamp: 1234567891, data: {} },
      },
    });

    const result = await migrate(state);

    // Verify only new chain was saved
    expect(mockFilesystemStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockFilesystemStorage.setItem).toHaveBeenCalledWith(
      makeStorageKey(newChainId),
      expect.any(String),
      false,
    );

    // Verify tokensChainsCache was still cleared
    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .tokensChainsCache,
    ).toStrictEqual({});
  });

  it('handles FilesystemStorage.setItem errors gracefully', async () => {
    const chainId = '0x1';
    mockFilesystemStorage.setItem.mockRejectedValue(
      new Error('Storage write failed'),
    );

    const state = createValidState({
      tokensChainsCache: {
        [chainId]: { timestamp: 1234567890, data: {} },
      },
    });

    // Should not throw
    const result = await migrate(state);

    // State should still have tokensChainsCache cleared
    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .tokensChainsCache,
    ).toStrictEqual({});
  });

  it('clears tokensChainsCache even when all chains already migrated', async () => {
    const chainId = '0x1';
    mockFilesystemStorage.getItem.mockResolvedValue(
      JSON.stringify({ timestamp: 999, data: {} }),
    );

    const state = createValidState({
      tokensChainsCache: {
        [chainId]: { timestamp: 1234567890, data: {} },
      },
    });

    const result = await migrate(state);

    // No setItem calls since data already exists
    expect(mockFilesystemStorage.setItem).not.toHaveBeenCalled();

    // tokensChainsCache should still be cleared
    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .tokensChainsCache,
    ).toStrictEqual({});
  });

  it('preserves other TokenListController state properties', async () => {
    const state = createValidState({
      tokensChainsCache: {
        '0x1': { timestamp: 1234567890, data: {} },
      },
      preventPollingOnNetworkRestart: true,
    });

    const result = await migrate(state);

    expect(
      (result as typeof state).engine.backgroundState.TokenListController
        .preventPollingOnNetworkRestart,
    ).toBe(true);
  });
});
