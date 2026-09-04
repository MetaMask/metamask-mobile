import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useRedeemableWallet from './useRedeemableWallet';
import Engine from '../../../../core/Engine';
import {
  selectIsCardAuthenticated,
  selectCardRedeemWithdrawal,
} from '../../../../selectors/cardController';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCashbackWallet: jest.fn(),
      getCashbackWithdrawEstimation: jest.fn(),
      getCreditWallet: jest.fn(),
      getCreditWithdrawEstimation: jest.fn(),
      withdrawRedeemable: jest.fn(),
      clearRedeemWithdrawal: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectIsCardAuthenticated: jest.fn(),
  selectCardRedeemWithdrawal: jest.fn(),
}));

const mockUseSelector = jest.requireMock('react-redux')
  .useSelector as jest.Mock;

const mockGetCashbackWallet = Engine.context.CardController
  .getCashbackWallet as jest.Mock;
const mockGetCashbackWithdrawEstimation = Engine.context.CardController
  .getCashbackWithdrawEstimation as jest.Mock;
const mockWithdrawRedeemable = Engine.context.CardController
  .withdrawRedeemable as jest.Mock;
const mockClearRedeemWithdrawal = Engine.context.CardController
  .clearRedeemWithdrawal as jest.Mock;

const defaultEstimationData = {
  wei: '4648201084656',
  eth: '0.000004648201084656',
  price: '0.00892136699188968037536',
  network: 'linea',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useRedeemableWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsCardAuthenticated) return true;
      if (selector === selectCardRedeemWithdrawal) return null;
      return null;
    });
  });

  it('fetches cashback wallet data on mount when authenticated', async () => {
    const walletData = {
      id: 'w1',
      balance: '10.50',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    };
    mockGetCashbackWallet.mockResolvedValue(walletData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.wallet).toEqual(walletData);
    expect(result.current.error).toBeNull();
  });

  it('returns null wallet when query errors', async () => {
    const { CardProviderError, CardProviderErrorCode } = jest.requireActual(
      '../../../../core/Engine/controllers/card-controller/provider-types',
    );
    mockGetCashbackWallet.mockRejectedValue(
      new CardProviderError(CardProviderErrorCode.Forbidden, 'Forbidden', 403),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(result.current.wallet).toBeNull();
  });

  it('fetchEstimation loads estimation data', async () => {
    mockGetCashbackWallet.mockResolvedValue({
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    });
    mockGetCashbackWithdrawEstimation.mockResolvedValue(defaultEstimationData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.fetchEstimation();
    });

    await waitFor(() => {
      expect(result.current.estimation).toEqual(defaultEstimationData);
    });
  });

  it('calls withdrawRedeemable on withdraw', async () => {
    mockGetCashbackWallet.mockResolvedValue({
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    });
    mockWithdrawRedeemable.mockResolvedValue({ txHash: '0xabc123' });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.withdraw('5.00');
    });

    await waitFor(() => {
      expect(mockWithdrawRedeemable).toHaveBeenCalledWith({
        mode: 'cashback',
        amount: '5.00',
      });
    });
  });

  it('mirrors controller monitoring status from redeemWithdrawal state', async () => {
    mockGetCashbackWallet.mockResolvedValue({
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    });
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsCardAuthenticated) return true;
      if (selector === selectCardRedeemWithdrawal) {
        return {
          mode: 'cashback',
          status: 'monitoring',
          txHash: '0xabc',
          chainId: '0xe708',
          submittedAt: Date.now(),
          error: null,
        };
      }
      return null;
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    expect(result.current.monitoringStatus).toBe('monitoring');
    expect(result.current.isWithdrawing).toBe(true);
    expect(result.current.txHash).toBe('0xabc');
  });

  it('surfaces failed redeemWithdrawal as monitoringError', async () => {
    mockGetCashbackWallet.mockResolvedValue({
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    });
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsCardAuthenticated) return true;
      if (selector === selectCardRedeemWithdrawal) {
        return {
          mode: 'cashback',
          status: 'failed',
          txHash: '0xabc',
          chainId: null,
          submittedAt: Date.now(),
          error: {
            reason: 'no_polling_chain',
            code: 'unknown',
            statusCode: null,
          },
        };
      }
      return null;
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    expect(result.current.monitoringStatus).toBe('failed');
    expect(result.current.monitoringError?.message).toBe('no_polling_chain');
  });

  it('resetWithdraw clears controller state', async () => {
    mockGetCashbackWallet.mockResolvedValue({
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.resetWithdraw();
    });

    expect(mockClearRedeemWithdrawal).toHaveBeenCalled();
  });

  it('ignores other-mode monitoring status but disables withdraw while any redeem is in flight', async () => {
    mockGetCashbackWallet.mockResolvedValue({
      id: 'w1',
      balance: '5.00',
      currency: 'musd',
      isWithdrawable: true,
      type: 'reward',
    });
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsCardAuthenticated) return true;
      if (selector === selectCardRedeemWithdrawal) {
        return {
          mode: 'credit',
          status: 'monitoring',
          txHash: '0xcredit',
          chainId: '0xe708',
          submittedAt: Date.now(),
          error: null,
        };
      }
      return null;
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRedeemableWallet('cashback'), {
      wrapper: Wrapper,
    });

    expect(result.current.monitoringStatus).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.isWithdrawing).toBe(true);
  });
});
