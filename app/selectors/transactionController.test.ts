import { RootState } from '../reducers';
import { selectTransactions } from './transactionController';

describe('TransactionController Selectors', () => {
  describe('selectTransactions', () => {
    it('returns transactions from TransactionController state', () => {
      const transactions = [{ id: 1 }, { id: 2 }];

      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
      };

      expect(selectTransactions(state as unknown as RootState)).toStrictEqual(
        transactions,
      );
    });
  });
});
