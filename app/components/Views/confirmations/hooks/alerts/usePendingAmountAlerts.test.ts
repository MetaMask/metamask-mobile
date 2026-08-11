import { renderHook } from '@testing-library/react-native';
import { usePendingAmountAlerts } from './usePendingAmountAlerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';

jest.mock('./useInsufficientPayTokenBalanceAlert', () => ({
  useInsufficientPayTokenBalanceAlert: jest.fn(() => [{ id: 'alert-3' }]),
}));

jest.mock('./useInsufficientPredictBalanceAlert', () => ({
  useInsufficientPredictBalanceAlert: () => [{ id: 'alert-4' }],
}));

jest.mock('./useInsufficientPerpsBalanceAlert', () => ({
  useInsufficientPerpsBalanceAlert: () => [{ id: 'alert-5' }],
}));

jest.mock('./useAccountNoFundsAlert', () => ({
  useAccountNoFundsAlert: () => [{ id: 'alert-6' }],
}));

jest.mock('./useInsufficientMoneyAccountBalanceAlert', () => ({
  useInsufficientMoneyAccountBalanceAlert: () => [{ id: 'alert-7' }],
}));

jest.mock('./useFiatBuyLimitAlert', () => ({
  useFiatBuyLimitAlert: () => [{ id: 'alert-8' }],
}));

jest.mock('./useTransactionDepositLimitAlert', () => ({
  useTransactionDepositLimitAlert: () => [
    {
      id: 'alert-9',
    },
  ],
}));

const useInsufficientPayTokenBalanceAlertMock = jest.mocked(
  useInsufficientPayTokenBalanceAlert,
);

describe('usePendingAmountAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useInsufficientPayTokenBalanceAlertMock.mockReturnValue([
      { id: 'alert-3' } as never,
    ]);
  });

  it('returns alerts', () => {
    const { result } = renderHook(() =>
      usePendingAmountAlerts({ pendingTokenAmount: '0.01' }),
    );

    expect(result.current).toStrictEqual([
      { id: 'alert-3' },
      { id: 'alert-4' },
      { id: 'alert-5' },
      { id: 'alert-7' },
      { id: 'alert-8' },
      { id: 'alert-9' },
      { id: 'alert-6' },
    ]);
  });

  it('passes pendingFiatAmount as pendingAmountUsd when available', () => {
    renderHook(() =>
      usePendingAmountAlerts({
        pendingTokenAmount: '100',
        pendingFiatAmount: '0.34',
      }),
    );

    expect(useInsufficientPayTokenBalanceAlertMock).toHaveBeenCalledWith({
      pendingAmountUsd: '0.34',
    });
  });

  it('falls back to zero when pendingFiatAmount is undefined', () => {
    renderHook(() => usePendingAmountAlerts({ pendingTokenAmount: '0.01' }));

    expect(useInsufficientPayTokenBalanceAlertMock).toHaveBeenCalledWith({
      pendingAmountUsd: '0',
    });
  });
});
