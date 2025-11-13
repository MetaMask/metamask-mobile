import { renderHook, act } from '@testing-library/react-hooks';
import { useSharedScrollCoordinator } from './useSharedScrollCoordinator';
import type { PredictCategory } from '../types';

jest.mock('react-native-reanimated', () => {
  const actualReanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actualReanimated,
    useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
    useAnimatedScrollHandler: jest.fn((handlers) => handlers),
    runOnJS: jest.fn((fn) => fn),
  };
});

describe('useSharedScrollCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      expect(result.current.balanceCardOffset).toBeDefined();
      expect(result.current.balanceCardHeight).toBeDefined();
      expect(result.current.balanceCardOffset.value).toBe(0);
      expect(result.current.balanceCardHeight.value).toBe(0);
    });

    it('provides all required methods', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      expect(typeof result.current.setBalanceCardHeight).toBe('function');
      expect(typeof result.current.setCurrentCategory).toBe('function');
      expect(typeof result.current.getTabScrollPosition).toBe('function');
      expect(typeof result.current.setTabScrollPosition).toBe('function');
      expect(typeof result.current.getScrollHandler).toBe('function');
      expect(typeof result.current.isBalanceCardHidden).toBe('function');
      expect(typeof result.current.updateBalanceCardHiddenState).toBe(
        'function',
      );
    });
  });

  describe('setBalanceCardHeight', () => {
    it('updates balance card height', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      act(() => {
        result.current.setBalanceCardHeight(150);
      });

      expect(result.current.balanceCardHeight.value).toBe(150);
    });

    it('updates with different height values', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      act(() => {
        result.current.setBalanceCardHeight(200);
      });
      expect(result.current.balanceCardHeight.value).toBe(200);

      act(() => {
        result.current.setBalanceCardHeight(100);
      });
      expect(result.current.balanceCardHeight.value).toBe(100);
    });
  });

  describe('tab scroll position management', () => {
    it('returns 0 for uninitialized tab position', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      const position = result.current.getTabScrollPosition('trending');

      expect(position).toBe(0);
    });

    it('stores and retrieves tab scroll position', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      act(() => {
        result.current.setTabScrollPosition('trending', 100);
      });

      const position = result.current.getTabScrollPosition('trending');
      expect(position).toBe(100);
    });

    it('manages independent positions for different tabs', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      act(() => {
        result.current.setTabScrollPosition('trending', 50);
        result.current.setTabScrollPosition('new', 100);
        result.current.setTabScrollPosition('sports', 150);
      });

      expect(result.current.getTabScrollPosition('trending')).toBe(50);
      expect(result.current.getTabScrollPosition('new')).toBe(100);
      expect(result.current.getTabScrollPosition('sports')).toBe(150);
    });

    it('updates existing tab position', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      act(() => {
        result.current.setTabScrollPosition('crypto', 200);
      });
      expect(result.current.getTabScrollPosition('crypto')).toBe(200);

      act(() => {
        result.current.setTabScrollPosition('crypto', 300);
      });
      expect(result.current.getTabScrollPosition('crypto')).toBe(300);
    });
  });

  describe('getScrollHandler', () => {
    it('returns scroll handler for each category', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      const trendingHandler = result.current.getScrollHandler('trending');
      const newHandler = result.current.getScrollHandler('new');
      const sportsHandler = result.current.getScrollHandler('sports');
      const cryptoHandler = result.current.getScrollHandler('crypto');
      const politicsHandler = result.current.getScrollHandler('politics');

      expect(trendingHandler).toBeDefined();
      expect(newHandler).toBeDefined();
      expect(sportsHandler).toBeDefined();
      expect(cryptoHandler).toBeDefined();
      expect(politicsHandler).toBeDefined();
    });

    it('returns trending handler for unknown category', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      const unknownHandler = result.current.getScrollHandler(
        'unknown' as PredictCategory,
      );
      const trendingHandler = result.current.getScrollHandler('trending');

      expect(unknownHandler).toBe(trendingHandler);
    });

    it('returns consistent handler for same category', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      const handler1 = result.current.getScrollHandler('new');
      const handler2 = result.current.getScrollHandler('new');

      expect(handler1).toBe(handler2);
    });
  });

  describe('setCurrentCategory', () => {
    it('does not throw error when called', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      expect(() => {
        act(() => {
          result.current.setCurrentCategory('trending');
        });
      }).not.toThrow();
    });

    it('handles all valid categories', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());
      const categories = [
        'trending',
        'new',
        'sports',
        'crypto',
        'politics',
      ] as const;

      categories.forEach((category) => {
        expect(() => {
          act(() => {
            result.current.setCurrentCategory(category);
          });
        }).not.toThrow();
      });
    });
  });

  describe('isBalanceCardHidden', () => {
    it('returns false initially', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      expect(result.current.isBalanceCardHidden()).toBe(false);
    });

    it('returns boolean value', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      const hidden = result.current.isBalanceCardHidden();

      expect(typeof hidden).toBe('boolean');
    });
  });

  describe('updateBalanceCardHiddenState', () => {
    it('does not throw error when called', () => {
      const { result } = renderHook(() => useSharedScrollCoordinator());

      expect(() => {
        act(() => {
          result.current.updateBalanceCardHiddenState(true);
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.updateBalanceCardHiddenState(false);
        });
      }).not.toThrow();
    });
  });

  describe('hook stability', () => {
    it('maintains function references across renders', () => {
      const { result, rerender } = renderHook(() =>
        useSharedScrollCoordinator(),
      );

      const initialGetPosition = result.current.getTabScrollPosition;
      const initialSetPosition = result.current.setTabScrollPosition;
      const initialGetHandler = result.current.getScrollHandler;

      rerender();

      expect(result.current.getTabScrollPosition).toBe(initialGetPosition);
      expect(result.current.setTabScrollPosition).toBe(initialSetPosition);
      expect(result.current.getScrollHandler).toBe(initialGetHandler);
    });

    it('provides consistent API across multiple renders', () => {
      const { result, rerender } = renderHook(() =>
        useSharedScrollCoordinator(),
      );

      expect(typeof result.current.setBalanceCardHeight).toBe('function');
      rerender();
      expect(typeof result.current.setBalanceCardHeight).toBe('function');
    });
  });
});
