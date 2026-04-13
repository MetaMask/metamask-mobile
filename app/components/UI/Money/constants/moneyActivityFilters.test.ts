import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  getMoneyActivityDateKeyUtc,
  isMoneyActivityDeposit,
  isMoneyActivityTransaction,
  isMoneyActivityTransfer,
} from './moneyActivityFilters';

const MOCK_CHAIN: Hex = '0x1';

function tx(overrides: Partial<TransactionMeta>): TransactionMeta {
  return {
    id: 't1',
    chainId: MOCK_CHAIN,
    time: Date.UTC(2025, 3, 10, 12, 0, 0),
    ...overrides,
  } as TransactionMeta;
}

describe('moneyActivityFilters', () => {
  describe('isMoneyActivityDeposit', () => {
    it('returns true for incoming, moneyAccountDeposit, and musdConversion', () => {
      expect(
        isMoneyActivityDeposit(tx({ type: TransactionType.incoming })),
      ).toBe(true);
      expect(
        isMoneyActivityDeposit(
          tx({ type: TransactionType.moneyAccountDeposit }),
        ),
      ).toBe(true);
      expect(
        isMoneyActivityDeposit(tx({ type: TransactionType.musdConversion })),
      ).toBe(true);
    });

    it('returns false for outgoing and unrelated types', () => {
      expect(
        isMoneyActivityDeposit(
          tx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(false);
      expect(
        isMoneyActivityDeposit(tx({ type: TransactionType.simpleSend })),
      ).toBe(false);
      expect(isMoneyActivityDeposit(tx({ type: TransactionType.swap }))).toBe(
        false,
      );
    });
  });

  describe('isMoneyActivityTransfer', () => {
    it('returns true for moneyAccountWithdraw and simpleSend', () => {
      expect(
        isMoneyActivityTransfer(
          tx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(true);
      expect(
        isMoneyActivityTransfer(tx({ type: TransactionType.simpleSend })),
      ).toBe(true);
    });

    it('returns false for deposit-like types', () => {
      expect(
        isMoneyActivityTransfer(
          tx({ type: TransactionType.moneyAccountDeposit }),
        ),
      ).toBe(false);
    });
  });

  describe('isMoneyActivityTransaction', () => {
    it('returns true when either deposit or transfer predicate matches', () => {
      expect(
        isMoneyActivityTransaction(tx({ type: TransactionType.incoming })),
      ).toBe(true);
      expect(
        isMoneyActivityTransaction(
          tx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(true);
    });

    it('returns false for unclassified types such as swap', () => {
      expect(
        isMoneyActivityTransaction(tx({ type: TransactionType.swap })),
      ).toBe(false);
    });
  });

  describe('getMoneyActivityDateKeyUtc', () => {
    it('returns YYYY-MM-DD in UTC from tx.time', () => {
      expect(
        getMoneyActivityDateKeyUtc(
          tx({ time: Date.UTC(2025, 0, 5, 23, 59, 59) }),
        ),
      ).toBe('2025-01-05');
    });
  });
});
