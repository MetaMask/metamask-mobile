import { renderHook } from '@testing-library/react-native';
import { usePerpsDepositAlerts } from './usePerpsDepositAlerts';

jest.mock('../../../hooks/alerts/usePerpsDepositMinimumAlert', () => ({
  usePerpsDepositMinimumAlert: () => [
    {
      id: 'alert-2',
    },
  ],
}));

jest.mock('../../../hooks/alerts/useInsufficientPayTokenBalanceAlert', () => ({
  useInsufficientPayTokenBalanceAlert: () => [
    {
      id: 'alert-3',
    },
  ],
}));

jest.mock('../../../hooks/alerts/usePerpsHardwareAccountAlert', () => ({
  usePerpsHardwareAccountAlert: () => [
    {
      id: 'alert-1',
    },
  ],
}));

describe('usePerpsDepositAlerts', () => {
  it('returns alerts', () => {
    const { result } = renderHook(() =>
      usePerpsDepositAlerts({ pendingTokenAmount: '0.01' }),
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
