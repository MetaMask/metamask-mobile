import { renderHook } from '@testing-library/react-native';
import { usePerpsDepositAlerts } from './usePerpsDepositAlerts';

jest.mock('../../../hooks/alerts/usePerpsDepositMinimumAlert', () => ({
  usePerpsDepositMinimumAlert: () => [
    {
      id: 'alert-1',
    },
  ],
}));

jest.mock('../../../hooks/alerts/useInsufficientPayTokenBalanceAlert', () => ({
  useInsufficientPayTokenBalanceAlert: () => [
    {
      id: 'alert-2',
    },
  ],
}));

describe('usePerpsDepositAlerts', () => {
  it('returns alerts', () => {
    const { result } = renderHook(() =>
      usePerpsDepositAlerts({ pendingTokenAmount: '0.01' }),
    );

    expect(result.current).toStrictEqual([
      {
        id: 'alert-1',
      },
      {
        id: 'alert-2',
      },
    ]);
  });
});
