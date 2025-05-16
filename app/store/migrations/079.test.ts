import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate from './072';

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
      SeedlessOnboardingController: {
        socialBackupsMetadata: [],
      },
    },
  },
});

describe('Migration 77: Add Seedless Onboarding default state', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual({ some: 'state' });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('adds Seedless Onboarding default state to state', () => {
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          SeedlessOnboardingController: {
            ...oldState.engine.backgroundState.SeedlessOnboardingController,
            socialBackupsMetadata: [],
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
        engine: {},
      },
      test: 'empty engine state',
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
      test: 'empty backgroundState',
    },
    {
      state: {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: 'invalid',
          },
        },
      },
      test: 'invalid SeedlessOnboardingController state',
    },
    {
      state: {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              socialBackupsMetadata: 'invalid',
            },
          },
        },
      },
      test: 'invalid socialBackupsMetadata state',
    },
  ])('does not modify state if the state is invalid - $test', ({ state }) => {
    const orgState = cloneDeep(state);
    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    // State should be unchanged
    expect(migratedState).toStrictEqual(orgState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
