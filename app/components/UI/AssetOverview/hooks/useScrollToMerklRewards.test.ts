import { renderHook, act, waitFor } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';
import { useScrollToMerklRewards } from './useScrollToMerklRewards';

// Mock DeviceEventEmitter
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    DeviceEventEmitter: {
      emit: jest.fn(),
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
  };
});

// Mock React Navigation
const mockSetParams = jest.fn();
const mockRoute = {
  params: {},
};

const mockUseFocusEffect = jest.fn((callback: () => void | (() => void)) => {
  // Call the callback immediately for testing
  const cleanup = callback();
  return cleanup;
});

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRoute,
  useNavigation: () => ({
    setParams: mockSetParams,
  }),
  useFocusEffect: mockUseFocusEffect,
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
  return 0;
});

// Mock setTimeout/clearTimeout for better control
jest.useFakeTimers();

describe('useScrollToMerklRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.params = {};
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('does not scroll when scrollToMerklRewards param is not present', () => {
    const merklRewardsYInHeaderRef = { current: 500 };
    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it('scrolls when scrollToMerklRewards param is true and Y position is available', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 500 };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // Fast-forward timers
    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(mockSetParams).toHaveBeenCalledWith({
        scrollToMerklRewards: undefined,
      });
    });

    // Wait for requestAnimationFrame and setTimeout
    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'scrollToMerklRewards',
        {
          y: 150, // 500 - 350
        },
      );
    });
  });

  it('retries scrolling when Y position is not available initially', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef: React.MutableRefObject<number | null> = {
      current: null,
    };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    // First retry - still null
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();

    // Set Y position after first retry
    merklRewardsYInHeaderRef.current = 600;

    // Second retry - should now scroll
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Wait for requestAnimationFrame and setTimeout
    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'scrollToMerklRewards',
        {
          y: 250, // 600 - 350
        },
      );
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
    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('calculates scroll offset correctly with padding', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 1000 };

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'scrollToMerklRewards',
        {
          y: 650, // 1000 - 350
        },
      );
    });
  });

  it('does not allow negative scroll offset', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 200 }; // Less than padding

    renderHook(() => useScrollToMerklRewards(merklRewardsYInHeaderRef));

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
        'scrollToMerklRewards',
        {
          y: 0, // Math.max(0, 200 - 350) = 0
        },
      );
    });
  });

  it('scrolls only once per navigation', async () => {
    mockRoute.params = { scrollToMerklRewards: true };
    const merklRewardsYInHeaderRef = { current: 500 };

    const { rerender } = renderHook(() =>
      useScrollToMerklRewards(merklRewardsYInHeaderRef),
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(DeviceEventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    // Clear the mock
    (DeviceEventEmitter.emit as jest.Mock).mockClear();

    // Rerender with same params - should not scroll again
    rerender(merklRewardsYInHeaderRef);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not emit again
    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
  });
});
