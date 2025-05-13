import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
import migrate from './078';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = () => ({
  engine: {
    backgroundState: {
      UserStorageController: {
        isProfileSyncingEnabled: true,
        isProfileSyncingUpdateLoading: false,
      },
    },
  },
});

describe('Migration 78: Update profile sync state properties to backup and sync ones', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('copies and deletes specified properties from UserStorageController', () => {
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          UserStorageController: {
            isBackupAndSyncEnabled: true,
            isBackupAndSyncUpdateLoading: false,
          },
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {
          backgroundState: {
            UserStorageController: 'invalid',
          },
        },
      },
      test: 'invalid UserStorageController state',
      expectedError:
        "FATAL ERROR: Migration 78: Invalid UserStorageController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'invalid UserStorageController state',
      expectedError:
        "FATAL ERROR: Migration 78: Invalid UserStorageController state error: 'undefined'",
    },
  ])(
    'captures exception and returns state unchanged for invalid state - $test',
    ({ state, expectedError }) => {
      const orgState = cloneDeep(state);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(state);

      // State should be unchanged
      expect(migratedState).toStrictEqual(orgState);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expectedError,
        }),
      );
    },
  );
});
