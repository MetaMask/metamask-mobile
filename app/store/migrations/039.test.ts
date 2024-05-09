import migrate from './039';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';

const expectedState = {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            chainId: '0x5',
            id: '1',
            origin: 'test.com',
            status: 'confirmed',
            time: 1631714312,
            txParams: {
              from: '0x1',
            },
            hash: '0x2',
            rawTx: '0x3',
          },
          {
            chainId: '0x5',
            id: '2',
            origin: 'test.com',
            status: 'confirmed',
            time: 1631714312,
            txParams: {
              from: '0x1',
            },
            hash: '0x2',
          },
          {
            chainId: '0x1',
            id: '3',
            origin: 'test2.com',
            status: 'submitted',
            time: 1631714313,
            txParams: {
              from: '0x6',
            },
            hash: '0x4',
            rawTx: '0x5',
          },
        ],
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #39', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 39: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 39: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 39: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { TransactionController: null },
        },
      }),
      errorMessage: "Migration 39: Invalid TransactionController state: 'null'",
      scenario: 'transactionController is invalid',
    },
  ];
  it.each(invalidStates)(
    'should capture exception if $scenario',
    ({ errorMessage, state }) => {
      const newState = migrate(state);

      expect(newState).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    },
  );

  it('apply migration, change property transaction, transactionHash and rawTransaction', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                chainId: '0x5',
                id: '1',
                origin: 'test.com',
                status: 'confirmed',
                time: 1631714312,
                transaction: {
                  from: '0x1',
                },
                transactionHash: '0x2',
                rawTransaction: '0x3',
              },
              {
                chainId: '0x5',
                id: '2',
                origin: 'test.com',
                status: 'confirmed',
                time: 1631714312,
                transaction: {
                  from: '0x1',
                },
                transactionHash: '0x2',
              },
              {
                chainId: '0x1',
                id: '3',
                origin: 'test2.com',
                status: 'submitted',
                time: 1631714313,
                transaction: {
                  from: '0x6',
                },
                transactionHash: '0x4',
                rawTransaction: '0x5',
              },
            ],
          },
        },
      },
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(expectedState);
  });
});
