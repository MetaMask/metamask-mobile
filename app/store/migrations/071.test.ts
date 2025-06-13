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

  it('returns the initial state', () => {
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

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
