import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionFiatPayment,
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { merge } from 'lodash';
import { Json } from '@metamask/utils';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsPaidByMetaMask } from './useIsPaidByMetaMask';
import {
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
} from './useTransactionPayData';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';

jest.mock('./useTransactionPayData');

const zeroFeesTotals = {
  fees: {
    provider: { usd: '0' },
    sourceNetwork: { estimate: { usd: '0' } },
    targetNetwork: { usd: '0' },
    metaMask: { usd: '0', fiat: '0' },
  },
} as TransactionPayTotals;

const nonZeroFeesTotals = {
  fees: {
    provider: { usd: '1.00' },
    sourceNetwork: { estimate: { usd: '0.20' } },
    targetNetwork: { usd: '0.03' },
    metaMask: { usd: '0', fiat: '0' },
  },
} as TransactionPayTotals;

function runHook({
  type,
  isGasFeeSponsored,
}: { type?: TransactionType; isGasFeeSponsored?: boolean } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
  );

  const tx = (
    state.engine.backgroundState
      .TransactionController as TransactionControllerState
  ).transactions[0];
  tx.type = type ?? TransactionType.musdConversion;

  if (isGasFeeSponsored !== undefined) {
    (tx as { isGasFeeSponsored?: boolean }).isGasFeeSponsored =
      isGasFeeSponsored;
  }

  return renderHookWithProvider(useIsPaidByMetaMask, { state });
}

describe('useIsPaidByMetaMask', () => {
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);
  const useTransactionPaySourceAmountsMock = jest.mocked(
    useTransactionPaySourceAmounts,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);
    useTransactionPayTotalsMock.mockReturnValue(zeroFeesTotals);
    useTransactionPaySourceAmountsMock.mockReturnValue([]);
  });

  it('returns false when there are no quotes', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);

    const { result } = runHook();

    expect(result.current).toBe(false);
  });

  it('returns false when there are no fees totals', () => {
    useTransactionPayTotalsMock.mockReturnValue({} as TransactionPayTotals);

    const { result } = runHook();

    expect(result.current).toBe(false);
  });

  it('returns true for any transaction type when all fees are zero (type-agnostic)', () => {
    const { result } = runHook({ type: TransactionType.perpsDeposit });

    expect(result.current).toBe(true);
  });

  it('returns true when all fees are zero and the type is moneyAccountWithdraw', () => {
    const { result } = runHook({ type: TransactionType.moneyAccountWithdraw });

    expect(result.current).toBe(true);
  });

  it('returns false when a fiat payment method is selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'apple-pay',
    } as TransactionFiatPayment);

    const { result } = runHook({ type: TransactionType.moneyAccountDeposit });

    expect(result.current).toBe(false);
  });

  it('returns true when all four fee components are zero and the type is musdConversion', () => {
    const { result } = runHook({ type: TransactionType.musdConversion });

    expect(result.current).toBe(true);
  });

  it('returns true when metaMask.usd is undefined and other fees are zero', () => {
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        provider: { usd: '0' },
        sourceNetwork: { estimate: { usd: '0' } },
        targetNetwork: { usd: '0' },
        metaMask: { fiat: '0' },
      },
    } as TransactionPayTotals);

    const { result } = runHook({ type: TransactionType.musdConversion });

    expect(result.current).toBe(true);
  });

  it('returns false when at least one fee component is non-zero', () => {
    useTransactionPayTotalsMock.mockReturnValue(nonZeroFeesTotals);

    const { result } = runHook({ type: TransactionType.musdConversion });

    expect(result.current).toBe(false);
  });

  describe('gas-fee-sponsored short-circuit (mirrors fee row $0 display)', () => {
    it('returns true when sponsored and there are no source amounts, even without quotes or totals', () => {
      useTransactionPayQuotesMock.mockReturnValue([]);
      useTransactionPayTotalsMock.mockReturnValue({} as TransactionPayTotals);
      useTransactionPaySourceAmountsMock.mockReturnValue([]);

      const { result } = runHook({
        type: TransactionType.moneyAccountWithdraw,
        isGasFeeSponsored: true,
      });

      expect(result.current).toBe(true);
    });

    it('does not short-circuit when sponsored but source amounts exist (falls back to fee check)', () => {
      useTransactionPayQuotesMock.mockReturnValue([]);
      useTransactionPaySourceAmountsMock.mockReturnValue([
        {},
      ] as unknown as ReturnType<typeof useTransactionPaySourceAmounts>);

      const { result } = runHook({
        type: TransactionType.moneyAccountWithdraw,
        isGasFeeSponsored: true,
      });

      expect(result.current).toBe(false);
    });

    it('returns false when sponsored with no source amounts but a fiat payment method is selected', () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'apple-pay',
      } as TransactionFiatPayment);
      useTransactionPaySourceAmountsMock.mockReturnValue([]);

      const { result } = runHook({
        type: TransactionType.moneyAccountWithdraw,
        isGasFeeSponsored: true,
      });

      expect(result.current).toBe(false);
    });
  });
});
