import migrate from './026';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #26', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('delete list state property of phishing controller if it exists', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PhishingController: {
            listState: {},
          },
          KeyringController: { vault: {} },
        },
      },
    };

    const newState = migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          PhishingController: {},
          KeyringController: { vault: {} },
        },
      },
    });
  });
  it('hotlist and stale list last fetched is resetted to 0', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PhishingController: {
            listState: {},
            hotlistLastFetched: 1,
            stalelistLastFetched: 1,
          },
          KeyringController: { vault: {} },
        },
      },
    };

    const newState = migrate(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          PhishingController: {
            hotlistLastFetched: 0,
            stalelistLastFetched: 0,
          },
          KeyringController: { vault: {} },
        },
      },
    });
  });

  it('capture exception if phishing controller state is invalid', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PhishingController: {},
          KeyringController: { vault: {} },
        },
      },
    };
    const newState = migrate(oldState);
    expect(newState).toStrictEqual(oldState);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      `Migration 26: Invalid PhishingControllerState controller state: '${JSON.stringify(
        oldState.engine.backgroundState.PhishingController,
      )}'`,
    );
  });
});
