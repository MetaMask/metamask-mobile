import { renderHook, act } from '@testing-library/react-native';
import { usePredictSearch } from './usePredictSearch';

const mockRouteParams: { query?: string } = {};
const focusCallbacks: (() => void)[] = [];

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: mockRouteParams,
  }),
  useFocusEffect: (callback: () => void) => {
    focusCallbacks.push(callback);
  },
}));

const simulateFocus = () => {
  const lastCallback = focusCallbacks[focusCallbacks.length - 1];
  if (lastCallback) lastCallback();
};

describe('usePredictSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.query = undefined;
    focusCallbacks.length = 0;
  });

  describe('isSearchVisible', () => {
    it('defaults to false when no query param', () => {
      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.isSearchVisible).toBe(false);
    });

    it('defaults to true when query param is provided', () => {
      mockRouteParams.query = 'bitcoin';

      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.isSearchVisible).toBe(true);
    });
  });

  describe('searchQuery', () => {
    it('defaults to empty string when no query param', () => {
      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.searchQuery).toBe('');
    });

    it('initializes with query param value when provided', () => {
      mockRouteParams.query = 'ethereum';

      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.searchQuery).toBe('ethereum');
    });

    it('updates when setSearchQuery is called', () => {
      const { result } = renderHook(() => usePredictSearch());

      act(() => {
        result.current.setSearchQuery('bitcoin');
      });

      expect(result.current.searchQuery).toBe('bitcoin');
    });
  });

  describe('showSearch', () => {
    it('sets isSearchVisible to true', () => {
      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.isSearchVisible).toBe(false);

      act(() => {
        result.current.showSearch();
      });

      expect(result.current.isSearchVisible).toBe(true);
    });
  });

  describe('clearSearchAndClose', () => {
    it('clears search query and hides overlay', () => {
      mockRouteParams.query = 'bitcoin';

      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.isSearchVisible).toBe(true);
      expect(result.current.searchQuery).toBe('bitcoin');

      act(() => {
        result.current.clearSearchAndClose();
      });

      expect(result.current.isSearchVisible).toBe(false);
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('focus effect', () => {
    it('does not overwrite user-modified search on refocus with same query param', () => {
      mockRouteParams.query = 'bitcoin';

      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.searchQuery).toBe('bitcoin');

      act(() => {
        result.current.setSearchQuery('bitcoin ETF');
      });
      expect(result.current.searchQuery).toBe('bitcoin ETF');

      act(() => {
        simulateFocus();
      });

      expect(result.current.searchQuery).toBe('bitcoin ETF');
      expect(result.current.isSearchVisible).toBe(true);
    });

    it('does not reopen search on refocus when user closed it', () => {
      mockRouteParams.query = 'bitcoin';

      const { result } = renderHook(() => usePredictSearch());

      act(() => {
        result.current.clearSearchAndClose();
      });
      expect(result.current.isSearchVisible).toBe(false);

      act(() => {
        simulateFocus();
      });

      expect(result.current.isSearchVisible).toBe(false);
    });

    it('does not open search when no query on focus', () => {
      mockRouteParams.query = undefined;

      const { result } = renderHook(() => usePredictSearch());

      expect(result.current.isSearchVisible).toBe(false);

      act(() => {
        simulateFocus();
      });

      expect(result.current.isSearchVisible).toBe(false);
    });

    it('clears search state when navigating with query=undefined after previous query', () => {
      mockRouteParams.query = 'bitcoin';

      const { result, rerender } = renderHook(() => usePredictSearch());

      expect(result.current.isSearchVisible).toBe(true);
      expect(result.current.searchQuery).toBe('bitcoin');

      mockRouteParams.query = undefined;
      rerender({});

      act(() => {
        simulateFocus();
      });

      expect(result.current.isSearchVisible).toBe(false);
      expect(result.current.searchQuery).toBe('');
    });

    it('applies new query when deeplink query param changes', () => {
      mockRouteParams.query = 'bitcoin';

      const { result, rerender } = renderHook(() => usePredictSearch());

      expect(result.current.searchQuery).toBe('bitcoin');

      act(() => {
        result.current.setSearchQuery('bitcoin ETF');
      });
      expect(result.current.searchQuery).toBe('bitcoin ETF');

      mockRouteParams.query = 'ethereum';
      rerender({});

      act(() => {
        simulateFocus();
      });

      expect(result.current.searchQuery).toBe('ethereum');
      expect(result.current.isSearchVisible).toBe(true);
    });
  });
});
