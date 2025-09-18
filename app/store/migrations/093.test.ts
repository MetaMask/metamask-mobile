import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import migrate from './093';
import { EXISTING_USER } from '../../constants/storage';
import StorageWrapper from '../storage-wrapper';
import { userInitialState } from '../../reducers/user';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('../storage-wrapper', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedStorageWrapper = jest.mocked(StorageWrapper);

describe('Migration 093', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', async () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = await migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.getItem).not.toHaveBeenCalled();
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
  });

  it('moves EXISTING_USER from MMKV to Redux state when value is "true"', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('true');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: true,
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('moves EXISTING_USER from MMKV to Redux state when value is "false"', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('false');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: false,
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets existingUser to false when MMKV value is null', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue(null);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: false,
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception when user state is missing, but continues migration', async () => {
    const state = {};

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('true');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        ...userInitialState,
        existingUser: true, // Should use the MMKV value, not default to false
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Migration 93: User state is missing or invalid. Expected object, got: undefined',
      }),
    );
  });

  it('captures exception when user state is not an object, but continues migration', async () => {
    const state = {
      user: 'not an object',
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('true');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        ...userInitialState,
        existingUser: true, // Should use the MMKV value, not default to false
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Migration 93: User state is missing or invalid. Expected object, got: string',
      }),
    );
  });

  it('uses MMKV value of false when user state is corrupted', async () => {
    const state = {
      user: 'not an object',
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('false');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        ...userInitialState,
        existingUser: false, // Should use the MMKV value of false
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Migration 93: User state is missing or invalid. Expected object, got: string',
      }),
    );
  });

  it('handles StorageWrapper.getItem throwing an error', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    const error = new Error('Storage error');
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockRejectedValue(error);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: false,
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).toHaveBeenCalledWith(error);
  });

  it('migrates data successfully without attempting to remove from MMKV', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('true');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: true,
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
  });

  it('initializes with full userInitialState when user state is missing and error occurs', async () => {
    const state = {};

    const error = new Error('Storage error');
    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockRejectedValue(error);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        ...userInitialState,
        existingUser: false, // Default to false for safety
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).toHaveBeenCalledWith(error);
  });

  it('preserves existing existingUser value in Redux if already set', async () => {
    const state = {
      user: {
        existingUser: true,
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('false');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        existingUser: false, // Should be overwritten by MMKV value
        someOtherField: 'value',
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not remove from MMKV if value was null', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue(null);

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: false,
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedStorageWrapper.removeItem).not.toHaveBeenCalled();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles edge case with empty string value', async () => {
    const state = {
      user: {
        someOtherField: 'value',
      },
    };

    mockedEnsureValidState.mockReturnValue(true);
    mockedStorageWrapper.getItem.mockResolvedValue('');

    const migratedState = await migrate(state);

    expect(migratedState).toEqual({
      user: {
        someOtherField: 'value',
        existingUser: false, // Empty string !== 'true'
      },
    });

    expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(EXISTING_USER);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
