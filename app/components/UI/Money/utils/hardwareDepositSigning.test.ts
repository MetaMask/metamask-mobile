import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import { isHardwareAccount } from '../../../../util/address';
import {
  findDepositsAwaitingSignature,
  isHardwareDepositSigningComplete,
  isHardwareFundedDeposit,
} from './hardwareDepositSigning';

const mockTransactions: TransactionMeta[] = [];
const mockBatchTransactionCounts: Record<string, number> = {};
const mockTransactionPayData: Record<
  string,
  {
    accountOverride?: string;
    quotes?: unknown[];
    fiatPayment?: { selectedPaymentMethodId?: string };
  }
> = {};

jest.mock('../../../../selectors/transactionController', () => ({
  selectTransactions: () => mockTransactions,
  selectBatchTransactionCounts: () => mockBatchTransactionCounts,
}));

jest.mock('../../../../selectors/transactionPayController', () => ({
  selectAccountOverrideByTransactionId: (_state: unknown, id: string) =>
    mockTransactionPayData[id]?.accountOverride,
  selectTransactionPayFiatPaymentByTransactionId: (
    _state: unknown,
    id: string,
  ) => mockTransactionPayData[id]?.fiatPayment,
  selectTransactionPayRawQuotesByTransactionId: (_state: unknown, id: string) =>
    mockTransactionPayData[id]?.quotes,
}));

jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

const state = {} as RootState;
const LEDGER = '0xLedger';
const SOFTWARE = '0xSoftware';
const MONEY_ACCOUNT = '0xMoneyAccount';

const buildTx = (overrides: Partial<TransactionMeta>): TransactionMeta =>
  ({
    id: 'deposit-1',
    chainId: '0x1',
    status: TransactionStatus.approved,
    type: TransactionType.moneyAccountDeposit,
    txParams: { from: MONEY_ACCOUNT },
    ...overrides,
  }) as unknown as TransactionMeta;

const buildLeg = (id: string, status: TransactionStatus) =>
  buildTx({ id, type: TransactionType.simpleSend, status });

describe('hardwareDepositSigning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactions.splice(0);
    Object.keys(mockBatchTransactionCounts).forEach((key) => {
      delete mockBatchTransactionCounts[key];
    });
    Object.keys(mockTransactionPayData).forEach((key) => {
      delete mockTransactionPayData[key];
    });
    (isHardwareAccount as jest.Mock).mockImplementation(
      (address: string) => address === LEDGER,
    );
  });

  describe('isHardwareFundedDeposit', () => {
    it('follows the accountOverride keyring type', () => {
      mockTransactionPayData['deposit-1'] = { accountOverride: LEDGER };
      expect(isHardwareFundedDeposit(state, buildTx({}))).toBe(true);

      mockTransactionPayData['deposit-1'] = { accountOverride: SOFTWARE };
      expect(isHardwareFundedDeposit(state, buildTx({}))).toBe(false);
    });

    it('falls back to txParams.from when there is no accountOverride', () => {
      expect(
        isHardwareFundedDeposit(state, buildTx({ txParams: { from: LEDGER } })),
      ).toBe(true);
      expect(isHardwareFundedDeposit(state, buildTx({}))).toBe(false);
    });

    it('returns false for non-deposit transactions', () => {
      mockTransactionPayData['deposit-1'] = { accountOverride: LEDGER };

      expect(
        isHardwareFundedDeposit(
          state,
          buildTx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(false);
    });

    it('returns false for fiat deposits even with a hardware accountOverride', () => {
      mockTransactionPayData['deposit-1'] = { accountOverride: LEDGER };

      expect(
        isHardwareFundedDeposit(
          state,
          buildTx({
            metamaskPay: { fiat: { provider: 'apple-pay' } },
          } as unknown as Partial<TransactionMeta>),
        ),
      ).toBe(false);
    });

    it('returns false when a fiat payment method is selected', () => {
      mockTransactionPayData['deposit-1'] = {
        accountOverride: LEDGER,
        fiatPayment: { selectedPaymentMethodId: 'debit' },
      };

      expect(isHardwareFundedDeposit(state, buildTx({}))).toBe(false);
    });
  });

  describe('isHardwareDepositSigningComplete', () => {
    const seed = (legs: TransactionMeta[]) => {
      const parent = buildTx({
        requiredTransactionIds: legs.map((leg) => leg.id),
      });
      mockTransactions.push(parent, ...legs);
      return parent;
    };

    it.each([
      TransactionStatus.signed,
      TransactionStatus.submitted,
      TransactionStatus.confirmed,
    ])('returns true once the parent itself is %s', (status) => {
      expect(isHardwareDepositSigningComplete(state, buildTx({ status }))).toBe(
        true,
      );
    });

    it('returns false while an approved parent has an unsigned leg', () => {
      const parent = seed([buildLeg('leg-1', TransactionStatus.approved)]);

      expect(isHardwareDepositSigningComplete(state, parent)).toBe(false);
    });

    it('returns true once every leg is signed', () => {
      const parent = seed([buildLeg('leg-1', TransactionStatus.signed)]);

      expect(isHardwareDepositSigningComplete(state, parent)).toBe(true);
    });

    it('waits for every leg of a batch', () => {
      mockBatchTransactionCounts['0xbatch'] = 2;
      const parent = seed([
        { ...buildLeg('leg-1', TransactionStatus.signed), batchId: '0xbatch' },
      ]);

      expect(isHardwareDepositSigningComplete(state, parent)).toBe(false);
    });

    it('treats an empty quotes array with no legs as not signed', () => {
      mockTransactionPayData['deposit-1'] = { quotes: [] };
      const parent = seed([]);

      expect(isHardwareDepositSigningComplete(state, parent)).toBe(false);
    });

    it('waits for every quote when Pay has several', () => {
      mockTransactionPayData['deposit-1'] = { quotes: [{}, {}] };
      const parent = seed([buildLeg('leg-1', TransactionStatus.signed)]);

      expect(isHardwareDepositSigningComplete(state, parent)).toBe(false);
    });
  });

  describe('findDepositsAwaitingSignature', () => {
    const parent = buildTx({ requiredTransactionIds: ['leg-1'] });
    const leg = buildLeg('leg-1', TransactionStatus.signed);

    it('returns the deposit funded by the given leg', () => {
      mockTransactions.push(parent, leg);

      expect(findDepositsAwaitingSignature(state, leg)).toEqual([parent]);
    });

    it('returns the deposit itself when it is the updated transaction', () => {
      mockTransactions.push(parent, leg);

      expect(findDepositsAwaitingSignature(state, parent)).toEqual([parent]);
    });

    it('ignores deposits that already reached a terminal status', () => {
      mockTransactions.push(
        buildTx({
          requiredTransactionIds: ['leg-1'],
          status: TransactionStatus.confirmed,
        }),
        buildTx({
          requiredTransactionIds: ['leg-1'],
          status: TransactionStatus.rejected,
        }),
        leg,
      );

      expect(findDepositsAwaitingSignature(state, leg)).toEqual([]);
    });

    it('ignores unrelated transactions', () => {
      mockTransactions.push(parent, leg);

      expect(
        findDepositsAwaitingSignature(
          state,
          buildLeg('other', TransactionStatus.signed),
        ),
      ).toEqual([]);
    });
  });
});
