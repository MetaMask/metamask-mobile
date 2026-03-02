import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnrealizedPnL } from './useUnrealizedPnL';
import { UnrealizedPnL } from '../types';
import { usePredictPositions } from './usePredictPositions';

const mockSelectedAddress = '0x1234567890123456789012345678901234567890';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('./usePredictPositions');
const mockUsePredictPositions = usePredictPositions as jest.Mock;

const mockGetUnrealizedPnL = jest.fn();

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getUnrealizedPnL: (...args: unknown[]) => mockGetUnrealizedPnL(...args),
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: {
            lastSelected: 0,
          },
        },
      ]),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../utils/predictErrorHandler', () => ({
  ensureError: (err: unknown) =>
    err instanceof Error ? err : new Error(String(err)),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useUnrealizedPnL', () => {
  const basePnL: UnrealizedPnL = {
    user: '0x1111111111111111111111111111111111111111',
    cashUpnl: 12.5,
    percentUpnl: 3.4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPositions.mockReturnValue({
      data: [{ id: 'position-1' }],
    });
  });

  it('does not fetch when loadOnMount is false', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useUnrealizedPnL({ loadOnMount: false }),
      { wrapper: Wrapper },
    );

    expect(result.current.unrealizedPnL).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.loadUnrealizedPnL).toBe('function');
    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();
  });

  it('fetches unrealized P&L successfully with default options', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unrealizedPnL).toEqual(basePnL);
    expect(result.current.error).toBeNull();
    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: mockSelectedAddress,
    });
  });

  it('uses provided address instead of selected account', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);
    const customAddress = '0x2222222222222222222222222222222222222222';

    const { result } = renderHook(
      () => useUnrealizedPnL({ address: customAddress }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(basePnL);
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: customAddress,
    });
  });

  it('handles null responses', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(null);

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unrealizedPnL).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors thrown by getUnrealizedPnL', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.unrealizedPnL).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('supports manual refetching via loadUnrealizedPnL', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const updatedPnL: UnrealizedPnL = {
      user: '0x9999999999999999999999999999999999999999',
      cashUpnl: -5,
      percentUpnl: -2,
    };

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(basePnL);
    });

    mockGetUnrealizedPnL.mockResolvedValue(updatedPnL);

    await act(async () => {
      await result.current.loadUnrealizedPnL();
    });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(updatedPnL);
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledTimes(2);
  });

  describe('positions-based visibility', () => {
    it('returns null when user has no positions', async () => {
      const { Wrapper } = createWrapper();
      mockUsePredictPositions.mockReturnValue({ data: [] });
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);

      const { result } = renderHook(() => useUnrealizedPnL(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns unrealized P&L when user has positions', async () => {
      const { Wrapper } = createWrapper();
      mockUsePredictPositions.mockReturnValue({
        data: [{ id: 'position-1' }, { id: 'position-2' }],
      });
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);

      const { result } = renderHook(() => useUnrealizedPnL(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toEqual(basePnL);
      expect(result.current.error).toBeNull();
    });

    it('calls usePredictPositions with claimable: false', () => {
      const { Wrapper } = createWrapper();
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);

      renderHook(() => useUnrealizedPnL(), { wrapper: Wrapper });

      expect(mockUsePredictPositions).toHaveBeenCalledWith({
        claimable: false,
      });
    });

    it('returns null when getUnrealizedPnL returns null and user has positions', async () => {
      const { Wrapper } = createWrapper();
      mockGetUnrealizedPnL.mockResolvedValue(null);

      const { result } = renderHook(() => useUnrealizedPnL(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns null when both getUnrealizedPnL returns null and no positions', async () => {
      const { Wrapper } = createWrapper();
      mockUsePredictPositions.mockReturnValue({ data: [] });
      mockGetUnrealizedPnL.mockResolvedValue(null);

      const { result } = renderHook(() => useUnrealizedPnL(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns null when positions data is undefined', async () => {
      const { Wrapper } = createWrapper();
      mockUsePredictPositions.mockReturnValue({ data: undefined });
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);

      const { result } = renderHook(() => useUnrealizedPnL(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
    });
  });
});
