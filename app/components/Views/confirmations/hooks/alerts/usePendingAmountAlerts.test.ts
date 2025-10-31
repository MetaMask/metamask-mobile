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

jest.mock('../pay/useTransactionRequiredTokens', () => ({
  useTransactionRequiredTokens: () => [
    {
      address: '0x1',
    },
  ],
}));

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: () => ({
    chainId: '0x1',
  }),
}));

jest.mock('./useInsufficientPredictBalanceAlert', () => ({
  useInsufficientPredictBalanceAlert: () => [
    {
      id: 'alert-4',
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
      { id: 'alert-4' },
    ]);
  });
});
