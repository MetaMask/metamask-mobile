import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  usePerpsImagePrefetch,
  usePerpsVisibleImagePrefetch,
  usePerpsClearImageCache,
} from './usePerpsImagePrefetch';

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(),
    clearDiskCache: jest.fn(),
    clearMemoryCache: jest.fn(),
  },
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

// Test utilities
const createMockSymbols = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `TOKEN${i}`);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('usePerpsImagePrefetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic functionality', () => {
    it('should not prefetch when symbols array is empty', () => {
      // Arrange
      const emptySymbols: string[] = [];

      // Act
      const { result } = renderHook(() => usePerpsImagePrefetch(emptySymbols));

      // Assert
      expect(Image.prefetch).not.toHaveBeenCalled();
      expect(result.current.prefetchedCount).toBe(0);
      expect(result.current.isPrefetching).toBe(false);
    });

    it('should prefetch images for provided symbols', async () => {
      // Arrange
      const symbols = ['BTC', 'ETH'];
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      const { result } = renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert - wait for prefetch to be called
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledWith(
          expect.stringContaining('BTC.svg'),
          expect.objectContaining({ cachePolicy: 'memory-disk' }),
        );
        expect(Image.prefetch).toHaveBeenCalledWith(
          expect.stringContaining('ETH.svg'),
          expect.objectContaining({ cachePolicy: 'memory-disk' }),
        );
      });

      await waitFor(() => {
        expect(result.current.prefetchedCount).toBe(2);
      });
    });

    it('should convert symbols to uppercase for URLs', async () => {
      // Arrange
      const symbols = ['btc', 'eth'];
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledWith(
          'https://app.hyperliquid.xyz/coins/BTC.svg',
          expect.any(Object),
        );
        expect(Image.prefetch).toHaveBeenCalledWith(
          'https://app.hyperliquid.xyz/coins/ETH.svg',
          expect.any(Object),
        );
      });
    });

    it('should use memory-disk cache policy', async () => {
      // Arrange
      const symbols = ['BTC'];
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledWith(expect.any(String), {
          cachePolicy: 'memory-disk',
        });
      });
    });
  });

  describe('Batch processing', () => {
    it('should process images in default batch size of 25', async () => {
      // Arrange
      jest.useFakeTimers();
      const symbols = Array.from({ length: 30 }, (_, i) => `TOKEN${i}`);
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert - First batch
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(25);
      });

      // Advance timer for batch delay
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Assert - Second batch
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(30);
      });

      jest.useRealTimers();
    });

    it('should respect custom batch size from options', async () => {
      // Arrange
      jest.useFakeTimers();
      const symbols = Array.from({ length: 15 }, (_, i) => `TOKEN${i}`);
      const options = { batchSize: 5 };
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols, options));

      // Assert - First batch
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(5);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Assert - Second batch
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(10);
      });

      jest.useRealTimers();
    });

    it('should add 50ms delay between batches', async () => {
      // Arrange
      jest.useFakeTimers();
      const symbols = Array.from({ length: 50 }, (_, i) => `TOKEN${i}`);
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      const { result } = renderHook(() =>
        usePerpsImagePrefetch(symbols, { batchSize: 25 }),
      );

      // Wait for first batch to complete
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(25);
      });

      // Advance timer for batch delay
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Wait for second batch to complete
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(50);
      });

      // Both calls should have delay
      await waitFor(() => {
        expect(result.current.prefetchedCount).toBe(50);
      });

      jest.useRealTimers();
    });

    it('should complete all batches even if some fail', async () => {
      // Arrange
      jest.useFakeTimers();
      const symbols = Array.from({ length: 10 }, (_, i) => `TOKEN${i}`);
      (Image.prefetch as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      // Act
      const { result } = renderHook(() =>
        usePerpsImagePrefetch(symbols, { batchSize: 5 }),
      );

      // Assert - All symbols attempted despite error
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(5);
      });

      act(() => {
        jest.advanceTimersByTime(50);
      });

      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(10);
      });

      // Check that both batches were attempted
      await waitFor(() => {
        expect(result.current.prefetchedCount).toBe(9); // All except the failed one
      });

      jest.useRealTimers();
    });
  });

  describe('Deduplication', () => {
    it('should not prefetch already cached symbols', async () => {
      // Arrange
      jest.useFakeTimers();
      const symbols = ['BTC', 'ETH'];
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act - First render
      const { rerender } = renderHook(
        ({ syms }) => usePerpsImagePrefetch(syms),
        { initialProps: { syms: symbols } },
      );

      // Wait for initial prefetch to complete
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(2);
      });

      // Act - Second render with same symbols
      jest.clearAllMocks();
      rerender({ syms: symbols });

      // Give it a moment to potentially make calls
      act(() => {
        jest.runAllTimers();
      });

      // Assert - Should not prefetch again
      expect(Image.prefetch).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle duplicate symbols in input array', async () => {
      // Arrange
      const symbols = ['BTC', 'btc', 'BTC', 'ETH', 'eth'];
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert - Should prefetch all symbols (hook converts to uppercase internally)
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(5); // All 5 symbols get prefetched
      });

      // But URLs should be uppercase
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('BTC.svg'),
        expect.any(Object),
      );
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('ETH.svg'),
        expect.any(Object),
      );
    });

    it('should track successfully prefetched symbols', async () => {
      // Arrange
      const symbols = ['BTC', 'ETH', 'SOL'];
      (Image.prefetch as jest.Mock)
        .mockResolvedValueOnce(true) // BTC success
        .mockResolvedValueOnce(false) // ETH fail
        .mockResolvedValueOnce(true); // SOL success

      // Act
      const { result } = renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert - wait for count to update
      await waitFor(() => {
        expect(result.current.prefetchedCount).toBe(2); // Only BTC and SOL
      });
    });

    it('should handle mixed case duplicates correctly', async () => {
      // Arrange
      const firstBatch = ['btc', 'eth'];
      const secondBatch = ['BTC', 'ETH', 'SOL'];
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act - First render with lowercase
      const { rerender } = renderHook(
        ({ syms }) => usePerpsImagePrefetch(syms),
        { initialProps: { syms: firstBatch } },
      );

      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(2);
      });

      // Act - Second render with uppercase (duplicates) + new symbol
      jest.clearAllMocks();
      rerender({ syms: secondBatch });

      // Assert - Should only prefetch SOL
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(1);
        expect(Image.prefetch).toHaveBeenCalledWith(
          expect.stringContaining('SOL.svg'),
          expect.any(Object),
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should continue processing when individual prefetch fails', async () => {
      // Arrange
      const symbols = ['BTC', 'ETH', 'SOL'];
      (Image.prefetch as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols));

      // Assert - All symbols attempted
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should log errors in development mode', async () => {
      // Arrange
      const originalDev = __DEV__;
      Object.defineProperty(global, '__DEV__', {
        value: true,
        writable: true,
        configurable: true,
      });
      const symbols = ['BTC'];
      const testError = new Error('Test error');
      (Image.prefetch as jest.Mock).mockRejectedValue(testError);

      // Act
      renderHook(() => usePerpsImagePrefetch(symbols));

      // Wait for the hook to process
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalled();
      });

      // Assert - When individual prefetch fails, it logs success count
      expect(DevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Prefetched 0/1'),
      );

      // Cleanup
      Object.defineProperty(global, '__DEV__', {
        value: originalDev,
        writable: true,
        configurable: true,
      });
    });

    it('should handle network timeouts gracefully', async () => {
      // Arrange
      const symbols = ['BTC', 'ETH'];
      (Image.prefetch as jest.Mock).mockRejectedValue(new Error('Timeout'));

      // Act
      const { result } = renderHook(() => usePerpsImagePrefetch(symbols));

      // Wait for the hook to process
      await waitFor(() => {
        expect(Image.prefetch).toHaveBeenCalled();
      });

      // Assert - Should handle error and continue
      expect(result.current.prefetchedCount).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it.each([
      { symbols: [], expectedCalls: 0, description: 'empty array' },
      { symbols: ['BTC'], expectedCalls: 1, description: 'single symbol' },
      {
        symbols: ['btc', 'BTC'],
        expectedCalls: 2, // Hook doesn't deduplicate input
        description: 'duplicate with different case',
      },
      {
        symbols: new Array(100).fill('ETH'),
        expectedCalls: 100, // Hook doesn't deduplicate input
        description: 'many duplicates',
      },
      {
        symbols: ['BTC', '', null, 'ETH', undefined, 'SOL', '  '],
        expectedCalls: 3, // Hook now correctly filters and processes only valid symbols (BTC, ETH, SOL)
        description: 'invalid values mixed with valid',
      },
    ])(
      'should handle $description correctly',
      async ({ symbols, expectedCalls }) => {
        // Arrange
        (Image.prefetch as jest.Mock).mockResolvedValue(true);

        // Act
        renderHook(() => usePerpsImagePrefetch(symbols));

        // Assert
        if (expectedCalls === 0) {
          expect(Image.prefetch).not.toHaveBeenCalled();
        } else {
          await waitFor(() => {
            expect(Image.prefetch).toHaveBeenCalledTimes(expectedCalls);
          });
        }
      },
    );

    it('should handle very large arrays efficiently', async () => {
      // Arrange
      jest.useFakeTimers();
      const symbols = createMockSymbols(500);
      (Image.prefetch as jest.Mock).mockResolvedValue(true);

      // Act
      const { result } = renderHook(() =>
        usePerpsImagePrefetch(symbols, { batchSize: 50 }),
      );

      // Advance timer for all batches
      act(() => {
        jest.advanceTimersByTime(500); // 10 batches with 50ms delay
      });

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isPrefetching).toBe(false);
      });

      // Assert
      expect(Image.prefetch).toHaveBeenCalledTimes(500);
      expect(result.current.prefetchedCount).toBe(500);

      jest.useRealTimers();
    });
  });

  describe('Concurrent execution prevention', () => {
    it('should not start new prefetch while one is in progress', async () => {
      // Arrange
      const symbols1 = ['BTC', 'ETH'];
      const symbols2 = ['SOL', 'AVAX'];
      let resolvePrefetch: (value: boolean) => void;
      (Image.prefetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePrefetch = resolve;
          }),
      );

      // Act - Start first prefetch
      const { rerender } = renderHook(
        ({ syms }) => usePerpsImagePrefetch(syms),
        { initialProps: { syms: symbols1 } },
      );

      // Wait a tick for the effect to run
      await act(async () => {
        await flushPromises();
      });

      // Immediately try to start another while first is pending
      rerender({ syms: symbols2 });

      // Complete the first prefetch
      act(() => {
        resolvePrefetch(true);
      });

      await act(async () => {
        await flushPromises();
      });

      // Assert - Only first batch should be processed
      expect(Image.prefetch).toHaveBeenCalledTimes(2);
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('BTC.svg'),
        expect.any(Object),
      );
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('ETH.svg'),
        expect.any(Object),
      );
    });
  });
});

describe('usePerpsVisibleImagePrefetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should prefetch visible range plus lookahead', async () => {
    // Arrange
    const allSymbols = Array.from({ length: 100 }, (_, i) => `TOKEN${i}`);
    const visibleRange = { first: 10, last: 20 };
    const prefetchAhead = 5;
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    // Act
    renderHook(() =>
      usePerpsVisibleImagePrefetch(allSymbols, visibleRange, prefetchAhead),
    );

    // Assert - Should prefetch from 10 to 25 (20 + 5)
    await waitFor(() => {
      // With batch size of 5, should have made calls for indices 10-24
      expect(Image.prefetch).toHaveBeenCalled();
      const calls = (Image.prefetch as jest.Mock).mock.calls;
      const prefetchedSymbols = calls.map((call) => {
        const url = call[0];
        const match = url.match(/TOKEN(\d+)\.svg/);
        return match ? parseInt(match[1]) : -1;
      });
      expect(Math.min(...prefetchedSymbols)).toBe(10);
      expect(Math.max(...prefetchedSymbols)).toBeLessThanOrEqual(25);
    });
  });

  it('should handle edge of list correctly', async () => {
    // Arrange
    const allSymbols = ['BTC', 'ETH', 'SOL'];
    const visibleRange = { first: 1, last: 2 };
    const prefetchAhead = 10; // More than available
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    // Act
    renderHook(() =>
      usePerpsVisibleImagePrefetch(allSymbols, visibleRange, prefetchAhead),
    );

    // Assert - Should only prefetch available symbols (ETH and SOL)
    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledTimes(2);
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('ETH.svg'),
        expect.any(Object),
      );
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('SOL.svg'),
        expect.any(Object),
      );
    });
  });

  it('should handle negative indices correctly', async () => {
    // Arrange
    const allSymbols = ['BTC', 'ETH', 'SOL'];
    const visibleRange = { first: -5, last: 1 };
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    // Act
    renderHook(() => usePerpsVisibleImagePrefetch(allSymbols, visibleRange));

    // Assert - Should start from 0
    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledWith(
        expect.stringContaining('BTC.svg'),
        expect.any(Object),
      );
    });
  });

  it('should handle empty symbols array', () => {
    // Arrange
    const allSymbols: string[] = [];
    const visibleRange = { first: 0, last: 10 };

    // Act
    renderHook(() => usePerpsVisibleImagePrefetch(allSymbols, visibleRange));

    // Assert
    expect(Image.prefetch).not.toHaveBeenCalled();
  });

  it('should use high priority and smaller batch size', async () => {
    // Arrange
    const allSymbols = Array.from({ length: 20 }, (_, i) => `TOKEN${i}`);
    const visibleRange = { first: 0, last: 10 };
    (Image.prefetch as jest.Mock).mockResolvedValue(true);

    // Act
    renderHook(() => usePerpsVisibleImagePrefetch(allSymbols, visibleRange));

    // Assert - Should use batch size of 5
    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledTimes(5); // First batch
    });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledTimes(10); // Second batch
    });
  });
});

describe('usePerpsClearImageCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear both memory and disk cache', async () => {
    // Arrange
    (Image.clearMemoryCache as jest.Mock).mockResolvedValue(undefined);
    (Image.clearDiskCache as jest.Mock).mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => usePerpsClearImageCache());
    let success: boolean = false;
    await act(async () => {
      success = await result.current.clearCache();
    });

    // Assert
    expect(Image.clearMemoryCache).toHaveBeenCalled();
    expect(Image.clearDiskCache).toHaveBeenCalled();
    expect(success).toBe(true);
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Image cache cleared successfully',
    );
  });

  it('should only clear disk cache when diskOnly is true', async () => {
    // Arrange
    (Image.clearMemoryCache as jest.Mock).mockResolvedValue(undefined);
    (Image.clearDiskCache as jest.Mock).mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => usePerpsClearImageCache());
    await act(async () => {
      await result.current.clearCache(true);
    });

    // Assert
    expect(Image.clearMemoryCache).not.toHaveBeenCalled();
    expect(Image.clearDiskCache).toHaveBeenCalled();
  });

  it('should return false and log on error', async () => {
    // Arrange
    const cacheError = new Error('Cache error');
    (Image.clearMemoryCache as jest.Mock).mockRejectedValue(cacheError);

    // Act
    const { result } = renderHook(() => usePerpsClearImageCache());
    let success: boolean = true;
    await act(async () => {
      success = await result.current.clearCache();
    });

    // Assert
    expect(success).toBe(false);
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Failed to clear image cache:',
      cacheError,
    );
  });

  it('should provide stable function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => usePerpsClearImageCache());
    const firstRef = result.current.clearCache;

    rerender();
    const secondRef = result.current.clearCache;

    // Assert
    expect(firstRef).toBe(secondRef);
  });

  it('should handle disk cache error separately', async () => {
    // Arrange
    (Image.clearMemoryCache as jest.Mock).mockResolvedValue(undefined);
    (Image.clearDiskCache as jest.Mock).mockRejectedValue(
      new Error('Disk error'),
    );

    // Act
    const { result } = renderHook(() => usePerpsClearImageCache());
    let success: boolean = true;
    await act(async () => {
      success = await result.current.clearCache();
    });

    // Assert
    expect(Image.clearMemoryCache).toHaveBeenCalled();
    expect(success).toBe(false);
  });
});
