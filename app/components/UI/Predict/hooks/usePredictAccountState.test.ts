import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { usePredictAccountState } from './usePredictAccountState';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getAccountState: jest.fn(),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetAccountState = Engine.context.PredictController
  .getAccountState as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('usePredictAccountState', () => {
  const mockAccountState = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isDeployed: true,
    hasAllowances: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccountState.mockResolvedValue(mockAccountState);
  });

  describe('initialization', () => {
    it('loads account state on mount by default', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(result.current.data?.address).toEqual(mockAccountState.address);
    });

    it('does not load account state when enabled is false', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ enabled: false }),
        { wrapper: Wrapper },
      );

      // Wait a bit to ensure it doesn't load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('data fetching', () => {
    it('returns account state data on success', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(result.current.data?.address).toEqual(mockAccountState.address);
      expect(result.current.data?.isDeployed).toBe(true);
      expect(result.current.data?.hasAllowances).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('exposes error when loading fails', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockRejectedValue(
        new Error('Failed to load account state'),
      );

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe(
        'Failed to load account state',
      );
      expect(result.current.data).toBeUndefined();
    });

    it('clears error on successful refetch', async () => {
      const { Wrapper, queryClient } = createWrapper();
      mockGetAccountState.mockRejectedValue(new Error('First error'));

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error?.message).toBe('First error');
      });

      // Switch to success for the refetch
      mockGetAccountState.mockResolvedValue(mockAccountState);

      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: ['predict', 'accountState'],
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data?.address).toEqual(mockAccountState.address);
      });
    });
  });

  describe('error logging', () => {
    it('logs error via Logger.error when query fails', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockRejectedValue(
        new Error('Failed to load account state'),
      );

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'Predict',
            component: 'usePredictAccountState',
          }),
        }),
      );
    });
  });

  describe('account state values', () => {
    it('returns data with address, isDeployed, and hasAllowances', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.address).toBe(mockAccountState.address);
      expect(result.current.data?.isDeployed).toBe(true);
      expect(result.current.data?.hasAllowances).toBe(true);
    });

    it('handles account state with isDeployed false', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockResolvedValue({
        ...mockAccountState,
        isDeployed: false,
      });

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.isDeployed).toBe(false);
    });

    it('handles account state with hasAllowances false', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockResolvedValue({
        ...mockAccountState,
        hasAllowances: false,
      });

      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data?.hasAllowances).toBe(false);
    });

    it('has undefined data when query is disabled', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ enabled: false }),
        { wrapper: Wrapper },
      );

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('query invalidation', () => {
    it('refetches when refetch is called', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.address).toBe(mockAccountState.address);
      expect(mockGetAccountState).toHaveBeenCalledTimes(1);

      const updatedState = {
        ...mockAccountState,
        address: '0x9876543210987654321098765432109876543210',
      };
      mockGetAccountState.mockResolvedValue(updatedState);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetAccountState).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(result.current.data?.address).toBe(updatedState.address);
      });
    });
  });

  describe('default parameters', () => {
    it('enables the query by default', async () => {
      const { Wrapper } = createWrapper();
      renderHook(() => usePredictAccountState(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });
  });
});
