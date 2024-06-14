import migration from './044';
import { merge } from 'lodash';
import initialRootState from '../../util/test/initial-root-state';
import { captureException } from '@sentry/react-native';
import {
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  internalAccount2,
} from '../../util/test/accountsControllerTestUtils';
import { RootState } from '../../reducers';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { Identity } from './036';

const mockChecksummedInternalAcc1 = toChecksumHexAddress(
  internalAccount1.address,
);
const mockChecksummedInternalAcc2 = toChecksumHexAddress(
  internalAccount2.address,
);

const oldState = {
  engine: {
    backgroundState: {
      PreferencesController: {
        identities: {
          [mockChecksummedInternalAcc1]: {
            address: mockChecksummedInternalAcc1,
            name: 'First',
          },
          [mockChecksummedInternalAcc2]: {
            address: mockChecksummedInternalAcc2,
            name: 'Second',
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            [expectedUuid]: {
              ...internalAccount1,
              metadata: { ...internalAccount1.metadata, name: 'Account 1' },
            },
            [expectedUuid2]: {
              ...internalAccount2,
              metadata: { ...internalAccount2.metadata, name: undefined },
            },
          },
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

describe('Migration #44', () => {
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
        "FATAL ERROR: Migration 44: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid engine backgroundState error: 'object'",
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
        "FATAL ERROR: Migration 44: Invalid AccountsController state error: 'object'",
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
        "FATAL ERROR: Migration 44: Invalid AccountsController internalAccounts state error: 'object'",
      scenario: 'AccountsController internalAccounts state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PreferencesController: null,
            AccountsController: { internalAccounts: { accounts: {} } },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid PreferencesController state error: 'object'",
      scenario: 'PreferencesController state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PreferencesController: { identities: null },
            AccountsController: { internalAccounts: { accounts: {} } },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid PreferencesController identities state error: 'object'",
      scenario: 'PreferencesController identities state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PreferencesController: { identities: null },
            AccountsController: {
              internalAccounts: {
                accounts: { '92c0e479-6133-4a18-b1bf-fa38f654e293': null },
              },
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid AccountsController account entry with id: '92c0e479-6133-4a18-b1bf-fa38f654e293', type: 'object'",
      scenario: 'AccountsController accounts account state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PreferencesController: { identities: null },
            AccountsController: {
              internalAccounts: {
                accounts: {
                  '92c0e479-6133-4a18-b1bf-fa38f654e293': { metadata: null },
                },
              },
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid AccountsController account metadata entry with id: '92c0e479-6133-4a18-b1bf-fa38f654e293', type: 'object'",
      scenario: 'AccountsController accounts account state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PreferencesController: { identities: null },
            AccountsController: {
              internalAccounts: {
                accounts: { '92c0e479-6133-4a18-b1bf-fa38f654e293': null },
              },
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid AccountsController account entry with id: '92c0e479-6133-4a18-b1bf-fa38f654e293', type: 'object'",
      scenario: 'AccountsController accounts account state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            PreferencesController: {
              identities: { [mockChecksummedInternalAcc1]: null },
            },
          },
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 44: Invalid PreferencesController identity entry with type: 'object'",
      scenario: 'PreferencesController identities identity state is invalid',
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

  it('should set name property of accounts of accounts controller to name property of identities of Preferences Controller', () => {
    const newState: Pick<RootState, 'engine'> = migration(oldState) as Pick<
      RootState,
      'engine'
    >;

    Object.keys(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .accounts,
    ).forEach((accountId) => {
      Object.values(
        newState.engine.backgroundState.PreferencesController.identities,
      ).forEach((identity) => {
        if (
          toChecksumHexAddress(
            newState.engine.backgroundState.AccountsController.internalAccounts
              .accounts[accountId].address,
          ) === (identity as Identity).address
        ) {
          expect(
            newState.engine.backgroundState.AccountsController.internalAccounts
              .accounts[accountId].metadata.name,
          ).toStrictEqual((identity as Identity).name);
        }
      });
    });
  });

  it('should let the name properties be the same if they are synchronized', () => {
    const oldState2 = {
      engine: {
        backgroundState: {
          PreferencesController: {
            identities: {
              [mockChecksummedInternalAcc1]: {
                address: mockChecksummedInternalAcc1,
                name: 'Name1',
              },
              [mockChecksummedInternalAcc2]: {
                address: mockChecksummedInternalAcc2,
                name: 'Name2',
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                [expectedUuid]: {
                  ...internalAccount1,
                  metadata: { ...internalAccount1.metadata, name: 'Name1' },
                },
                [expectedUuid2]: {
                  ...internalAccount2,
                  metadata: { ...internalAccount2.metadata, name: 'Name2 ' },
                },
              },
              selectedAccount: {},
            },
          },
        },
      },
    };
    const newState: Pick<RootState, 'engine'> = migration(oldState2) as Pick<
      RootState,
      'engine'
    >;
    Object.keys(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .accounts,
    ).forEach((accountId) => {
      Object.values(
        newState.engine.backgroundState.PreferencesController.identities,
      ).forEach((identity) => {
        if (
          toChecksumHexAddress(
            newState.engine.backgroundState.AccountsController.internalAccounts
              .accounts[accountId].address,
          ) === (identity as Identity).address
        ) {
          expect(
            newState.engine.backgroundState.AccountsController.internalAccounts
              .accounts[accountId].metadata.name,
          ).toStrictEqual((identity as Identity).name);
        }
      });
    });
  });
});
