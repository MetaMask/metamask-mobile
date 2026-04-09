import { renderHook, act } from '@testing-library/react-native';
import { usePredictTabs } from './usePredictTabs';

const mockRouteParams: { tab?: string } = {};

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

const mockHotTabFlag: { enabled: boolean; queryParams: string | undefined } = {
  enabled: false,
  queryParams: undefined,
};

jest.mock('react-redux', () => ({
  useSelector: () => mockHotTabFlag,
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('usePredictTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.tab = undefined;
    mockHotTabFlag.enabled = false;
    mockHotTabFlag.queryParams = undefined;
  });

  describe('tabs array', () => {
    it('returns base tabs when hot tab is disabled', () => {
      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.tabs).toHaveLength(6);
      expect(result.current.tabs[0].key).toBe('trending');
    });

    it('includes hot tab at beginning when enabled', () => {
      mockHotTabFlag.enabled = true;

      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.tabs).toHaveLength(7);
      expect(result.current.tabs[0].key).toBe('hot');
      expect(result.current.tabs[1].key).toBe('trending');
    });
  });

  describe('activeIndex', () => {
    it('defaults to 0 (trending) when no requested tab', () => {
      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(0);
    });

    it('sets active index to requested tab position', () => {
      mockRouteParams.tab = 'crypto';

      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(4);
    });

    it('defaults to trending for invalid requested tab', () => {
      mockRouteParams.tab = 'invalid';

      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(0);
    });

    it('updates when setActiveIndex is called', () => {
      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(0);

      act(() => {
        result.current.setActiveIndex(2);
      });

      expect(result.current.activeIndex).toBe(2);
    });
  });

  describe('initial tab with feature flag loading', () => {
    it('applies hot tab when flag loads and tab was requested', () => {
      mockRouteParams.tab = 'hot';
      mockHotTabFlag.enabled = false;

      const { result, rerender } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(0);

      mockHotTabFlag.enabled = true;
      rerender({});

      expect(result.current.activeIndex).toBe(0);
    });

    it('recalculates index when hot tab loads after deeplink', () => {
      mockRouteParams.tab = 'crypto';
      mockHotTabFlag.enabled = false;

      const { result, rerender } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(4);
      expect(result.current.tabs[4].key).toBe('crypto');

      mockHotTabFlag.enabled = true;
      rerender({});

      expect(result.current.tabs[5].key).toBe('crypto');
      expect(result.current.activeIndex).toBe(5);
    });

    it('recalculates index even after programmatic sync with same value', () => {
      mockRouteParams.tab = 'crypto';
      mockHotTabFlag.enabled = false;

      const { result, rerender } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(4);

      act(() => {
        result.current.setActiveIndex(4);
      });
      expect(result.current.activeIndex).toBe(4);

      mockHotTabFlag.enabled = true;
      rerender({});

      expect(result.current.activeIndex).toBe(5);
    });

    it('does not recalculate index after user manually changes tab', () => {
      mockRouteParams.tab = 'crypto';
      mockHotTabFlag.enabled = false;

      const { result, rerender } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(4);

      act(() => {
        result.current.setActiveIndex(0);
      });
      expect(result.current.activeIndex).toBe(0);

      mockHotTabFlag.enabled = true;
      rerender({});

      expect(result.current.activeIndex).toBe(0);
    });
  });

  describe('initialTabKey', () => {
    it('returns trending as default', () => {
      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.initialTabKey).toBe('trending');
    });

    it('returns requested tab when valid', () => {
      mockRouteParams.tab = 'sports';

      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.initialTabKey).toBe('sports');
    });

    it('remains stable across rerenders', () => {
      mockRouteParams.tab = 'crypto';

      const { result, rerender } = renderHook(() => usePredictTabs());

      const firstKey = result.current.initialTabKey;

      mockRouteParams.tab = 'sports';
      rerender({});

      expect(result.current.initialTabKey).toBe(firstKey);
    });
  });

  describe('hotTabQueryParams', () => {
    it('returns undefined when hot tab is disabled', () => {
      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.hotTabQueryParams).toBeUndefined();
    });

    it('returns query params when hot tab is enabled', () => {
      mockHotTabFlag.enabled = true;
      mockHotTabFlag.queryParams = 'test=value';

      const { result } = renderHook(() => usePredictTabs());

      expect(result.current.hotTabQueryParams).toBe('test=value');
    });
  });

  describe('deeplink navigation while on screen', () => {
    it('switches to new tab when route params change', () => {
      mockRouteParams.tab = 'trending';

      const { result, rerender } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(0);

      mockRouteParams.tab = 'crypto';
      rerender({});

      expect(result.current.activeIndex).toBe(4);
    });

    it('switches from manually selected tab to deeplink tab', () => {
      mockRouteParams.tab = undefined;

      const { result, rerender } = renderHook(() => usePredictTabs());

      act(() => {
        result.current.setActiveIndex(5);
      });
      expect(result.current.activeIndex).toBe(5);

      mockRouteParams.tab = 'sports';
      rerender({});

      expect(result.current.activeIndex).toBe(3);
    });

    it('does not change tab when route params stay the same', () => {
      mockRouteParams.tab = 'crypto';

      const { result, rerender } = renderHook(() => usePredictTabs());

      expect(result.current.activeIndex).toBe(4);

      act(() => {
        result.current.setActiveIndex(0);
      });
      expect(result.current.activeIndex).toBe(0);

      rerender({});

      expect(result.current.activeIndex).toBe(0);
    });
  });
});
