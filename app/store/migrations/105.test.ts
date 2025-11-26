import migrate from './105';
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

describe('Migration 105: Remove RatesController state', () => {
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

  it('removes RatesController from backgroundState', () => {
    interface TestState {
      engine: {
        backgroundState: {
          RatesController?: {
            cryptocurrencies: string[];
            fiatCurrency: string;
            rates: Record<string, unknown>;
          };
          MultichainAssetsRatesController: {
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
          RatesController: {
            cryptocurrencies: ['btc', 'sol'],
            fiatCurrency: 'usd',
            rates: {
              btc: {
                conversionRate: 45000,
                conversionDate: 1234567890,
                usdConversionRate: 45000,
              },
              sol: {
                conversionRate: 100,
                conversionDate: 1234567890,
                usdConversionRate: 100,
              },
            },
          },
          MultichainAssetsRatesController: {
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
      migratedState.engine.backgroundState.RatesController,
    ).toBeUndefined();

    expect(
      migratedState.engine.backgroundState.MultichainAssetsRatesController,
    ).toEqual({
      someProperty: 'should remain',
    });
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      shouldStayUntouched: true,
    });

    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves state unchanged if RatesController does not exist', () => {
    interface TestState {
      engine: {
        backgroundState: {
          MultichainAssetsRatesController: {
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
          MultichainAssetsRatesController: {
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
        backgroundState: Object.defineProperty({}, 'RatesController', {
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
      'Migration 105 failed',
    );
  });
});
