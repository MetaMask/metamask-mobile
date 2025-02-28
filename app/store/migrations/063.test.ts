import migrate from './063';
import { merge } from 'lodash';
import { captureException } from '@sentry/react-native';
import initialRootState from '../../util/test/initial-root-state';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { TransactionStatus, CHAIN_IDS } from '@metamask/transaction-controller';

const expectedState = {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            chainId: CHAIN_IDS.MAINNET,
            id: '1',
            origin: 'test.com',
            status: TransactionStatus.confirmed,
            time: 1631714312,
            txParams: {
              from: '0x1',
            },
            hash: '0x2',
            rawTx: '0x3',
          },
          {
            chainId: CHAIN_IDS.LINEA_MAINNET,
            id: '2',
            origin: 'test.com',
            status: TransactionStatus.confirmed,
            time: 1631714312,
            txParams: {
              from: '0x1',
            },
            hash: '0x3',
          },
          {
            chainId: CHAIN_IDS.MAINNET,
            id: '3',
            origin: 'test2.com',
            status: TransactionStatus.failed,
            time: 1631714313,
            txParams: {
              from: '0x6',
            },
            hash: '0x4',
            rawTx: '0x5',
          },
          {
            chainId: CHAIN_IDS.MAINNET,
            id: '4',
            origin: 'test2.com',
            status: TransactionStatus.failed,
            time: 1631714313,
            txParams: {
              from: '0x6',
            },
            hash: '0x5',
            rawTx: '0x6',
            error: {
              name: 'SmartTransactionCancelled',
              message: 'Smart transaction cancelled. Previous status: submitted',
            },
          },
          {
            chainId: CHAIN_IDS.MAINNET,
            id: '5',
            origin: 'test2.com',
            status: TransactionStatus.failed,
            time: 1631714313,
            txParams: {
              from: '0x6',
            },
            hash: '0x6',
            rawTx: '0x7',
            error: {
              name: 'SmartTransactionCancelled',
              message: 'Smart transaction cancelled. Previous status: signed',
            },
          },
          {
            chainId: CHAIN_IDS.MAINNET,
            id: '6',
            origin: 'test2.com',
            status: TransactionStatus.failed,
            time: 1631714313,
            txParams: {
              from: '0x6',
            },
            hash: '0x7',
            rawTx: '0x8',
            error: {
              name: 'SmartTransactionCancelled',
              message: 'Smart transaction cancelled. Previous status: signed',
            },
          },
        ],
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          smartTransactions: {
            [CHAIN_IDS.MAINNET]: [
              {
                txHash: '0x2',
                status: SmartTransactionStatuses.SUCCESS,
              },
              {
                txHash: '0x4',
                status: SmartTransactionStatuses.CANCELLED,
              },
              {
                txHash: '0x5',
                status: SmartTransactionStatuses.CANCELLED,
              },
              {
                txHash: '0x6',
                status: SmartTransactionStatuses.UNKNOWN,
              },
              {
                txHash: '0x7',
                status: SmartTransactionStatuses.RESOLVED,
              },
            ],
          },
        },
      },
    },
  },
};

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Migration #63', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  const invalidStates = [
    {
      state: null,
      errorMessage: "FATAL ERROR: Migration 63: Invalid state error: 'object'",
      scenario: 'state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: null,
      }),
      errorMessage:
        "FATAL ERROR: Migration 63: Invalid engine state error: 'object'",
      scenario: 'engine state is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: null,
        },
      }),
      errorMessage:
        "FATAL ERROR: Migration 63: Invalid engine backgroundState error: 'object'",
      scenario: 'backgroundState is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { TransactionController: null },
        },
      }),
      errorMessage: "Migration 63: Invalid TransactionController state: 'null'",
      scenario: 'transactionController is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: { SmartTransactionsController: null },
        },
      }),
      errorMessage:
        "Migration 63: Invalid SmartTransactionsController state: 'null'",
      scenario: 'smartTransactionsController is invalid',
    },
    {
      state: merge({}, initialRootState, {
        engine: {
          backgroundState: {
            SmartTransactionsController: {
              smartTransactionsState: { smartTransactions: null },
            },
          },
        },
      }),
      errorMessage:
        "Migration 63: Missing smart transactions property from SmartTransactionsController: 'object'",
      scenario:
        'smartTransactionsController.smartTransactionsState.smartTransactions is invalid',
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

  it('applies migration, changes transaction status to failed if a smart transaction was cancelled or unknown', () => {
    const oldState = {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [
              {
                chainId: CHAIN_IDS.MAINNET,
                id: '1',
                origin: 'test.com',
                status: TransactionStatus.confirmed,
                time: 1631714312,
                txParams: {
                  from: '0x1',
                },
                hash: '0x2',
                rawTx: '0x3',
              },
              {
                chainId: CHAIN_IDS.LINEA_MAINNET,
                id: '2',
                origin: 'test.com',
                status: TransactionStatus.confirmed,
                time: 1631714312,
                txParams: {
                  from: '0x1',
                },
                hash: '0x3',
              },
              {
                chainId: CHAIN_IDS.MAINNET,
                id: '3',
                origin: 'test2.com',
                status: TransactionStatus.failed,
                time: 1631714313,
                txParams: {
                  from: '0x6',
                },
                hash: '0x4',
                rawTx: '0x5',
              },
              {
                chainId: CHAIN_IDS.MAINNET,
                id: '4',
                origin: 'test2.com',
                status: TransactionStatus.submitted,
                time: 1631714313,
                txParams: {
                  from: '0x6',
                },
                hash: '0x5',
                rawTx: '0x6',
              },
              {
                chainId: CHAIN_IDS.MAINNET,
                id: '5',
                origin: 'test2.com',
                status: TransactionStatus.signed,
                time: 1631714313,
                txParams: {
                  from: '0x6',
                },
                hash: '0x6',
                rawTx: '0x7',
              },
              {
                chainId: CHAIN_IDS.MAINNET,
                id: '6',
                origin: 'test2.com',
                status: TransactionStatus.signed,
                time: 1631714313,
                txParams: {
                  from: '0x6',
                },
                hash: '0x7',
                rawTx: '0x8',
              },
            ],
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {
                [CHAIN_IDS.MAINNET]: [
                  {
                    txHash: '0x2',
                    status: SmartTransactionStatuses.SUCCESS,
                  },
                  {
                    txHash: '0x4',
                    status: SmartTransactionStatuses.CANCELLED,
                  },
                  {
                    txHash: '0x5',
                    status: SmartTransactionStatuses.CANCELLED,
                  },
                  {
                    txHash: '0x6',
                    status: SmartTransactionStatuses.UNKNOWN,
                  },
                  {
                    txHash: '0x7',
                    status: SmartTransactionStatuses.RESOLVED,
                  },
                ],
              },
            },
          },
        },
      },
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual(expectedState);
  });
});
