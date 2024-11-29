import migrate from './061';
import { captureException } from '@sentry/react-native';
import mockedEngine from '../../core/__mocks__/MockedEngine';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Migration #61 - remove featureFlags property from redux state', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 61: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`captures exception if ${scenario}`, async () => {
      const newState = await migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('removes featureFlags property from redux state', async () => {
    const oldState = {
      engine: {
        backgroundState: {},
      },
      featureFlags: {
        minimumAppVersion: 29,
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {},
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
