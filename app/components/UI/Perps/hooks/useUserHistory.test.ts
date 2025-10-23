import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useUserHistory } from './useUserHistory';
import type { CaipAccountId } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('useUserHistory', () => {
  let mockController: {
    getActiveProvider: jest.MockedFunction<() => unknown>;
  };
  let mockProvider: {
    getUserHistory: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
  };

  const mockUserHistory = [
    {
      id: 'deposit1',
      timestamp: 1640995200000,
      type: 'deposit',
      amount: '1000',
      asset: 'USDC',
      status: 'completed',
      txHash: '0x123',
    },
    {
      id: 'withdrawal1',
      timestamp: 1640995201000,
      type: 'withdrawal',
      amount: '500',
      asset: 'USDC',
      status: 'completed',
      txHash: '0x456',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      getUserHistory: jest.fn().mockResolvedValue(mockUserHistory),
    };

    // Mock controller
    mockController = {
      getActiveProvider: jest.fn().mockReturnValue(mockProvider),
    };

    // Mock Engine context
    (
      mockEngine as unknown as { context: { PerpsController: unknown } }
    ).context = {
      PerpsController: mockController,
    };
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useUserHistory());

      expect(result.current.userHistory).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Hook starts loading immediately
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('fetchUserHistory', () => {
    it('fetches user history successfully', async () => {
      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        accountId: undefined,
      });
      expect(result.current.userHistory).toEqual(mockUserHistory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('uses provided parameters', async () => {
      const params = {
        startTime: 1640995200000,
        endTime: 1640995300000,
        accountId:
          'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
      };

      renderHook(() => useUserHistory(params));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith(params);
    });

    it('handles PerpsController not available', async () => {
      (
        mockEngine as unknown as { context: { PerpsController: unknown } }
      ).context.PerpsController = undefined;

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('PerpsController not available');
      expect(result.current.userHistory).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error fetching user history:',
        'PerpsController not available',
      );
    });

    it('handles provider fetch errors', async () => {
      mockProvider.getUserHistory.mockRejectedValue(
        new Error('Provider error'),
      );

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Provider error');
      expect(result.current.userHistory).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error fetching user history:',
        'Provider error',
      );
    });

    it('handles non-Error exceptions', async () => {
      mockProvider.getUserHistory.mockRejectedValue('String error');

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Failed to fetch user history');
      expect(result.current.userHistory).toEqual([]);
    });
  });

  describe('loading states', () => {
    it('sets loading to true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockProvider.getUserHistory.mockReturnValue(promise);

      const { result } = renderHook(() => useUserHistory());

      // Check loading state before resolution
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise(mockUserHistory);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading to false after error', async () => {
      mockProvider.getUserHistory.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refetch functionality', () => {
    it('refetches user history when refetch is called', async () => {
      const { result } = renderHook(() => useUserHistory());

      // Initial fetch
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(1);

      // Clear previous calls
      mockProvider.getUserHistory.mockClear();

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(1);
    });

    it('refetch handles errors gracefully', async () => {
      mockProvider.getUserHistory.mockRejectedValue(new Error('Refetch error'));

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Refetch error');
      expect(result.current.userHistory).toEqual([]);
    });
  });

  describe('parameter changes', () => {
    it('refetches when startTime changes', async () => {
      const { rerender } = renderHook(
        ({ startTime }) => useUserHistory({ startTime }),
        { initialProps: { startTime: 1000 } },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: 1000,
        endTime: undefined,
        accountId: undefined,
      });

      // Change startTime
      mockProvider.getUserHistory.mockClear();

      rerender({ startTime: 2000 });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: 2000,
        endTime: undefined,
        accountId: undefined,
      });
    });

    it('refetches when endTime changes', async () => {
      const { rerender } = renderHook(
        ({ endTime }) => useUserHistory({ endTime }),
        { initialProps: { endTime: 1000 } },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: 1000,
        accountId: undefined,
      });

      // Change endTime
      mockProvider.getUserHistory.mockClear();

      rerender({ endTime: 2000 });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: 2000,
        accountId: undefined,
      });
    });

    it('refetches when accountId changes', async () => {
      const { rerender } = renderHook(
        ({ accountId }) => useUserHistory({ accountId }),
        {
          initialProps: {
            accountId:
              'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
          },
        },
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
      });

      // Change accountId
      mockProvider.getUserHistory.mockClear();

      rerender({
        accountId:
          'eip155:1:0x9876543210987654321098765432109876543210' as CaipAccountId,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        accountId: 'eip155:1:0x9876543210987654321098765432109876543210',
      });
    });
  });

  describe('logging', () => {
    it('logs fetch parameters', async () => {
      const params = {
        startTime: 1640995200000,
        endTime: 1640995300000,
        accountId:
          'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
      };

      renderHook(() => useUserHistory(params));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Fetching user history with params:',
        params,
      );
    });

    it('logs successful fetch', async () => {
      renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'User history fetched successfully:',
        mockUserHistory,
      );
    });

    it('logs errors', async () => {
      mockProvider.getUserHistory.mockRejectedValue(new Error('Test error'));

      renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error fetching user history:',
        'Test error',
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty user history', async () => {
      mockProvider.getUserHistory.mockResolvedValue([]);

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.userHistory).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles undefined user history', async () => {
      mockProvider.getUserHistory.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.userHistory).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('handles null user history', async () => {
      mockProvider.getUserHistory.mockResolvedValue(null);

      const { result } = renderHook(() => useUserHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.userHistory).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
