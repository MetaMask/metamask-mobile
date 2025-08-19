import migrate from './092';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
jest.mock('../../util/Logger');

const mockedCaptureException = jest.mocked(captureException);

// Create a minimal base state for testing
const createBaseState = () => ({
  engine: {
    backgroundState: {},
  },
});

describe('Migration #92', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 92: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, createBaseState(), {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 92: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, createBaseState(), {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 92: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
  ];

  it.each(invalidStates)(
    'captures exception if $scenario',
    ({ errorMessage, state }) => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    },
  );

  it('returns state unchanged when SmartTransactionsController is undefined (fresh install)', () => {
    const state = merge({}, createBaseState(), {
      engine: {
        backgroundState: {
          SmartTransactionsController: undefined,
        },
      },
    });

    const newState = migrate(state);

    expect(newState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('wipes all smart transactions when they exist', () => {
    const oldState = merge({}, createBaseState(), {
      engine: {
        backgroundState: {
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {
                [CHAIN_IDS.MAINNET]: [
                  {
                    txHash: '0x123',
                    status: SmartTransactionStatuses.SUCCESS,
                  },
                  {
                    txHash: '0x456',
                    status: SmartTransactionStatuses.PENDING,
                  },
                ],
                [CHAIN_IDS.OPTIMISM]: [
                  {
                    txHash: '0x789',
                    status: SmartTransactionStatuses.SUCCESS,
                  },
                ],
                [CHAIN_IDS.POLYGON]: [
                  {
                    txHash: '0xabc',
                    status: SmartTransactionStatuses.CANCELLED,
                  },
                ],
              },
            },
          },
        },
      },
    });

    const expectedState = merge({}, oldState);
    const smartTransactionsState = expectedState.engine.backgroundState
      .SmartTransactionsController.smartTransactionsState as {
      smartTransactions: Record<string, unknown>;
    };
    smartTransactionsState.smartTransactions = {};

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('wipes smart transactions with minimal state', () => {
    const oldState = merge({}, createBaseState(), {
      engine: {
        backgroundState: {
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {
                [CHAIN_IDS.MAINNET]: [
                  {
                    txHash: '0x123',
                    status: SmartTransactionStatuses.SUCCESS,
                  },
                ],
              },
            },
          },
        },
      },
    });

    const expectedState = merge({}, oldState);
    const smartTransactionsState = expectedState.engine.backgroundState
      .SmartTransactionsController.smartTransactionsState as {
      smartTransactions: Record<string, unknown>;
    };
    smartTransactionsState.smartTransactions = {};

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(expectedState);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles invalid SmartTransactionsController structure gracefully', () => {
    const state = merge({}, createBaseState(), {
      engine: {
        backgroundState: {
          SmartTransactionsController: {
            // Missing smartTransactionsState
          },
        },
      },
    });

    const newState = migrate(state);

    expect(newState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('handles SmartTransactionsController as non-object', () => {
    const state = merge({}, createBaseState(), {
      engine: {
        backgroundState: {
          SmartTransactionsController: 'invalid',
        },
      },
    });

    const newState = migrate(state);

    expect(newState).toStrictEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockedCaptureException.mock.calls[0][0].message).toBe(
      "Migration 92: Invalid SmartTransactionsController state: 'string'",
    );
  });

  it('handles empty smart transactions', () => {
    const state = merge({}, createBaseState(), {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                'account-1': {
                  id: 'account-1',
                  address: '0x1234567890abcdef1234567890abcdef12345678',
                  metadata: { name: 'Account 1' },
                },
              },
              selectedAccount: 'account-1',
            },
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {},
            },
          },
        },
      },
    });

    const newState = migrate(state);

    // State should remain unchanged but smartTransactions should still be an empty object
    const stateWithController = newState as {
      engine: {
        backgroundState: {
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: Record<string, unknown>;
            };
          };
        };
      };
    };
    expect(
      stateWithController.engine.backgroundState.SmartTransactionsController
        .smartTransactionsState.smartTransactions,
    ).toStrictEqual({});
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
