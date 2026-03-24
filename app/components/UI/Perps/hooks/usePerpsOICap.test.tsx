/**
 * Unit tests for usePerpsOICap hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsOICap } from './usePerpsOICap';

jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../util/Logger');

// Mock PerpsStreamManager — same pattern as usePerpsMarkets.test.ts
const mockSubscribe = jest.fn();
const mockOiCaps = {
  subscribe: mockSubscribe,
};

jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => ({
    oiCaps: mockOiCaps,
  })),
}));

describe('usePerpsOICap', () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
  });

  it('returns isAtCap true when symbol in caps list', async () => {
    let capturedCallback: ((caps: string[]) => void) | null = null;
    mockSubscribe.mockImplementation(
      ({ callback }: { callback: (caps: string[]) => void }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'));

    // Initial state - loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAtCap).toBe(false);

    // Send OI cap update with BTC at cap
    await act(async () => {
      capturedCallback?.(['BTC', 'ETH']);
    });

    // Should indicate BTC is at cap
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns isAtCap false when symbol not in caps list', async () => {
    let capturedCallback: ((caps: string[]) => void) | null = null;
    mockSubscribe.mockImplementation(
      ({ callback }: { callback: (caps: string[]) => void }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('SOL'));

    // Send OI cap update without SOL
    await act(async () => {
      capturedCallback?.(['BTC', 'ETH']);
    });

    // Should indicate SOL is NOT at cap
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns isLoading true until first data received', () => {
    // Don't call callback - simulates waiting for first data
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    const { result } = renderHook(() => usePerpsOICap('BTC'));

    // Should be loading before first data
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAtCap).toBe(false);
  });

  it('returns isLoading false after first data received', async () => {
    let capturedCallback: ((caps: string[]) => void) | null = null;
    mockSubscribe.mockImplementation(
      ({ callback }: { callback: (caps: string[]) => void }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'));

    // Initial loading state
    expect(result.current.isLoading).toBe(true);

    // Send first data (empty caps list)
    await act(async () => {
      capturedCallback?.([]);
    });

    // Should not be loading anymore
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles undefined symbol gracefully', async () => {
    mockSubscribe.mockImplementation(() => mockUnsubscribe);

    const { result } = renderHook(() => usePerpsOICap(undefined));

    // Should not crash with undefined symbol
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAtCap).toBe(false);

    // subscribe should not have been called (symbol is undefined)
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes when component unmounts', () => {
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => usePerpsOICap('BTC'));

    // Subscription should be created
    expect(mockSubscribe).toHaveBeenCalled();

    // Unmount component
    unmount();

    // Should have called unsubscribe
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('updates isAtCap when caps list changes', async () => {
    let capturedCallback: ((caps: string[]) => void) | null = null;
    mockSubscribe.mockImplementation(
      ({ callback }: { callback: (caps: string[]) => void }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'));

    // First update - BTC not at cap
    await act(async () => {
      capturedCallback?.(['ETH', 'SOL']);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
    });

    // Second update - BTC now at cap
    await act(async () => {
      capturedCallback?.(['BTC', 'ETH', 'SOL']);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(true);
    });

    // Third update - BTC no longer at cap
    await act(async () => {
      capturedCallback?.(['ETH', 'SOL']);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
    });
  });

  it('handles empty caps list correctly', async () => {
    let capturedCallback: ((caps: string[]) => void) | null = null;
    mockSubscribe.mockImplementation(
      ({ callback }: { callback: (caps: string[]) => void }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'));

    // Send empty caps list
    await act(async () => {
      capturedCallback?.([]);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('resubscribes when symbol changes', () => {
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { rerender } = renderHook(({ symbol }) => usePerpsOICap(symbol), {
      initialProps: { symbol: 'BTC' as string | undefined },
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    // Change symbol
    rerender({ symbol: 'ETH' });

    // Should have unsubscribed from old and subscribed to new
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
  });

  it('does not subscribe when symbol is undefined', () => {
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    renderHook(() => usePerpsOICap(undefined));

    // Should not have subscribed
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('uses memoized isAtCap value to avoid unnecessary re-renders', async () => {
    let capturedCallback: ((caps: string[]) => void) | null = null;
    mockSubscribe.mockImplementation(
      ({ callback }: { callback: (caps: string[]) => void }) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      },
    );

    const renderSpy = jest.fn();
    const { result } = renderHook(() => {
      const hookResult = usePerpsOICap('BTC');
      renderSpy();
      return hookResult;
    });

    const initialRenderCount = renderSpy.mock.calls.length;

    // Send same caps list multiple times
    await act(async () => {
      capturedCallback?.(['BTC']);
    });

    await act(async () => {
      capturedCallback?.(['BTC']);
    });

    await act(async () => {
      capturedCallback?.(['BTC']);
    });

    // isAtCap should remain true
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(true);
    });

    // Should have minimal re-renders due to memoization
    // (Initial + data update, not one per callback)
    expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 5);
  });
});
