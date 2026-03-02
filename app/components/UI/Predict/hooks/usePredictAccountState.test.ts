import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { usePredictAccountState } from './usePredictAccountState';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getAccountState: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const mockEnsurePolygonNetworkExists = jest.fn().mockResolvedValue(undefined);
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
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
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
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
      expect(result.current.address).toEqual(mockAccountState.address);
    });

    it('does not load account state on mount when loadOnMount is false', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      // Wait a bit to ensure it doesn't load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
      expect(result.current.address).toBeUndefined();
    });
  });

  describe('loadAccountState function', () => {
    it('loads account state successfully', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({});
      expect(result.current.address).toEqual(mockAccountState.address);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles errors when loading account state', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockRejectedValue(
        new Error('Failed to load account state'),
      );

      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load account state');
      });
      expect(result.current.address).toBeUndefined();
    });

    it('handles non-Error exceptions', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockRejectedValue('String error');

      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load account state');
      });
    });

    it('clears previous error on successful load', async () => {
      const { Wrapper } = createWrapper();
      // Use persistent rejection so auto-refetches also fail
      mockGetAccountState.mockRejectedValue(new Error('First error'));

      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Switch to success for the next load
      mockGetAccountState.mockResolvedValue(mockAccountState);

      await act(async () => {
        await result.current.loadAccountState();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.address).toEqual(mockAccountState.address);
      });
    });

    it('calls ensurePolygonNetworkExists on mount', async () => {
      const { Wrapper } = createWrapper();
      renderHook(() => usePredictAccountState({ loadOnMount: false }), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
      });
    });

    it('continues loading account state when ensurePolygonNetworkExists fails', async () => {
      const { Wrapper } = createWrapper();
      mockEnsurePolygonNetworkExists.mockRejectedValue(
        new Error('Failed to add Polygon network'),
      );

      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.address).toEqual(mockAccountState.address);
      expect(result.current.error).toBeNull();
    });
  });

  describe('computed values', () => {
    it('returns address from account state', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.address).toBe(mockAccountState.address);
    });

    it('returns isDeployed from account state', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.isDeployed).toBe(true);
    });

    it('returns false for isDeployed when no data loaded', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      expect(result.current.isDeployed).toBe(false);
    });

    it('returns hasAllowances from account state', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.hasAllowances).toBe(true);
    });

    it('returns false for hasAllowances when no data loaded', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      expect(result.current.hasAllowances).toBe(false);
    });

    it('returns undefined for address when no data loaded', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      expect(result.current.address).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles account state with isDeployed false', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockResolvedValue({
        ...mockAccountState,
        isDeployed: false,
      });

      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.isDeployed).toBe(false);
    });

    it('handles account state with hasAllowances false', async () => {
      const { Wrapper } = createWrapper();
      mockGetAccountState.mockResolvedValue({
        ...mockAccountState,
        hasAllowances: false,
      });

      const { result } = renderHook(
        () => usePredictAccountState({ loadOnMount: false }),
        { wrapper: Wrapper },
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.hasAllowances).toBe(false);
    });
  });

  describe('query invalidation', () => {
    it('refetches when query is invalidated', async () => {
      const { Wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => usePredictAccountState(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedState = {
        ...mockAccountState,
        address: '0x9876543210987654321098765432109876543210',
      };
      mockGetAccountState.mockResolvedValue(updatedState);

      await queryClient.invalidateQueries({
        queryKey: ['predict', 'accountState'],
      });

      await waitFor(() => {
        expect(result.current.address).toBe(updatedState.address);
      });
    });
  });

  describe('default parameters', () => {
    it('uses true as default for loadOnMount', async () => {
      const { Wrapper } = createWrapper();
      renderHook(() => usePredictAccountState(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });
  });
});
