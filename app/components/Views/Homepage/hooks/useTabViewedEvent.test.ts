import { renderHook, act } from '@testing-library/react-hooks';
import useTabViewedEvent, { HomeTabNames } from './useTabViewedEvent';
import { MetaMetricsEvents } from '../../../../core/Analytics';

// --- Analytics mock ---
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ builtEvent: true }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// --- Scroll context mock ---
let mockContextValue = {
  subscribeToScroll: jest.fn(() => jest.fn()),
  viewportHeight: 800,
  containerScreenY: 0,
  entryPoint: 'app_opened',
  visitId: 1,
  notifySectionViewed: jest.fn(),
  getViewedSectionCount: jest.fn(() => 0),
  getVisitMaxDepth: jest.fn(() => -1),
  appSessionId: 'test-session-id',
};

jest.mock('../context/HomepageScrollContext', () => ({
  useHomepageScrollContext: () => mockContextValue,
}));

describe('useTabViewedEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = {
      subscribeToScroll: jest.fn(() => jest.fn()),
      viewportHeight: 800,
      containerScreenY: 0,
      entryPoint: 'app_opened',
      visitId: 1,
      notifySectionViewed: jest.fn(),
      getViewedSectionCount: jest.fn(() => 0),
      getVisitMaxDepth: jest.fn(() => -1),
      appSessionId: 'test-session-id',
    };
  });

  describe('visitId guard', () => {
    it('does not fire when visitId is 0', () => {
      mockContextValue = { ...mockContextValue, visitId: 0 };
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires when visitId is 1', () => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('event shape', () => {
    it('uses the HOME_VIEWED MetaMetrics event', () => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HOME_VIEWED,
      );
    });

    it('fires with interaction_type: tab_viewed', () => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ interaction_type: 'tab_viewed' }),
      );
    });

    it('fires with location: home', () => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'home' }),
      );
    });

    it('includes the tab name in the event', () => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PERPETUALS);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ name: HomeTabNames.PERPETUALS }),
      );
    });

    it('includes entry_point from context', () => {
      mockContextValue = { ...mockContextValue, entryPoint: 'home_tab' };
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ entry_point: 'home_tab' }),
      );
    });

    it('includes app_session_id from context', () => {
      mockContextValue = { ...mockContextValue, appSessionId: 'abc-123' };
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ app_session_id: 'abc-123' }),
      );
    });

    it('includes visit_number equal to visitId', () => {
      mockContextValue = { ...mockContextValue, visitId: 5 };
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ visit_number: 5 }),
      );
    });

    it('passes the built event to trackEvent', () => {
      const builtEvent = { builtEvent: true };
      mockBuild.mockReturnValue(builtEvent);
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(builtEvent);
    });

    it('fires with all required properties', () => {
      mockContextValue = {
        ...mockContextValue,
        entryPoint: 'navigated_back',
        appSessionId: 'full-props-session',
        visitId: 3,
      };
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PREDICTIONS);
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        interaction_type: 'tab_viewed',
        location: 'home',
        name: HomeTabNames.PREDICTIONS,
        entry_point: 'navigated_back',
        app_session_id: 'full-props-session',
        visit_number: 3,
      });
    });
  });

  describe('tab names', () => {
    it.each([
      [HomeTabNames.PORTFOLIO],
      [HomeTabNames.PERPETUALS],
      [HomeTabNames.PREDICTIONS],
    ])('fires with name: %s', (tabName) => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(tabName);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ name: tabName }),
      );
    });
  });

  describe('ref-based context reads', () => {
    it('uses the latest context values at call time, not render time', () => {
      const { result, rerender } = renderHook(() => useTabViewedEvent());

      // Update context after initial render
      mockContextValue = {
        ...mockContextValue,
        entryPoint: 'navigated_back',
        appSessionId: 'updated-session',
        visitId: 7,
      };

      act(() => {
        rerender();
      });

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          entry_point: 'navigated_back',
          app_session_id: 'updated-session',
          visit_number: 7,
        }),
      );
    });

    it('respects visitId=0 guard even when visitId changes to 0 after render', () => {
      const { result, rerender } = renderHook(() => useTabViewedEvent());

      // Drop visitId to 0 after initial render
      mockContextValue = { ...mockContextValue, visitId: 0 };

      act(() => {
        rerender();
      });

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('multiple calls', () => {
    it('fires a separate event for each trackTabViewed call', () => {
      const { result } = renderHook(() => useTabViewedEvent());

      act(() => {
        result.current.trackTabViewed(HomeTabNames.PORTFOLIO);
        result.current.trackTabViewed(HomeTabNames.PERPETUALS);
        result.current.trackTabViewed(HomeTabNames.PREDICTIONS);
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(3);
    });
  });
});
