import { renderHook } from '@testing-library/react-native';
import { usePendingAmountAlerts } from './usePendingAmountAlerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';

jest.mock('./useInsufficientPayTokenBalanceAlert', () => ({
  useInsufficientPayTokenBalanceAlert: jest.fn(() => [{ id: 'alert-3' }]),
}));

jest.mock('./useAccountNoFundsAlert', () => ({
  useAccountNoFundsAlert: () => [{ id: 'alert-6' }],
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
    const { result } = renderHook(() => usePendingAmountAlerts({}));

    expect(result.current).toStrictEqual([
      { id: 'alert-3' },
      { id: 'alert-8' },
      { id: 'alert-9' },
      { id: 'alert-6' },
    ]);
  });

  it('passes pendingFiatAmount as pendingAmountUsd when available', () => {
    renderHook(() =>
      usePendingAmountAlerts({
        pendingFiatAmount: '0.34',
      }),
    );

    expect(useInsufficientPayTokenBalanceAlertMock).toHaveBeenCalledWith({
      pendingAmountUsd: '0.34',
    });
  });

  it('falls back to zero when pendingFiatAmount is undefined', () => {
    renderHook(() => usePendingAmountAlerts({}));

    expect(useInsufficientPayTokenBalanceAlertMock).toHaveBeenCalledWith({
      pendingAmountUsd: '0',
    });
  });
});
