import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictTransactionErrorDismissal } from './usePredictTransactionErrorDismissal';

let mockActiveOrder: {
  market: { id: string };
  outcome: { id: string };
  outcomeToken: { id: string };
  transactionError?: string;
} | null = null;

let mockIsPredictBalanceSelected = true;
let mockSelectedPaymentTokenAddress: string | null = null;

jest.mock('./usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => mockActiveOrder,
}));

jest.mock('./usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedPaymentTokenAddress
      ? { address: mockSelectedPaymentTokenAddress, chainId: '0x1' }
      : null,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      setActiveOrder: jest.fn(),
    },
  },
}));

describe('usePredictTransactionErrorDismissal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = {
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1' },
      transactionError: 'Deposit failed',
    };
    mockIsPredictBalanceSelected = true;
    mockSelectedPaymentTokenAddress = null;
  });

  it('clears transaction error when payment token changes', async () => {
    const { rerender } = renderHook(
      ({ amount }) => usePredictTransactionErrorDismissal({ amount }),
      { initialProps: { amount: 10 } },
    );

    mockIsPredictBalanceSelected = false;
    mockSelectedPaymentTokenAddress = '0x1234';

    await act(async () => {
      rerender({ amount: 10 });
    });

    expect(
      Engine.context.PredictController.setActiveOrder,
    ).toHaveBeenCalledWith({
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1' },
    });
  });

  it('clears transaction error when amount changes', async () => {
    const { rerender } = renderHook(
      ({ amount }) => usePredictTransactionErrorDismissal({ amount }),
      { initialProps: { amount: 10 } },
    );

    await act(async () => {
      rerender({ amount: 25 });
    });

    expect(
      Engine.context.PredictController.setActiveOrder,
    ).toHaveBeenCalledWith({
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1' },
    });
  });

  it('does not clear when there is no transaction error', async () => {
    mockActiveOrder = {
      market: { id: 'market-1' },
      outcome: { id: 'outcome-1' },
      outcomeToken: { id: 'token-1' },
    };

    const { rerender } = renderHook(
      ({ amount }) => usePredictTransactionErrorDismissal({ amount }),
      { initialProps: { amount: 10 } },
    );

    await act(async () => {
      rerender({ amount: 25 });
    });

    expect(
      Engine.context.PredictController.setActiveOrder,
    ).not.toHaveBeenCalled();
  });
});
