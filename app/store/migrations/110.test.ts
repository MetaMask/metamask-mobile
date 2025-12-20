import migrate from './110';
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

describe('Migration 110: Remove SwapsController state', () => {
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

  it('returns state unchanged if backgroundState is missing', () => {
    const state = {
      engine: {},
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes SwapsController from backgroundState', () => {
    interface TestState {
      engine: {
        backgroundState: {
          SwapsController?: {
            chainCache: Record<string, unknown>;
          };
          BridgeController: {
            someProperty: string;
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
          SwapsController: {
            chainCache: {
              '0x1': { someData: 'value' },
            },
          },
          BridgeController: {
            someProperty: 'should remain',
          },
          OtherController: {
            shouldStayUntouched: true,
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    expect(
      migratedState.engine.backgroundState.SwapsController,
    ).toBeUndefined();

    expect(migratedState.engine.backgroundState.BridgeController).toEqual({
      someProperty: 'should remain',
    });
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves state unchanged if SwapsController does not exist', () => {
    interface TestState {
      engine: {
        backgroundState: {
          BridgeController: {
            someProperty: string;
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
          BridgeController: {
            someProperty: 'should remain',
          },
          OtherController: {
            shouldStayUntouched: true,
          },
        },
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state) as typeof state;

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles error during migration', () => {
    const state = {
      engine: {
        backgroundState: Object.defineProperty({}, 'SwapsController', {
          get: () => {
            throw new Error('Test error');
          },
          configurable: true,
          enumerable: true,
        }),
      },
    };

    mockedEnsureValidState.mockReturnValue(true);

    const migratedState = migrate(state);

    expect(migratedState).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toContain(
      'Migration 110 failed',
    );
  });
});
