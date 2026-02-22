import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock the emit function from the utility module
const mockEmitScrollToMerklRewards = jest.fn();

jest.mock('./scrollToMerklRewardsUtils', () => ({
  SCROLL_PADDING: 350,
  MAX_RETRIES: 10,
  RETRY_DELAY_MS: 100,
  SCROLL_DELAY_MS: 150,
  emitScrollToMerklRewards: (...args: unknown[]) =>
    mockEmitScrollToMerklRewards(...args),
}));

// Mock React Navigation
const mockSetParams = jest.fn();
const mockRoute: { params: Record<string, unknown> } = {
  params: {},
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useRoute: () => mockRoute,
    useNavigation: () => ({
      setParams: (...args: unknown[]) => mockSetParams(...args),
    }),
    // Run focus effects as a normal effect during tests
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      }, []);
    },
  };
});

// Import after mocks
import { useScrollToMerklRewards } from './useScrollToMerklRewards';

describe('useScrollToMerklRewards', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockEmitScrollToMerklRewards.mockClear();
    mockSetParams.mockClear();
    mockRoute.params = {};
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not scroll when scrollToMerklRewards param is not present', () => {
    const merklRewardsYInHeaderRef = { current: 500 };
    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Run all timers to ensure any scheduled callbacks would execute
    act(() => {
      jest.runAllTimers();
    });

    expect(mockEmitScrollToMerklRewards).not.toHaveBeenCalled();
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it('scrolls when scrollToMerklRewards param is true and Y position is available', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 500 };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Wait for effect to run and setParams to be called
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalledWith({
        scrollToMerklRewards: undefined,
      });
    });

    // Advance timers to execute the setTimeout(150)
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockEmitScrollToMerklRewards).toHaveBeenCalledWith(150); // 500 - 350
  });

  it('retries scrolling when Y position is not available initially', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef: React.MutableRefObject<number | null> = {
      current: null,
    };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // First retry - still null
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockEmitScrollToMerklRewards).not.toHaveBeenCalled();

    // Set Y position after first retry
    merklRewardsYInHeaderRef.current = 600;

    // Second retry + scroll timeout
    act(() => {
      jest.advanceTimersByTime(100 + 150);
    });

    expect(mockEmitScrollToMerklRewards).toHaveBeenCalledWith(250); // 600 - 350
  });

  it('stops retrying after max retries', () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: null };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Fast-forward through all retries (10 retries * 100ms = 1000ms)
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    // Should not have emitted after max retries
    expect(mockEmitScrollToMerklRewards).not.toHaveBeenCalled();
  });

  it('subtracts padding from Y position when calculating scroll offset', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 1000 };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Advance timers to execute the scroll setTimeout(150)
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockEmitScrollToMerklRewards).toHaveBeenCalledWith(650); // 1000 - 350
  });

  it('does not allow negative scroll offset', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 200 }; // Less than padding

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Advance timers to execute the scroll setTimeout(150)
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockEmitScrollToMerklRewards).toHaveBeenCalledWith(0); // Math.max(0, 200 - 350) = 0
  });

  it('scrolls only once per navigation', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 500 };

    const { rerender } = renderHook(() =>
      useScrollToMerklRewards(merklRewardsYInHeaderRef),
    );

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Advance timers to execute the scroll setTimeout(150)
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockEmitScrollToMerklRewards).toHaveBeenCalledTimes(1);

    // Clear the mock
    mockEmitScrollToMerklRewards.mockClear();

    // Rerender with same params - should not scroll again
    rerender(merklRewardsYInHeaderRef);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not emit again
    expect(mockEmitScrollToMerklRewards).not.toHaveBeenCalled();
  });

  it('cancels pending scroll timeout on unmount', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 500 };

    const { unmount } = renderHook(() =>
      useScrollToMerklRewards(merklRewardsYInHeaderRef),
    );

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Unmount before scroll timeout fires (before 150ms)
    unmount();

    // Advance timers past the scroll delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should NOT have emitted because timeout was cancelled on unmount
    expect(mockEmitScrollToMerklRewards).not.toHaveBeenCalled();
  });

  it('cancels pending retry timeouts on unmount', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef: React.MutableRefObject<number | null> = {
      current: null,
    };

    const { unmount } = renderHook(() =>
      useScrollToMerklRewards(merklRewardsYInHeaderRef),
    );

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Advance to first retry
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Unmount during retry phase
    unmount();

    // Set Y position that would normally trigger scroll
    merklRewardsYInHeaderRef.current = 600;

    // Advance timers through all remaining retry attempts
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should NOT have emitted because retry timeouts were cancelled
    expect(mockEmitScrollToMerklRewards).not.toHaveBeenCalled();
  });
});
