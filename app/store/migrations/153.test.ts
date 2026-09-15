import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './153';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
    preserved?: boolean;
  };
  preserved?: boolean;
}

function buildValidState(
  backgroundState: Record<string, unknown> = {},
): TestState {
  return {
    engine: {
      backgroundState: {
        AssetsController: { preserved: true },
        ...backgroundState,
      },
      preserved: true,
    },
    preserved: true,
  };
}

describe(`Migration ${migrationVersion}: Strip deprecated asset controller state`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(153);
  });

  it('removes all 9 deprecated controller keys from backgroundState', () => {
    const state = buildValidState({
      AccountTrackerController: { accountsByChainId: {} },
      TokensController: { allTokens: {} },
      CurrencyRateController: { currentCurrency: 'usd' },
      TokenBalancesController: { tokenBalances: {} },
      TokenRatesController: { marketData: {} },
      TokenDetectionController: { someState: true },
      MultichainAssetsController: { accountsAssets: {} },
      MultichainAssetsRatesController: { conversionRates: {} },
      MultichainBalancesController: { balances: {} },
    });

    const result = migrate(state) as TestState;

    expect(result.engine.backgroundState).toStrictEqual({
      AssetsController: { preserved: true },
    });
    expect(result.engine.preserved).toBe(true);
    expect(result.preserved).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes only the deprecated controller keys that are present', () => {
    const state = buildValidState({
      TokensController: { allTokens: {} },
      OtherController: { preserved: true },
    });

    const result = migrate(state) as TestState;

    expect(result.engine.backgroundState).toStrictEqual({
      AssetsController: { preserved: true },
      OtherController: { preserved: true },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not change state when none of the deprecated controllers are present', () => {
    const state = buildValidState({
      OtherController: { preserved: true },
    });
    const snapshot = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when backgroundState is not an object', () => {
    const state = {
      engine: {
        backgroundState: 'invalid',
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures an exception and returns state unchanged when an error is thrown', () => {
    const state = {
      engine: {
        get backgroundState(): never {
          throw new Error('boom');
        },
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration ${migrationVersion}: Failed to strip deprecated asset controller state`,
        ),
      }),
    );
  });
});
