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

const mockTransactionPayData: Record<
  string,
  {
    accountOverride?: string;
    quotes?: unknown[];
    fiatPayment?: { selectedPaymentMethodId?: string };
  }
> = {};

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

describe('hardwareDepositSigning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockTransactionPayData).forEach((key) => {
      delete mockTransactionPayData[key];
    });
    (isHardwareAccount as jest.Mock).mockImplementation(
      (address: string) => address === LEDGER,
    );
  });

  describe('isHardwareFundedDeposit', () => {
    it('returns true when accountOverride is a hardware account', () => {
      mockTransactionPayData['deposit-1'] = { accountOverride: LEDGER };

      expect(isHardwareFundedDeposit(state, buildTx({}))).toBe(true);
    });

    it('returns false when accountOverride is a software account', () => {
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
    const controllerState = (
      legs: TransactionMeta[],
      batchTransactionCounts: Record<string, number> = {},
    ) => ({
      batchTransactionCounts,
      transactions: [
        buildTx({ requiredTransactionIds: legs.map((leg) => leg.id) }),
        ...legs,
      ],
    });

    it.each([
      TransactionStatus.signed,
      TransactionStatus.submitted,
      TransactionStatus.confirmed,
    ])('returns true once the parent itself is %s', (status) => {
      expect(
        isHardwareDepositSigningComplete(
          state,
          buildTx({ status }),
          controllerState([]),
        ),
      ).toBe(true);
    });

    it('returns false while an approved parent has an unsigned leg', () => {
      const leg = buildTx({
        id: 'leg-1',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
      });

      expect(
        isHardwareDepositSigningComplete(
          state,
          buildTx({}),
          controllerState([leg]),
        ),
      ).toBe(false);
    });

    it('returns true once every leg is signed', () => {
      const leg = buildTx({
        id: 'leg-1',
        type: TransactionType.simpleSend,
        status: TransactionStatus.signed,
      });

      expect(
        isHardwareDepositSigningComplete(
          state,
          buildTx({}),
          controllerState([leg]),
        ),
      ).toBe(true);
    });

    it('waits for every quote when Pay has several', () => {
      mockTransactionPayData['deposit-1'] = { quotes: [{}, {}] };
      const leg = buildTx({
        id: 'leg-1',
        type: TransactionType.simpleSend,
        status: TransactionStatus.signed,
      });

      expect(
        isHardwareDepositSigningComplete(
          state,
          buildTx({}),
          controllerState([leg]),
        ),
      ).toBe(false);
    });
  });

  describe('findDepositsAwaitingSignature', () => {
    const parent = buildTx({ requiredTransactionIds: ['leg-1'] });
    const leg = buildTx({ id: 'leg-1', type: TransactionType.simpleSend });

    it('returns the deposit funded by the given leg', () => {
      expect(findDepositsAwaitingSignature(leg, [parent, leg])).toEqual([
        parent,
      ]);
    });

    it('returns the deposit itself when it is the updated transaction', () => {
      expect(findDepositsAwaitingSignature(parent, [parent, leg])).toEqual([
        parent,
      ]);
    });

    it('ignores deposits that already reached a terminal status', () => {
      const confirmed = buildTx({
        requiredTransactionIds: ['leg-1'],
        status: TransactionStatus.confirmed,
      });
      const rejected = buildTx({
        requiredTransactionIds: ['leg-1'],
        status: TransactionStatus.rejected,
      });

      expect(
        findDepositsAwaitingSignature(leg, [confirmed, rejected, leg]),
      ).toEqual([]);
    });

    it('ignores unrelated transactions', () => {
      const other = buildTx({
        id: 'other',
        type: TransactionType.simpleSend,
        status: TransactionStatus.signed,
      });

      expect(findDepositsAwaitingSignature(other, [parent, leg])).toEqual([]);
    });
  });
});
