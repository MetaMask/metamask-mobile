import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  TransactionPayQuote,
  TransactionPayTotals,
} from '@metamask/transaction-pay-controller';
import { merge } from 'lodash';
import { Json } from '@metamask/utils';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useIsPaidByMetaMask } from './useIsPaidByMetaMask';
import {
  useTransactionPayQuotes,
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

function runHook({ type }: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
  );

  (
    state.engine.backgroundState
      .TransactionController as TransactionControllerState
  ).transactions[0].type = type ?? TransactionType.musdConversion;

  return renderHookWithProvider(useIsPaidByMetaMask, { state });
}

describe('useIsPaidByMetaMask', () => {
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayQuotesMock.mockReturnValue([
      {} as TransactionPayQuote<Json>,
    ]);
    useTransactionPayTotalsMock.mockReturnValue(zeroFeesTotals);
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

  it('returns false when the transaction type is not musdConversion', () => {
    const { result } = runHook({ type: TransactionType.perpsDeposit });

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
});
