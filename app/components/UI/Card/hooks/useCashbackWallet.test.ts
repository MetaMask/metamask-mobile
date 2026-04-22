import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCashbackWallet from './useCashbackWallet';
import { CardSDK } from '../sdk/CardSDK';

const mockSdk = {
  getCashbackWallet: jest.fn(),
  getCashbackWithdrawEstimation: jest.fn(),
  withdrawCashback: jest.fn(),
  getTransactionReceipt: jest.fn(),
} as unknown as CardSDK;

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(() => ({
    sdk: mockSdk,
  })),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => true),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const POLL_WAIT_TIMEOUT = 8000;
const POLL_TEST_TIMEOUT = 15000;

describe('useCashbackWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches wallet data on mount when authenticated', async () => {
    const walletData = {
      id: 'w1',
      balance: '10.50',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(walletData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCashbackWallet(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cashbackWallet).toEqual(walletData);
    expect(result.current.error).toBeNull();
  });

  it('returns null wallet when query errors', async () => {
    (mockSdk.getCashbackWallet as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCashbackWallet(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cashbackWallet).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('calls withdraw and starts monitoring on success', async () => {
    const walletData = {
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(walletData);
    (mockSdk.withdrawCashback as jest.Mock).mockResolvedValue({
      txHash: '0xabc123',
    });
    (mockSdk.getTransactionReceipt as jest.Mock).mockResolvedValue(null);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCashbackWallet(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.withdraw('5.00');
    });

    await waitFor(() => {
      expect(result.current.monitoringStatus).toBe('monitoring');
    });

    expect(mockSdk.withdrawCashback).toHaveBeenCalledWith({ amount: '5.00' });
  });

  it(
    'sets monitoring to success when transaction receipt has status 1',
    async () => {
      const walletData = {
        id: 'w1',
        balance: '5.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(walletData);
      (mockSdk.withdrawCashback as jest.Mock).mockResolvedValue({
        txHash: '0xabc123',
      });
      (mockSdk.getTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 1,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCashbackWallet(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.withdraw('5.00');
      });

      await waitFor(
        () => {
          expect(result.current.monitoringStatus).toBe('success');
        },
        { timeout: POLL_WAIT_TIMEOUT },
      );
    },
    POLL_TEST_TIMEOUT,
  );

  it(
    'sets monitoring to failed when transaction receipt has status 0',
    async () => {
      const walletData = {
        id: 'w1',
        balance: '5.00',
        currency: 'musd',
        isWithdrawable: true,
        type: 'reward',
      };
      (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(walletData);
      (mockSdk.withdrawCashback as jest.Mock).mockResolvedValue({
        txHash: '0xabc123',
      });
      (mockSdk.getTransactionReceipt as jest.Mock).mockResolvedValue({
        status: 0,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCashbackWallet(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.withdraw('5.00');
      });

      await waitFor(
        () => {
          expect(result.current.monitoringStatus).toBe('failed');
        },
        { timeout: POLL_WAIT_TIMEOUT },
      );

      expect(result.current.monitoringError?.message).toBe(
        'Transaction reverted on-chain',
      );
    },
    POLL_TEST_TIMEOUT,
  );

  it('resets all monitoring state via resetWithdraw', async () => {
    const walletData = {
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(walletData);
    (mockSdk.withdrawCashback as jest.Mock).mockResolvedValue({
      txHash: '0xabc123',
    });
    (mockSdk.getTransactionReceipt as jest.Mock).mockResolvedValue(null);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCashbackWallet(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.withdraw('5.00');
    });

    await waitFor(() => {
      expect(result.current.monitoringStatus).toBe('monitoring');
    });

    act(() => {
      result.current.resetWithdraw();
    });

    expect(result.current.monitoringStatus).toBe('idle');
    expect(result.current.monitoringError).toBeNull();
  });

  it('exposes fetchEstimation that triggers manual query fetch', async () => {
    const walletData = {
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    const estimationData = {
      wei: '4648201084656',
      eth: '0.000004648201084656',
      price: '0.00892136699188968037536',
    };
    (mockSdk.getCashbackWallet as jest.Mock).mockResolvedValue(walletData);
    (mockSdk.getCashbackWithdrawEstimation as jest.Mock).mockResolvedValue(
      estimationData,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCashbackWallet(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.fetchEstimation();
    });

    expect(mockSdk.getCashbackWithdrawEstimation).toHaveBeenCalled();
  });

  it('throws error when withdrawing without sdk', async () => {
    const { useCardSDK } = jest.requireMock('../sdk');
    (useCardSDK as jest.Mock).mockReturnValueOnce({ sdk: null });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCashbackWallet(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.withdraw('5.00');
    });

    await waitFor(() => {
      expect(result.current.withdrawError).toBeTruthy();
    });
  });
});
