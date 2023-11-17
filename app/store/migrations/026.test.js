import { migrate, version } from './026';

describe('#26', () => {
  it('delete list state property of phishing controller if it exists', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PhishingController: {
            listState: {},
          },
        },
      },
    };

    const migration = migrations[26];
    const newState = migration(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          PhishingController: {},
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
        },
      },
    };

    const migration = migrations[26];
    const newState = migration(oldState);
    expect(newState).toStrictEqual({
      engine: {
        backgroundState: {
          PhishingController: {
            hotlistLastFetched: 0,
            stalelistLastFetched: 0,
          },
        },
      },
    });
  });

  it('capture exception if phishing controller state is invalid', () => {
    const oldState = {
      engine: {
        backgroundState: {
          PhishingController: {},
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
