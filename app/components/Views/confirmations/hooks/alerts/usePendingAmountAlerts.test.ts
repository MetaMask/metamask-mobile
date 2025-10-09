import { renderHook } from '@testing-library/react-native';
import { usePendingAmountAlerts } from './usePendingAmountAlerts';

jest.mock('./usePerpsDepositMinimumAlert', () => ({
  usePerpsDepositMinimumAlert: () => [
    {
      id: 'alert-2',
    },
  ],
}));

jest.mock('./useInsufficientPayTokenBalanceAlert', () => ({
  useInsufficientPayTokenBalanceAlert: () => [
    {
      id: 'alert-3',
    },
  ],
}));

jest.mock('./usePerpsHardwareAccountAlert', () => ({
  usePerpsHardwareAccountAlert: () => [
    {
      id: 'alert-1',
    },
  ],
}));

describe('usePendingAmountAlerts', () => {
  it('returns alerts', () => {
    const { result } = renderHook(() =>
      usePendingAmountAlerts({ pendingTokenAmount: '0.01' }),
    );

    expect(result.current).toStrictEqual([
      { id: 'alert-1' },
      {
        id: 'alert-2',
      },
      {
        id: 'alert-3',
      },
    ]);
  });
});
