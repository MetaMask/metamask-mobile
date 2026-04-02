import { renderHook } from '@testing-library/react-native';
import { usePendingAmountAlerts } from './usePendingAmountAlerts';

jest.mock('./useInsufficientPayTokenBalanceAlert', () => ({
  useInsufficientPayTokenBalanceAlert: () => [
    {
      id: 'alert-3',
    },
  ],
}));

jest.mock('./useMMPayHardwareAccountAlert', () => ({
  useMMPayHardwareAccountAlert: () => [
    {
      id: 'alert-1',
    },
  ],
}));

jest.mock('./useInsufficientPredictBalanceAlert', () => ({
  useInsufficientPredictBalanceAlert: () => [
    {
      id: 'alert-4',
    },
  ],
}));

jest.mock('./useInsufficientPerpsBalanceAlert', () => ({
  useInsufficientPerpsBalanceAlert: () => [
    {
      id: 'alert-5',
    },
  ],
}));

jest.mock('./useAccountNoFundsAlert', () => ({
  useAccountNoFundsAlert: () => [
    {
      id: 'alert-6',
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
      { id: 'alert-3' },
      { id: 'alert-4' },
      { id: 'alert-5' },
      { id: 'alert-6' },
    ]);
  });
});
