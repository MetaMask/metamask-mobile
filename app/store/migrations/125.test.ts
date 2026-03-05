import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
import migrate, { migrationVersion } from './125';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const invalidState = { invalid: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(invalidState);

    expect(result).toEqual(invalidState);
    expect(mockedEnsureValidState).toHaveBeenCalledWith(
      invalidState,
      migrationVersion,
    );
  });

  it('returns state unchanged if RampsController is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          SomeOtherController: {},
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state));

    expect(result).toEqual(state);
  });

  it('backfills status: idle on top-level ResourceState fields without status', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
            tokens: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
            paymentMethods: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
            countries: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.providers,
    ).toHaveProperty('status', 'idle');
    expect(result.engine.backgroundState.RampsController.tokens).toHaveProperty(
      'status',
      'idle',
    );
    expect(
      result.engine.backgroundState.RampsController.paymentMethods,
    ).toHaveProperty('status', 'idle');
    expect(
      result.engine.backgroundState.RampsController.countries,
    ).toHaveProperty('status', 'idle');
  });

  it('does not overwrite existing status field', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
              status: 'loading',
            },
            tokens: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    expect(result.engine.backgroundState.RampsController.providers.status).toBe(
      'loading',
    );
    expect(result.engine.backgroundState.RampsController.tokens).toHaveProperty(
      'status',
      'idle',
    );
  });

  it('backfills status on Transak sub-state ResourceState fields', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            nativeProviders: {
              transak: {
                userDetails: {
                  data: null,
                  selected: null,
                  isLoading: false,
                  error: null,
                },
                buyQuote: {
                  data: null,
                  selected: null,
                  isLoading: false,
                  error: null,
                },
                kycRequirement: {
                  data: null,
                  selected: null,
                  isLoading: false,
                  error: null,
                },
              },
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.nativeProviders.transak
        .userDetails,
    ).toHaveProperty('status', 'idle');
    expect(
      result.engine.backgroundState.RampsController.nativeProviders.transak
        .buyQuote,
    ).toHaveProperty('status', 'idle');
    expect(
      result.engine.backgroundState.RampsController.nativeProviders.transak
        .kycRequirement,
    ).toHaveProperty('status', 'idle');
  });

  it('handles missing nativeProviders gracefully', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.providers,
    ).toHaveProperty('status', 'idle');
  });

  it('handles missing transak in nativeProviders gracefully', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
            nativeProviders: {
              otherProvider: {},
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.providers,
    ).toHaveProperty('status', 'idle');
  });

  it('skips non-ResourceState fields (missing data or isLoading)', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
            someOtherField: {
              notAResource: true,
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    expect(
      result.engine.backgroundState.RampsController.providers,
    ).toHaveProperty('status', 'idle');
    expect(
      result.engine.backgroundState.RampsController.someOtherField,
    ).not.toHaveProperty('status');
  });

  it('handles invalid state structure gracefully', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: 'invalid',
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(state);

    // Migration should handle invalid structures gracefully without throwing
    expect(result).toEqual(state);
  });

  it('handles null RampsController gracefully', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: null,
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state));

    expect(result).toEqual(state);
  });

  it('handles complex state with mixed existing and missing status fields', () => {
    const state = {
      engine: {
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
              status: 'success',
            },
            tokens: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
            },
            paymentMethods: {
              data: [],
              selected: null,
              isLoading: true,
              error: null,
            },
            nativeProviders: {
              transak: {
                userDetails: {
                  data: null,
                  selected: null,
                  isLoading: false,
                  error: null,
                  status: 'error',
                },
                buyQuote: {
                  data: null,
                  selected: null,
                  isLoading: false,
                  error: null,
                },
              },
            },
          },
        },
      },
    };
    mockedEnsureValidState.mockReturnValue(true);

    const result = migrate(cloneDeep(state)) as typeof state;

    // Existing status preserved
    expect(result.engine.backgroundState.RampsController.providers.status).toBe(
      'success',
    );
    expect(
      result.engine.backgroundState.RampsController.nativeProviders.transak
        .userDetails.status,
    ).toBe('error');

    // Missing status backfilled
    expect(result.engine.backgroundState.RampsController.tokens.status).toBe(
      'idle',
    );
    expect(
      result.engine.backgroundState.RampsController.paymentMethods.status,
    ).toBe('idle');
    expect(
      result.engine.backgroundState.RampsController.nativeProviders.transak
        .buyQuote.status,
    ).toBe('idle');
  });
});
