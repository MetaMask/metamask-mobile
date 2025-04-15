import migrate from './074';
import { captureException } from '@sentry/react-native';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration 074: Set isAccountSyncingEnabled to true', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      scenario: 'backgroundState is invalid',
    },
  ];

  it.each(invalidStates)('captures exception if %s', async ({ state }) => {
    const newState = await migrate(state);

    expect(newState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('sets isAccountSyncingEnabled to true if it did not exist prior to the migration', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          UserStorageController: {},
        },
      },
    });

    migrate(state);

    expect(
      state.engine.backgroundState.UserStorageController
        .isAccountSyncingEnabled,
    ).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets isAccountSyncingEnabled to true', () => {
    const state = merge({}, initialRootState, {
      engine: {
        backgroundState: {
          UserStorageController: {
            isAccountSyncingEnabled: false,
          },
        },
      },
    });

    migrate(state);

    expect(
      state.engine.backgroundState.UserStorageController
        .isAccountSyncingEnabled,
    ).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
