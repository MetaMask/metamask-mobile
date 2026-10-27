import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import migrate, { migrationVersion } from './159';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('redux-persist-filesystem-storage', () => ({
  __esModule: true,
  default: { removeItem: jest.fn() },
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);
const mockedRemoveItem = jest.mocked(FilesystemStorage.removeItem);

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
    mockedRemoveItem.mockResolvedValue(undefined);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(159);
  });

  it('removes all 8 deprecated controller keys from backgroundState and keeps TokensController', async () => {
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

    const result = (await migrate(state)) as TestState;

    expect(result.engine.backgroundState).toStrictEqual({
      AssetsController: { preserved: true },
      TokensController: { allTokens: {} },
    });
    expect(result.engine.preserved).toBe(true);
    expect(result.preserved).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes only the deprecated controller keys that are present', async () => {
    const state = buildValidState({
      CurrencyRateController: { currentCurrency: 'usd' },
      OtherController: { preserved: true },
    });

    const result = (await migrate(state)) as TestState;

    expect(result.engine.backgroundState).toStrictEqual({
      AssetsController: { preserved: true },
      OtherController: { preserved: true },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not change state when none of the deprecated controllers are present', async () => {
    const state = buildValidState({
      OtherController: { preserved: true },
    });
    const snapshot = JSON.stringify(state);

    const result = await migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when ensureValidState fails', async () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when backgroundState is not an object', async () => {
    const state = {
      engine: {
        backgroundState: 'invalid',
      },
    };

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('captures an exception and returns state unchanged when an error is thrown', async () => {
    const state = {
      engine: {
        get backgroundState(): never {
          throw new Error('boom');
        },
      },
    };

    const result = await migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration ${migrationVersion}: Failed to strip deprecated asset controller state`,
        ),
      }),
    );
  });

  it('deletes the persisted file of each of the 8 deprecated controllers, keeping TokensController', async () => {
    await migrate(buildValidState());

    expect(mockedRemoveItem.mock.calls.map(([key]) => key).sort()).toEqual(
      [
        'AccountTrackerController',
        'CurrencyRateController',
        'TokenBalancesController',
        'TokenRatesController',
        'TokenDetectionController',
        'MultichainAssetsController',
        'MultichainAssetsRatesController',
        'MultichainBalancesController',
      ]
        .map((name) => `persist:${name}`)
        .sort(),
    );
    expect(mockedRemoveItem).not.toHaveBeenCalledWith(
      'persist:TokensController',
    );
  });

  it('captures a failed file removal without aborting the migration', async () => {
    mockedRemoveItem.mockImplementation(async (key: string) => {
      if (key === 'persist:CurrencyRateController') {
        throw new Error('disk error');
      }
    });
    const state = buildValidState({
      CurrencyRateController: { currentCurrency: 'usd' },
    });

    const result = (await migrate(state)) as TestState;

    expect(mockedRemoveItem).toHaveBeenCalledTimes(8);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('CurrencyRateController'),
      }),
    );
    expect(result.engine.backgroundState).toStrictEqual({
      AssetsController: { preserved: true },
    });
  });

  it('does not delete files when ensureValidState fails', async () => {
    mockedEnsureValidState.mockReturnValue(false);

    await migrate({ invalid: true });

    expect(mockedRemoveItem).not.toHaveBeenCalled();
  });
});
