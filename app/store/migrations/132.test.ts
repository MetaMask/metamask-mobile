import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import { STORAGE_KEY_PREFIX } from '@metamask/storage-service';
import migrate, { migrationVersion } from './132';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('redux-persist-filesystem-storage', () => ({
  getAllKeys: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);
const mockedFilesystemStorage = FilesystemStorage as jest.Mocked<
  typeof FilesystemStorage
>;

// Storage key constants matching the migration
const CONTROLLER_NAME = 'TokenListController';
const CACHE_KEY_PREFIX = 'tokensChainsCache';

function makeCacheKey(chainId: string): string {
  return `${STORAGE_KEY_PREFIX}${CONTROLLER_NAME}:${CACHE_KEY_PREFIX}:${chainId}`;
}

interface TestState {
  engine: {
    backgroundState: {
      TokenListController?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
}

function createValidState(
  tokenListControllerState?: Record<string, unknown>,
): TestState {
  return {
    engine: {
      backgroundState: {
        ...(tokenListControllerState !== undefined && {
          TokenListController: tokenListControllerState,
        }),
      },
    },
  };
}

describe(`Migration ${migrationVersion}: Remove TokenListController from persisted state`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
    mockedFilesystemStorage.getAllKeys.mockResolvedValue([]);
    mockedFilesystemStorage.removeItem.mockResolvedValue(undefined);
  });

  it('returns state unchanged if ensureValidState returns false', async () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedFilesystemStorage.getAllKeys).not.toHaveBeenCalled();
  });

  it('returns state unchanged if TokenListController is not in backgroundState', async () => {
    const state = createValidState();

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(state.engine.backgroundState.TokenListController).toBeUndefined();
  });

  it('removes the entire TokenListController key from backgroundState', async () => {
    const state = createValidState({
      tokensChainsCache: {},
    });

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(
      (result as TestState).engine.backgroundState.TokenListController,
    ).toBeUndefined();
  });

  it('removes TokenListController even when it contains tokensChainsCache data', async () => {
    const state = createValidState({
      tokensChainsCache: {
        '0x1': { timestamp: 1234567890, data: { '0xabc': { name: 'Token' } } },
        '0x89': { timestamp: 1234567891, data: {} },
      },
    });

    const result = await migrate(state);

    expect(
      (result as TestState).engine.backgroundState.TokenListController,
    ).toBeUndefined();
  });

  it('preserves other backgroundState controllers when removing TokenListController', async () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          TokenListController: { tokensChainsCache: {} },
          NetworkController: { selectedNetworkClientId: 'mainnet' },
          TokensController: { tokens: [] },
        },
      },
    };

    const result = await migrate(state);

    expect(
      (result as TestState).engine.backgroundState.TokenListController,
    ).toBeUndefined();
    expect(
      (result as TestState).engine.backgroundState.NetworkController,
    ).toStrictEqual({ selectedNetworkClientId: 'mainnet' });
    expect(
      (result as TestState).engine.backgroundState.TokensController,
    ).toStrictEqual({ tokens: [] });
  });

  it('deletes per-chain FilesystemStorage cache files', async () => {
    const cacheKeys = [
      makeCacheKey('0x1'),
      makeCacheKey('0x89'),
      makeCacheKey('0xa'),
    ];
    mockedFilesystemStorage.getAllKeys.mockResolvedValue(cacheKeys);

    const state = createValidState({ tokensChainsCache: {} });

    await migrate(state);

    expect(mockedFilesystemStorage.removeItem).toHaveBeenCalledTimes(3);
    cacheKeys.forEach((key) => {
      expect(mockedFilesystemStorage.removeItem).toHaveBeenCalledWith(key);
    });
  });

  it('does not call removeItem when no cache keys exist in FilesystemStorage', async () => {
    mockedFilesystemStorage.getAllKeys.mockResolvedValue([]);

    const state = createValidState({ tokensChainsCache: {} });

    await migrate(state);

    expect(mockedFilesystemStorage.removeItem).not.toHaveBeenCalled();
  });

  it('only removes TokenListController cache keys, not keys from other controllers', async () => {
    const cacheKeys = [makeCacheKey('0x1'), makeCacheKey('0x89')];
    const otherKeys = [
      `${STORAGE_KEY_PREFIX}SnapController:some-snap-id`,
      `${STORAGE_KEY_PREFIX}TokenDetectionController:someKey`,
    ];
    mockedFilesystemStorage.getAllKeys.mockResolvedValue([
      ...cacheKeys,
      ...otherKeys,
    ]);

    const state = createValidState({ tokensChainsCache: {} });

    await migrate(state);

    expect(mockedFilesystemStorage.removeItem).toHaveBeenCalledTimes(2);
    cacheKeys.forEach((key) => {
      expect(mockedFilesystemStorage.removeItem).toHaveBeenCalledWith(key);
    });
    otherKeys.forEach((key) => {
      expect(mockedFilesystemStorage.removeItem).not.toHaveBeenCalledWith(key);
    });
  });

  it('still removes TokenListController from state if FilesystemStorage.getAllKeys fails', async () => {
    mockedFilesystemStorage.getAllKeys.mockRejectedValue(
      new Error('Storage unavailable'),
    );

    const state = createValidState({ tokensChainsCache: {} });

    const result = await migrate(state);

    expect(
      (result as TestState).engine.backgroundState.TokenListController,
    ).toBeUndefined();
  });

  it('still removes remaining keys if one FilesystemStorage.removeItem call fails', async () => {
    const cacheKeys = [makeCacheKey('0x1'), makeCacheKey('0x89')];
    mockedFilesystemStorage.getAllKeys.mockResolvedValue(cacheKeys);
    mockedFilesystemStorage.removeItem
      .mockRejectedValueOnce(new Error('Remove failed'))
      .mockResolvedValueOnce(undefined);

    const state = createValidState({ tokensChainsCache: {} });

    const result = await migrate(state);

    expect(mockedFilesystemStorage.removeItem).toHaveBeenCalledTimes(2);
    expect(
      (result as TestState).engine.backgroundState.TokenListController,
    ).toBeUndefined();
  });

  it('captures exception and returns state unchanged on unexpected errors', async () => {
    // Make backgroundState a non-extensible proxy so `delete` throws
    const backgroundState = new Proxy(
      { TokenListController: { tokensChainsCache: {} } } as Record<
        string,
        unknown
      >,
      {
        deleteProperty() {
          throw new Error('Simulated unexpected deletion error');
        },
      },
    );

    const state = { engine: { backgroundState } };

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(`Migration ${migrationVersion}`),
      }),
    );
  });
});
