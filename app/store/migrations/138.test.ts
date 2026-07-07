import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';

import migrate, { migrationVersion } from './138';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('redux-persist-filesystem-storage', () => ({
  getAllKeys: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedGetAllKeys = jest.mocked(FilesystemStorage.getAllKeys);
const mockedRemoveItem = jest.mocked(FilesystemStorage.removeItem);

const TOKEN_LIST_PREFIX = 'storageService:TokenListController:';
const OTHER_KEY = 'storageService:TokenRatesController:someKey';

describe(`Migration ${migrationVersion}: Delete orphaned TokenListController filesystem cache`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRemoveItem.mockResolvedValue(undefined);
  });

  it('returns state unchanged when getAllKeys returns null', async () => {
    const state = { some: 'state' };
    mockedGetAllKeys.mockResolvedValue(null as unknown as string[]);

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedRemoveItem).not.toHaveBeenCalled();
  });

  it('returns state unchanged and does not call removeItem when no matching keys exist', async () => {
    const state = { some: 'state' };
    mockedGetAllKeys.mockResolvedValue([OTHER_KEY]);

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedRemoveItem).not.toHaveBeenCalled();
  });

  it('deletes all matching TokenListController keys', async () => {
    const state = { some: 'state' };
    const tokenListKeys = [
      `${TOKEN_LIST_PREFIX}tokensChainsCache:0x1`,
      `${TOKEN_LIST_PREFIX}tokensChainsCache:0x89`,
      `${TOKEN_LIST_PREFIX}tokensChainsCache:0xa`,
    ];
    mockedGetAllKeys.mockResolvedValue([...tokenListKeys, OTHER_KEY]);

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedRemoveItem).toHaveBeenCalledTimes(3);
    for (const key of tokenListKeys) {
      expect(mockedRemoveItem).toHaveBeenCalledWith(key);
    }
    expect(mockedRemoveItem).not.toHaveBeenCalledWith(OTHER_KEY);
  });

  it('does not delete unrelated StorageService keys', async () => {
    const state = { some: 'state' };
    const unrelatedKeys = [
      'storageService:TokenRatesController:someKey',
      'storageService:TokenDetectionController:anotherKey',
      'persist:root',
    ];
    mockedGetAllKeys.mockResolvedValue(unrelatedKeys);

    await migrate(state);

    expect(mockedRemoveItem).not.toHaveBeenCalled();
  });

  it('returns state unchanged and captures exception when getAllKeys throws', async () => {
    const state = { some: 'state' };
    mockedGetAllKeys.mockRejectedValue(new Error('filesystem read error'));

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration ${migrationVersion}: Failed to delete TokenListController filesystem cache`,
        ),
      }),
    );
  });

  it('returns state unchanged and captures exception when removeItem throws', async () => {
    const state = { some: 'state' };
    mockedGetAllKeys.mockResolvedValue([
      `${TOKEN_LIST_PREFIX}tokensChainsCache:0x1`,
    ]);
    mockedRemoveItem.mockRejectedValue(new Error('filesystem write error'));

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration ${migrationVersion}: Failed to delete TokenListController filesystem cache`,
        ),
      }),
    );
  });

  it('returns state unchanged when key list is empty', async () => {
    const state = { some: 'state' };
    mockedGetAllKeys.mockResolvedValue([]);

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedRemoveItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
