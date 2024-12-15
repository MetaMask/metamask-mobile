import Engine from '../../core/Engine';
import { TransactionController } from '@metamask/transaction-controller';
import {
  addSwapsTransaction,
  updateSwapsTransaction,
} from './swaps-transactions';

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      update: jest.fn(),
    },
  },
}));

const TRANSACTION_ID_MOCK = 'testTransactionId';

const TRANSACTION_MOCK = {
  test: 'value',
};

describe('Swaps Transactions Utils', () => {
  let transactionControllerMock: jest.Mocked<TransactionController>;

  beforeEach(() => {
    jest.resetAllMocks();

    transactionControllerMock = Engine.context
      .TransactionController as jest.Mocked<TransactionController>;
  });

  function mockUpdate(originalState = {}) {
    const state = originalState;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (transactionControllerMock as any).update.mockImplementationOnce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (callback: any) => callback(state),
    );

    return state;
  }

  describe('addSwapsTransaction', () => {
    it('adds data to TransactionController state', () => {
      const state = mockUpdate();

      addSwapsTransaction(TRANSACTION_ID_MOCK, TRANSACTION_MOCK);

      expect(state).toStrictEqual({
        swapsTransactions: {
          [TRANSACTION_ID_MOCK]: TRANSACTION_MOCK,
        },
      });
    });

    it('handles missing swaps transaction data', () => {
      const state = mockUpdate(undefined);

      addSwapsTransaction(TRANSACTION_ID_MOCK, TRANSACTION_MOCK);

      expect(state).toStrictEqual({
        swapsTransactions: {
          [TRANSACTION_ID_MOCK]: TRANSACTION_MOCK,
        },
      });
    });
  });

  describe('updateSwapsTransaction', () => {
    it('updates data in TransactionController state', () => {
      const state = mockUpdate({
        swapsTransactions: {
          [TRANSACTION_ID_MOCK]: TRANSACTION_MOCK,
        },
      });

      updateSwapsTransaction(TRANSACTION_ID_MOCK, (transaction) => {
        transaction.test2 = 'updatedValue';
      });

      expect(state).toStrictEqual({
        swapsTransactions: {
          [TRANSACTION_ID_MOCK]: {
            ...TRANSACTION_MOCK,
            test2: 'updatedValue',
          },
        },
      });
    });

    it('throws if no existing data found', () => {
      mockUpdate({
        swapsTransactions: {
          invalidId: TRANSACTION_MOCK,
        },
      });

      expect(() =>
        updateSwapsTransaction(TRANSACTION_ID_MOCK, (transaction) => {
          transaction.test2 = 'updatedValue';
        }),
      ).toThrow('Swaps transaction not found - testTransactionId');
    });
  });
});
