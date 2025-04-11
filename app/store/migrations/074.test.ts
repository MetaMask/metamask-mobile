import migrate from './074';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

describe('Migration 074: Reset PhishingController phishingLists', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };

    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures exception if engine state is invalid', () => {
    const state = { invalidState: true };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 074: Invalid engine state structure',
    );
  });

  it('captures exception if PhishingController state is invalid', () => {
    const state = {
      engine: {
        backgroundState: {
          // PhishingController is missing
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 074: Invalid PhishingController state',
    );
  });

  it('resets PhishingController phishingLists to empty array while preserving other fields', () => {
    interface TestState {
      engine: {
        backgroundState: {
          PhishingController: {
            c2DomainBlocklistLastFetched: number;
            phishingLists: string[];
            whitelist: string[];
            hotlistLastFetched: number;
            stalelistLastFetched: number;
            extraProperty?: string;
          };
          OtherController: {
            shouldStayUntouched: boolean;
          };
        };
      };
    }

    const state: TestState = {
      engine: {
        backgroundState: {
          PhishingController: {
            c2DomainBlocklistLastFetched: 123456789,
            phishingLists: ['list1', 'list2'],
            whitelist: ['site1', 'site2'],
            hotlistLastFetched: 987654321,
            stalelistLastFetched: 123123123,
            extraProperty: 'should remain',
          },
          OtherController: {
            shouldStayUntouched: true,
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    // Only phishingLists should be reset to empty array
    expect(migratedState.engine.backgroundState.PhishingController.phishingLists).toEqual([]);

    // Other fields should remain unchanged
    expect(migratedState.engine.backgroundState.PhishingController.c2DomainBlocklistLastFetched).toBe(123456789);
    expect(migratedState.engine.backgroundState.PhishingController.whitelist).toEqual(['site1', 'site2']);
    expect(migratedState.engine.backgroundState.PhishingController.hotlistLastFetched).toBe(987654321);
    expect(migratedState.engine.backgroundState.PhishingController.stalelistLastFetched).toBe(123123123);
    expect(migratedState.engine.backgroundState.PhishingController.extraProperty).toBe('should remain');

    // Other controllers should remain untouched
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles error during migration', () => {
    // Create state with a PhishingController that throws when phishingLists is accessed
    const state = {
      engine: {
        backgroundState: {
          PhishingController: Object.defineProperty({}, 'phishingLists', {
            get: () => {
              throw new Error('Test error');
            },
            set: () => {
              throw new Error('Test error');
            },
            configurable: true,
            enumerable: true,
          }),
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 074: cleaning PhishingController state failed with error',
    );
  });
}); 