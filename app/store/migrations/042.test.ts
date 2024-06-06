import migration from './042';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  internalAccount2,
} from '../../util/test/accountsControllerTestUtils';
import { RootState } from '../../reducers';

const oldState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            //importTime variable didn't exist on the old state
            [expectedUuid]: {
              ...internalAccount1,
              metadata: { ...internalAccount1.metadata, importTime: undefined },
            },
            [expectedUuid2]: {
              ...internalAccount2,
              metadata: { ...internalAccount2.metadata, importTime: undefined },
            },
          },
          selectedAccount: {},
        },
      },
    },
  },
};

const expectedNewState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
          selectedAccount: {},
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #42', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 42: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 42: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: null,
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 42: Invalid AccountsController state error: 'null'",
      scenario: 'AccountsController state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: { internalAccounts: null },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 42: Invalid AccountsController internalAccounts state error: 'null'",
      scenario: 'AccountsController internalAccounts state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            AccountsController: { internalAccounts: { accounts: null } },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 42: Invalid AccountsController internalAccounts accounts state error: 'null'",
      scenario: 'AccountsController internalAccounts accounts state is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, () => {
      const newState = migration(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should add importTime variable if it is not already defined', () => {
    // Mocked Date.now since jest is not aware of date.
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01').getTime());
    const newState: Partial<RootState> = migration(
      oldState,
    ) as Partial<RootState>;

    Object.keys(
      newState.engine!.backgroundState.AccountsController.internalAccounts
        .accounts,
    ).map((accountId) =>
      expect(
        newState.engine!.backgroundState.AccountsController.internalAccounts
          .accounts[accountId].metadata.importTime,
      ).toBeDefined(),
    );
  });
});
