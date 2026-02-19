import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictBalance } from './usePredictBalance';
import { predictQueries } from '../queries';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockGetBalance = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getBalance: (...args: unknown[]) => mockGetBalance(...args),
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: { lastSelected: 0 },
        },
      ]),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const mockEnsurePolygonNetworkExists = jest.fn();
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('usePredictBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBalance.mockResolvedValue(100);
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetching behavior', () => {
    it('fetches balance automatically on mount', async () => {
      const { Wrapper } = createWrapper();
      mockGetBalance.mockResolvedValue(150.5);

      const { result } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBe(150.5);
      expect(result.current.error).toBeNull();
      expect(mockGetBalance).toHaveBeenCalledWith({
        address: MOCK_ADDRESS,
      });
    });
  });

  describe('network setup', () => {
    it('calls ensurePolygonNetworkExists before fetching balance', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockGetBalance).toHaveBeenCalledTimes(1);
    });

    it('fetches balance even if ensurePolygonNetworkExists fails', async () => {
      const { Wrapper } = createWrapper();
      mockEnsurePolygonNetworkExists.mockRejectedValue(
        new Error('Network add failed'),
      );
      mockGetBalance.mockResolvedValue(99);

      const { result } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBe(99);
      });

      expect(mockGetBalance).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('exposes error when balance fetch fails', async () => {
      const { Wrapper } = createWrapper();
      mockGetBalance.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.data).toBeUndefined();
    });

    it('clears error after successful refetch via invalidation', async () => {
      const { Wrapper, queryClient } = createWrapper();
      mockGetBalance.mockRejectedValueOnce(new Error('Temporary error'));
      mockGetBalance.mockResolvedValue(300);

      const { result } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      await queryClient.invalidateQueries({
        queryKey: predictQueries.balance.keys.all(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBe(300);
      });
    });
  });

  describe('query invalidation', () => {
    it('refetches when query is invalidated', async () => {
      const { Wrapper, queryClient } = createWrapper();
      mockGetBalance.mockResolvedValue(100);

      const { result } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBe(100);
      });

      mockGetBalance.mockResolvedValue(200);
      await queryClient.invalidateQueries({
        queryKey: predictQueries.balance.keys.all(),
      });

      await waitFor(() => {
        expect(result.current.data).toBe(200);
      });

      expect(mockGetBalance).toHaveBeenCalledTimes(2);
    });
  });

  describe('shared cache', () => {
    it('shares cached data across multiple hook instances', async () => {
      const { Wrapper } = createWrapper();
      mockGetBalance.mockResolvedValue(500);

      const { result: result1 } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result1.current.data).toBe(500);
      });

      const { result: result2 } = renderHook(() => usePredictBalance(), {
        wrapper: Wrapper,
      });

      expect(result2.current.data).toBe(500);
      expect(mockGetBalance).toHaveBeenCalledTimes(1);
    });
  });
});
