import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useScrollToMerklRewards } from './useScrollToMerklRewards';

// Mock DeviceEventEmitter.emit
const mockEmit = jest.fn();

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    DeviceEventEmitter: {
      ...RN.DeviceEventEmitter,
      emit: mockEmit,
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => {
        // Call immediately - the setTimeout inside will be handled by fake timers
        callback();
      }),
    },
  };
});

// Mock React Navigation
const mockSetParams = jest.fn();
const mockRoute = {
  params: {},
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useRoute: () => mockRoute,
    useNavigation: () => ({
      setParams: mockSetParams,
    }),
    // Run focus effects as a normal effect during tests
    useFocusEffect: (effect: () => void | (() => void)) => {
      // Use useEffect with empty deps to run once on mount
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      }, []);
    },
  };
});

// Mock requestAnimationFrame to schedule callback with setTimeout
global.requestAnimationFrame = jest.fn((callback) => {
  // Schedule with setTimeout so it works with fake timers
  setTimeout(callback, 0);
  return 0;
});

// Mock setTimeout/clearTimeout for better control
jest.useFakeTimers();

describe('useScrollToMerklRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmit.mockClear();
    mockSetParams.mockClear();
    mockRoute.params = {};
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('does not scroll when scrollToMerklRewards param is not present', () => {
    const merklRewardsYInHeaderRef = { current: 500 };
    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    expect(mockEmit).not.toHaveBeenCalled();
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

    // Advance timers: first flush requestAnimationFrame (0ms), then setTimeout (150ms)
    act(() => {
      jest.advanceTimersByTime(1); // Execute requestAnimationFrame setTimeout
      jest.advanceTimersByTime(150); // Execute scroll setTimeout
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('scrollToMerklRewards', {
        y: 150, // 500 - 350
      });
    });
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

    expect(mockEmit).not.toHaveBeenCalled();

    // Set Y position after first retry
    merklRewardsYInHeaderRef.current = 600;

    // Second retry - should now scroll
    act(() => {
      jest.advanceTimersByTime(100); // Second retry delay
      jest.advanceTimersByTime(1); // Execute requestAnimationFrame
      jest.advanceTimersByTime(150); // Execute setTimeout
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('scrollToMerklRewards', {
        y: 250, // 600 - 350
      });
    });
  });

  it('stops retrying after max retries', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: null };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Fast-forward through all retries (10 retries * 100ms = 1000ms)
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    // Should not have emitted after max retries
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('calculates scroll offset correctly with padding', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 1000 };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Advance timers: first flush requestAnimationFrame (0ms), then setTimeout (150ms)
    act(() => {
      jest.advanceTimersByTime(1); // Execute requestAnimationFrame setTimeout
      jest.advanceTimersByTime(150); // Execute scroll setTimeout
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('scrollToMerklRewards', {
        y: 650, // 1000 - 350
      });
    });
  });

  it('does not allow negative scroll offset', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 200 }; // Less than padding

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Wait for effect to run
    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalled();
    });

    // Advance timers: first flush requestAnimationFrame (0ms), then setTimeout (150ms)
    act(() => {
      jest.advanceTimersByTime(1); // Execute requestAnimationFrame setTimeout
      jest.advanceTimersByTime(150); // Execute scroll setTimeout
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('scrollToMerklRewards', {
        y: 0, // Math.max(0, 200 - 350) = 0
      });
    });
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

    // Advance timers: first flush requestAnimationFrame (0ms), then setTimeout (150ms)
    act(() => {
      jest.advanceTimersByTime(1); // Execute requestAnimationFrame setTimeout
      jest.advanceTimersByTime(150); // Execute scroll setTimeout
    });

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledTimes(1);
    });

    // Clear the mock
    mockEmit.mockClear();

    // Rerender with same params - should not scroll again
    rerender(merklRewardsYInHeaderRef);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not emit again
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
