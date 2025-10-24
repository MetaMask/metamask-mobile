import migrate from './104';
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

describe('Migration 104: Reset PhishingController urlScanCache', () => {
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
      'Migration 104: Invalid PhishingController state',
    );
  });

  it('resets PhishingController urlScanCache to empty object while preserving other fields', () => {
    interface TestState {
      engine: {
        backgroundState: {
          PhishingController: {
            c2DomainBlocklistLastFetched: number;
            phishingLists: string[];
            whitelist: string[];
            hotlistLastFetched: number;
            stalelistLastFetched: number;
            urlScanCache: Record<string, unknown>;
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
            urlScanCache: {
              'example.com': { result: 'safe', timestamp: 1234567890 },
              'phishing.com': { result: 'malicious', timestamp: 9876543210 },
            },
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

    // urlScanCache should be reset to empty object
    expect(
      migratedState.engine.backgroundState.PhishingController.urlScanCache,
    ).toEqual({});

    // Other fields should remain unchanged
    expect(
      migratedState.engine.backgroundState.PhishingController
        .c2DomainBlocklistLastFetched,
    ).toBe(123456789);
    expect(
      migratedState.engine.backgroundState.PhishingController.phishingLists,
    ).toEqual(['list1', 'list2']);
    expect(
      migratedState.engine.backgroundState.PhishingController.whitelist,
    ).toEqual(['site1', 'site2']);
    expect(
      migratedState.engine.backgroundState.PhishingController
        .hotlistLastFetched,
    ).toBe(987654321);
    expect(
      migratedState.engine.backgroundState.PhishingController
        .stalelistLastFetched,
    ).toBe(123123123);
    expect(
      migratedState.engine.backgroundState.PhishingController.extraProperty,
    ).toBe('should remain');

    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles error during migration', () => {
    // Create state with a PhishingController that throws when urlScanCache is accessed
    const state = {
      engine: {
        backgroundState: {
          PhishingController: Object.defineProperty({}, 'urlScanCache', {
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
      'Migration 104: cleaning PhishingController state failed with error',
    );
  });
});
