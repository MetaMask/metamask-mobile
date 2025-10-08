import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getRequiredBalance } from './transaction-pay';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';

describe('Transaction Pay Utils', () => {
  describe('getRequiredBalance', () => {
    it('returns value if transaction type is perps deposit', () => {
      const transactionMeta = {
        type: TransactionType.perpsDeposit,
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBe(PERPS_MINIMUM_DEPOSIT);
    });

    it('returns value if transaction type is predict deposit', () => {
      const transactionMeta = {
        nestedTransactions: [
          { type: TransactionType.predictDeposit },
        ],
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBe(PREDICT_MINIMUM_DEPOSIT);
    });

    it('returns undefined if unsupported transaction type', () => {
      const transactionMeta = {
        type: TransactionType.simpleSend,
      } as TransactionMeta;

      expect(getRequiredBalance(transactionMeta)).toBeUndefined();
    });
  });
});
