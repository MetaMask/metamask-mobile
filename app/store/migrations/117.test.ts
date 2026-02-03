import migrate, { migrationVersion } from './117';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn((_state: unknown, _version: number) => true),
}));

const mockedEnsureValidState = jest.mocked(
  jest.requireMock<{ ensureValidState: (s: unknown, v: number) => boolean }>(
    './util',
  ).ensureValidState,
);

describe(`Migration ${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if state is invalid', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const invalidState = null;
    const result = migrate(invalidState);
    expect(result).toBe(invalidState);
  });

  it('returns state unchanged if RampsController is missing', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged if RampsController is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: 'invalid',
        },
      },
    };
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('migrates legacy providers array and selectedProvider to ResourceState', () => {
    const providers = [{ id: '/providers/test', name: 'Test' }];
    const selectedProvider = providers[0];
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers,
            selectedProvider,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.providers,
    ).toStrictEqual({
      data: providers,
      selected: selectedProvider,
      isLoading: false,
      error: null,
    });
    expect(
      (result.engine.backgroundState.RampsController as Record<string, unknown>)
        .selectedProvider,
    ).toBeUndefined();
  });

  it('migrates legacy tokens and selectedToken to ResourceState', () => {
    const tokens = { topTokens: [], allTokens: [] };
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            tokens,
            selectedToken: null,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.RampsController.tokens).toStrictEqual({
      data: tokens,
      selected: null,
      isLoading: false,
      error: null,
    });
    expect(
      (result.engine.backgroundState.RampsController as Record<string, unknown>)
        .selectedToken,
    ).toBeUndefined();
  });

  it('migrates legacy paymentMethods array and selectedPaymentMethod to ResourceState', () => {
    const paymentMethods = [{ id: '/payments/card', paymentType: 'card' }];
    const selectedPaymentMethod = paymentMethods[0];
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            paymentMethods,
            selectedPaymentMethod,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.paymentMethods,
    ).toStrictEqual({
      data: paymentMethods,
      selected: selectedPaymentMethod,
      isLoading: false,
      error: null,
    });
    expect(
      (result.engine.backgroundState.RampsController as Record<string, unknown>)
        .selectedPaymentMethod,
    ).toBeUndefined();
  });

  it('migrates legacy countries array to ResourceState', () => {
    const countries = [{ isoCode: 'US', name: 'United States' }];
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            countries,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.countries,
    ).toStrictEqual({
      data: countries,
      selected: null,
      isLoading: false,
      error: null,
    });
  });

  it('migrates legacy quotes object to ResourceState', () => {
    const quotes = { success: [], sorted: [], error: [], customActions: [] };
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            quotes,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.RampsController.quotes).toStrictEqual({
      data: quotes,
      selected: null,
      isLoading: false,
      error: null,
    });
  });

  it('leaves userRegion untouched (handled by migration 116)', () => {
    const userRegion = 'us-ca';
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            userRegion,
            providers: [],
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.RampsController.userRegion).toBe(
      userRegion,
    );
  });

  it('leaves already-ResourceState fields unchanged', () => {
    const existingProviders = {
      data: [],
      selected: null,
      isLoading: false,
      error: null,
    };
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: existingProviders,
          },
        },
      },
    };

    const result = migrate(state) as typeof state;

    expect(result.engine.backgroundState.RampsController.providers).toBe(
      existingProviders,
    );
  });
});
