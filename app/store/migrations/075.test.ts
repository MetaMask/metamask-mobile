import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
import migrate from './075';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createTestState = () => ({
  engine: {
    backgroundState: {
      TokenBalancesController: {
        contractBalances: { '0x123': '100' },
      },
      TransactionController: {
        internalTransactions: ['tx1', 'tx2'],
      },
      NetworkController: {
        isCustomNetwork: true,
      },
      KeyringController: {
        encryptionKey: 'some-key',
      },
    },
  },
});

describe('Migration 75: Remove specific properties from controllers', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns state unchanged if ensureValidState fails', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const migratedState = migrate(state);

    expect(migratedState).toStrictEqual(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes specified properties from controllers', () => {
    const oldState = createTestState();
    mockedEnsureValidState.mockReturnValue(true);

    const expectedData = {
      engine: {
        backgroundState: {
          TokenBalancesController: {},
          TransactionController: {},
          NetworkController: {},
          KeyringController: {},
        },
      },
    };

    const migratedState = migrate(oldState);

    expect(migratedState).toStrictEqual(expectedData);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: 'invalid',
          },
        },
      },
      test: 'invalid TokenBalancesController state',
      expectedError:
        "FATAL ERROR: Migration 75: Invalid TokenBalancesController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TransactionController: 'invalid',
          },
        },
      },
      test: 'invalid TokenBalancesController state',
      expectedError:
        "FATAL ERROR: Migration 75: Invalid TokenBalancesController state error: 'undefined'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {},
            TransactionController: 'invalid',
          },
        },
      },
      test: 'invalid TransactionController state',
      expectedError:
        "FATAL ERROR: Migration 75: Invalid TransactionController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {},
            TransactionController: {},
            NetworkController: 'invalid',
          },
        },
      },
      test: 'invalid NetworkController state',
      expectedError:
        "FATAL ERROR: Migration 75: Invalid NetworkController state error: 'string'",
    },
    {
      state: {
        engine: {
          backgroundState: {
            TokenBalancesController: {},
            TransactionController: {},
            NetworkController: {},
            KeyringController: 'invalid',
          },
        },
      },
      test: 'invalid KeyringController state',
      expectedError:
        "FATAL ERROR: Migration 75: Invalid KeyringController state error: 'string'",
    },
  ])(
    'captures exception and returns state unchanged for invalid state - $test',
    ({ state, expectedError }) => {
      const orgState = cloneDeep(state);
      mockedEnsureValidState.mockReturnValue(true);

      const migratedState = migrate(state);

      // State should be unchanged
      expect(migratedState).toStrictEqual(orgState);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expectedError,
        }),
      );
    },
  );
});
