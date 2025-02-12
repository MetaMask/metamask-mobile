import migration from './057';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import {
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  internalAccount2,
} from '../../util/test/accountsControllerTestUtils';

const oldState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [expectedUuid]: internalAccount1,
            [expectedUuid2]: internalAccount2,
          },
          selectedAccount: expectedUuid,
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #57', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      scenario: 'engine state is invalid',
      expectedError:
        "FATAL ERROR: Migration 57: Invalid engine state error: 'object'",
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      scenario: 'backgroundState is invalid',
      expectedError:
        "FATAL ERROR: Migration 57: Invalid engine backgroundState error: 'object'",
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: { internalAccounts: null },
          },
        },
      }),
      scenario: 'AccountsController internalAccounts state is invalid',
      expectedError:
        "FATAL ERROR: Migration 57: Invalid AccountsController state error: internalAccounts is not an object, type: 'object'",
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: null,
              },
            },
          },
        },
      }),
      scenario: 'AccountsController internalAccounts accounts state is invalid',
      expectedError:
        "FATAL ERROR: Migration 57: Invalid AccountsController state error: internalAccounts.accounts is not an object, type: 'object'",
    },
  ];

  for (const { scenario, state, expectedError } of invalidStates) {
    it(`captures exception if ${scenario}`, () => {
      const newState = migration(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        expectedError,
      );
    });
  }

  it('does not change the selectedAccount if it is valid', () => {
    const newState = migration(oldState) as typeof oldState;

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toEqual(expectedUuid);
  });

  it('updates the selectedAccount if it is invalid', () => {
    const invalidState = merge({}, oldState, {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'invalid-uuid',
            },
          },
        },
      },
    });

    const newState = migration(invalidState) as typeof invalidState;

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toEqual(expectedUuid);
  });

  it('updates the selectedAccount if it is undefined', () => {
    const invalidState = merge({}, oldState, {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {},
          },
        },
      },
    });

    const newState = migration(invalidState) as typeof invalidState;

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toEqual(expectedUuid);
  });

  it('does not change the state if there are no accounts', () => {
    const emptyAccountsState = merge({}, oldState, {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: 'some-uuid',
            },
          },
        },
      },
    });

    const newState = migration(emptyAccountsState) as typeof emptyAccountsState;

    expect(newState).toStrictEqual(emptyAccountsState);
  });

  it('updates the selectedAccount to the first account if current selection is invalid', () => {
    const invalidSelectedState = merge({}, oldState, {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'non-existent-uuid',
            },
          },
        },
      },
    });

    const newState = migration(
      invalidSelectedState,
    ) as typeof invalidSelectedState;

    expect(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .selectedAccount,
    ).toEqual(expectedUuid);
  });

  it('does not modify the state if the selectedAccount is valid', () => {
    const validState = merge({}, oldState);
    const newState = migration(validState) as typeof validState;

    expect(newState).toStrictEqual(validState);
  });
});
