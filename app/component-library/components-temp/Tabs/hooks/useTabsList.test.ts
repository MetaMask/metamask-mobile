// Third party dependencies.
import { renderHook, act } from '@testing-library/react-hooks';
import { InteractionManager } from 'react-native';

// Internal dependencies.
import { useTabsList, BaseTabItem } from './useTabsList';

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  const interactionManager = {
    runAfterInteractions: jest.fn((callback) => {
      callback();
      return { cancel: jest.fn() };
    }),
  };
  return {
    __esModule: true,
    default: interactionManager,
    ...interactionManager,
  };
});

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: jest.fn(() => ({
      activeOffsetX: jest.fn().mockReturnThis(),
      failOffsetY: jest.fn().mockReturnThis(),
      maxPointers: jest.fn().mockReturnThis(),
      onEnd: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('react-native-reanimated', () => ({
  runOnJS: jest.fn((fn) => fn),
}));

const makeTabs = (
  count: number,
  overrides: Partial<BaseTabItem>[] = [],
): BaseTabItem[] =>
  Array.from({ length: count }, (_, i) => ({
    key: `tab-${i}`,
    content: null,
    isDisabled: false,
    ...overrides[i],
  }));

describe('useTabsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
      (callback) => {
        callback();
        return { cancel: jest.fn() };
      },
    );
  });

  describe('initialActiveIndex', () => {
    it('defaults to index 0 when initialActiveIndex is 0', () => {
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      expect(result.current.activeIndex).toBe(0);
    });

    it('respects a non-zero initialActiveIndex', () => {
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 2, onChangeTab: undefined }),
      );
      expect(result.current.activeIndex).toBe(2);
    });

    it('falls back to first enabled tab when initialActiveIndex is disabled', () => {
      const tabs = makeTabs(3, [{ isDisabled: true }]);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      expect(result.current.activeIndex).toBe(1);
    });

    it('returns -1 when all tabs are disabled', () => {
      const tabs = makeTabs(2, [{ isDisabled: true }, { isDisabled: true }]);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      expect(result.current.activeIndex).toBe(-1);
    });
  });

  describe('handleTabPress', () => {
    it('changes activeIndex when a valid tab is pressed', () => {
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      act(() => {
        result.current.handleTabPress(2);
      });
      expect(result.current.activeIndex).toBe(2);
    });

    it('calls onChangeTab with index and content ref when tab changes', () => {
      const tabs = makeTabs(3);
      const onChangeTab = jest.fn();
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab }),
      );
      act(() => {
        result.current.handleTabPress(1);
      });
      expect(onChangeTab).toHaveBeenCalledWith({ i: 1, ref: null });
    });

    it('does not call onChangeTab when pressing the already-active tab', () => {
      const tabs = makeTabs(3);
      const onChangeTab = jest.fn();
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab }),
      );
      act(() => {
        result.current.handleTabPress(0);
      });
      expect(onChangeTab).not.toHaveBeenCalled();
    });

    it('ignores press on a disabled tab', () => {
      const tabs = makeTabs(3, [{}, { isDisabled: true }]);
      const onChangeTab = jest.fn();
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab }),
      );
      act(() => {
        result.current.handleTabPress(1);
      });
      expect(result.current.activeIndex).toBe(0);
      expect(onChangeTab).not.toHaveBeenCalled();
    });

    it('ignores out-of-range index', () => {
      const tabs = makeTabs(2);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      act(() => {
        result.current.handleTabPress(99);
      });
      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('loadedTabs', () => {
    it('marks the initial tab as loaded via InteractionManager', () => {
      const tabs = makeTabs(2);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      expect(result.current.loadedTabs.has(0)).toBe(true);
    });

    it('marks a newly selected tab as loaded', () => {
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      act(() => {
        result.current.handleTabPress(2);
      });
      expect(result.current.loadedTabs.has(2)).toBe(true);
    });

    it('does not re-schedule InteractionManager for an already-loaded tab', () => {
      const mockRunAfter = InteractionManager.runAfterInteractions as jest.Mock;
      const tabs = makeTabs(2);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      // Tab 0 already loaded during mount
      const callsAfterMount = mockRunAfter.mock.calls.length;
      act(() => {
        result.current.handleTabPress(1);
      });
      act(() => {
        result.current.handleTabPress(0);
      });
      // Switching back to tab 0 should NOT trigger another runAfterInteractions
      expect(mockRunAfter.mock.calls.length).toBe(callsAfterMount + 1);
    });

    it('uses fallback timeout when InteractionManager does not fire', async () => {
      jest.useFakeTimers();
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: jest.fn() }),
      );
      try {
        const tabs = makeTabs(2);
        const { result } = renderHook(() =>
          useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
        );
        expect(result.current.loadedTabs.has(0)).toBe(false);
        act(() => {
          jest.advanceTimersByTime(250);
        });
        expect(result.current.loadedTabs.has(0)).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });

    it('cancels pending InteractionManager handle when switching tabs', () => {
      const mockCancel = jest.fn();
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation(
        () => ({ cancel: mockCancel }),
      );
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      act(() => {
        result.current.handleTabPress(2);
      });
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('key preservation on tabs change', () => {
    it('preserves active tab by key when tabs array grows', () => {
      const initialTabs = makeTabs(2);
      let tabs = initialTabs;
      const { result, rerender } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      act(() => {
        result.current.handleTabPress(1);
      });
      expect(result.current.activeIndex).toBe(1);

      tabs = [...initialTabs, { key: 'tab-2', content: null }];
      rerender();
      expect(result.current.activeIndex).toBe(1);
    });

    it('falls back to initialActiveIndex when active tab key is removed', () => {
      const initialTabs = makeTabs(2);
      let tabs = initialTabs;
      const { result, rerender } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      act(() => {
        result.current.handleTabPress(1);
      });
      // Remove the second tab
      tabs = [initialTabs[0]];
      rerender();
      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('swipeGesture', () => {
    it('returns a gesture object', () => {
      const tabs = makeTabs(3);
      const { result } = renderHook(() =>
        useTabsList({ tabs, initialActiveIndex: 0, onChangeTab: undefined }),
      );
      expect(result.current.swipeGesture).toBeDefined();
    });
  });
});
