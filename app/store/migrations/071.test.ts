import migrate from './071';
import { captureException } from '@sentry/react-native';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration 071: Set completedOnboarding based on the KeyringController state', () => {
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

  it('sets completedOnboarding to true if vault exists', () => {
    const state = merge({}, initialRootState, {
      onboarding: {
        completedOnboarding: false,
      },
      engine: {
        backgroundState: {
          KeyringController: {
            vault: true,
          },
        },
      },
    });

    migrate(state);

    expect(state.onboarding.completedOnboarding).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('sets completedOnboarding to false if vault does not exist', () => {
    const state = merge({}, initialRootState, {
      onboarding: {
        completedOnboarding: false,
      },
      engine: {
        backgroundState: {
          KeyringController: {
            vault: false,
          },
        },
      },
    });

    migrate(state);

    expect(state.onboarding.completedOnboarding).toBe(false);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('adds the completedOnboarding property if it does not exist', () => {
    const state = merge({}, initialRootState, {
      onboarding: {},
      engine: {
        backgroundState: {
          KeyringController: {
            vault: true,
          },
        },
      },
    });

    migrate(state);

    expect(state.onboarding.completedOnboarding).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
