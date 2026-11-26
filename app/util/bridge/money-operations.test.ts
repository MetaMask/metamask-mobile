import { MoneyAccountAction } from '@metamask/bridge-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../core/Engine';
import {
  isBridgeDepositTx,
  isBridgeWithdrawTx,
  resolveMoneyAccountOperation,
} from './money-operations';
import type { BridgeToken } from '../../components/UI/Bridge/types';

jest.mock('../../core/Engine', () => ({
  context: {
    BridgeStatusController: {
      state: {
        txHistory: {},
        quoteUpdateStatusStore: {},
      },
    },
  },
}));

const BATCH_ID = '0xbatch';

const buildTransaction = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: 'tx-1',
    batchId: BATCH_ID,
    ...overrides,
  }) as TransactionMeta;

const setTxHistory = (txHistory: Record<string, unknown>) => {
  Engine.context.BridgeStatusController.state = { txHistory } as never;
};

describe('money-operations', () => {
  beforeEach(() => {
    setTxHistory({});
  });

  describe('isBridgeDepositTx', () => {
    it('returns true when a history item deposit shares the transaction batch id', () => {
      setTxHistory({
        'bridge-1': { depositTxMeta: { batchId: BATCH_ID } },
      });

      expect(isBridgeDepositTx(buildTransaction())).toBe(true);
    });

    it('returns false when no history item deposit matches the batch id', () => {
      setTxHistory({
        'bridge-1': { depositTxMeta: { batchId: '0xother' } },
      });

      expect(isBridgeDepositTx(buildTransaction())).toBe(false);
    });
  });

  describe('isBridgeWithdrawTx', () => {
    it('returns true when a history item withdraw shares the transaction batch id', () => {
      setTxHistory({
        'bridge-1': { withdrawTxMeta: { batchId: BATCH_ID } },
      });

      expect(isBridgeWithdrawTx(buildTransaction())).toBe(true);
    });

    it('returns false when no history item withdraw matches the batch id', () => {
      setTxHistory({
        'bridge-1': { withdrawTxMeta: { batchId: '0xother' } },
      });

      expect(isBridgeWithdrawTx(buildTransaction())).toBe(false);
    });
  });

  describe('resolveMoneyAccountOperation', () => {
    const token = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1',
      ...overrides,
    });

    it('returns withdraw when the source token is a money token', () => {
      const operation = resolveMoneyAccountOperation(
        token({ isMoneyToken: true }),
        token(),
      );

      expect(operation).toBe(MoneyAccountAction.Withdraw);
    });

    it('returns deposit when only the dest token is a money token', () => {
      const operation = resolveMoneyAccountOperation(
        token(),
        token({ isMoneyToken: true }),
      );

      expect(operation).toBe(MoneyAccountAction.Deposit);
    });

    it('returns undefined when neither token is a money token', () => {
      const operation = resolveMoneyAccountOperation(token(), token());

      expect(operation).toBeUndefined();
    });
  });
});
