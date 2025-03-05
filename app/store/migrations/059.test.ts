import migrate from './059';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import mockedEngine from '../../core/__mocks__/MockedEngine';
import {
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  internalAccount2,
} from '../../util/test/accountsControllerTestUtils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('Migration #59 - Fix crasher related to undefined selectedAccount on AccountsController', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 59: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 59: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 59: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
  ];

  for (const { errorMessage, scenario, state } of invalidStates) {
    it(`should capture exception if ${scenario}`, async () => {
      const newState = await migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  }

  it('should set selectedAccount to empty string if it is undefined', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: undefined,
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '',
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should set selectedAccount to the id of the first account if accounts exist', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                [expectedUuid]: internalAccount1,
                [expectedUuid2]: internalAccount2,
              },
              selectedAccount: undefined,
            },
          },
        },
      },
    };

    const expectedState = {
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

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });

  it('should leave selectedAccount alone if it is not undefined', async () => {
    const oldState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '0x1',
            },
          },
        },
      },
    };

    const expectedState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {},
              selectedAccount: '0x1',
            },
          },
        },
      },
    };

    const migratedState = await migrate(oldState);
    expect(migratedState).toStrictEqual(expectedState);
  });
});
