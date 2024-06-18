import migration from './047';
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
            name: 'Internal Account 1',
            //Fake time for testing
            importTime: 123,
          },
          [mockChecksummedInternalAcc2]: {
            address: mockChecksummedInternalAcc2,
            name: 'Internal Account 2',
            //No importTime set for the test the default Date.now
          },
        },
      },
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

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #47', () => {
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
        "FATAL ERROR: Migration 47: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 47: Invalid engine backgroundState error: 'object'",
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
        "FATAL ERROR: Migration 47: Invalid AccountsController state error: 'object'",
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
        "FATAL ERROR: Migration 47: Invalid AccountsController internalAccounts state error: 'object'",
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
        "FATAL ERROR: Migration 47: Invalid PreferencesController state error: 'null'",
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
        "FATAL ERROR: Migration 47: Invalid PreferencesController identities state error: 'null'",
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
        "FATAL ERROR: Migration 47: Invalid AccountsController entry with id: '92c0e479-6133-4a18-b1bf-fa38f654e293', type: 'object'",
      scenario: 'AccountsController accounts account state is invalid',
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

  it('should add importTime from identities or default to the current date', () => {
    // Mocked Date.now since jest is not aware of date.
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01').getTime());
    const newState: Pick<RootState, 'engine'> = migration(oldState) as Pick<
      RootState,
      'engine'
    >;

    Object.keys(
      newState.engine.backgroundState.AccountsController.internalAccounts
        .accounts,
    ).forEach((accountId) => {
      expect(
        newState.engine.backgroundState.AccountsController.internalAccounts
          .accounts[accountId].metadata.importTime,
      ).toEqual(expect.any(Number));

      Object.values(
        newState.engine.backgroundState.PreferencesController.identities,
      ).forEach((identity) => {
        if (
          (identity as Identity).importTime &&
          toChecksumHexAddress(
            newState.engine.backgroundState.AccountsController.internalAccounts
              .accounts[accountId].address,
          ) === (identity as Identity).address
        ) {
          expect(
            newState.engine.backgroundState.AccountsController.internalAccounts
              .accounts[accountId].metadata.importTime,
          ).toStrictEqual((identity as Identity).importTime);
        }
      });
    });
  });
  it('should default importTime to the current date if identities is not populated and import time is undefined', () => {
    // Mocked Date.now since jest is not aware of date.
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01').getTime());

    const oldState2 = {
      engine: {
        backgroundState: {
          PreferencesController: { identities: {} },
          AccountsController: {
            internalAccounts: {
              accounts: {
                //importTime variable didn't exist on the old state
                [expectedUuid]: {
                  ...internalAccount1,
                  metadata: {
                    ...internalAccount1.metadata,
                    importTime: undefined,
                  },
                },
                [expectedUuid2]: {
                  ...internalAccount2,
                  metadata: {
                    ...internalAccount2.metadata,
                    importTime: undefined,
                  },
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
      expect(
        newState.engine.backgroundState.AccountsController.internalAccounts
          .accounts[accountId].metadata.importTime,
      ).toEqual(expect.any(Number));
    });
  });
});
