import { useFocusEffect } from '@react-navigation/native';
import { renderHook, act } from '@testing-library/react-hooks';
import useHomeSessionSummary from './useHomeSessionSummary';
import { MetaMetricsEvents } from '../../../../core/Analytics';

// --- @react-navigation/native mock ---
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;

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
const HomepageEntryPoints = {
  APP_OPENED: 'app_opened',
  HOME_TAB: 'home_tab',
  NAVIGATED_BACK: 'navigated_back',
} as const;

let mockGetViewedSectionCount = jest.fn(() => 3);
let mockNotifySectionViewed = jest.fn();

let mockShouldSkipSessionSummary = jest.fn(() => false);

let mockContextValue = {
  subscribeToScroll: jest.fn(() => jest.fn()),
  viewportHeight: 800,
  containerScreenY: 0,
  entryPoint: HomepageEntryPoints.APP_OPENED as string,
  visitId: 1,
  notifySectionViewed: mockNotifySectionViewed,
  getViewedSectionCount: mockGetViewedSectionCount,
  skipNextSessionSummary: jest.fn(),
  shouldSkipSessionSummary: mockShouldSkipSessionSummary,
};

jest.mock('../context/HomepageScrollContext', () => ({
  useHomepageScrollContext: () => mockContextValue,
  HomepageEntryPoints: {
    APP_OPENED: 'app_opened',
    HOME_TAB: 'home_tab',
    NAVIGATED_BACK: 'navigated_back',
  },
}));

// --- Helpers ---

/** Type for addProperties(firstArg) so mock.calls is safely indexable after toHaveBeenCalled(). */
type AddPropertiesCall = [Record<string, unknown>];

/**
 * Simulate useFocusEffect: call the callback (focus) and return a function
 * that invokes the cleanup (blur).
 */
const setupFocusBlur = () => {
  let blurCleanup: (() => void) | undefined;
  mockUseFocusEffect.mockImplementation((callback) => {
    blurCleanup = (callback as () => (() => void) | undefined)();
  });
  return {
    simulateBlur: () => blurCleanup?.(),
  };
};

describe('useHomeSessionSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetViewedSectionCount = jest.fn(() => 3);
    mockNotifySectionViewed = jest.fn();
    mockShouldSkipSessionSummary = jest.fn(() => false);
    mockContextValue = {
      subscribeToScroll: jest.fn(() => jest.fn()),
      viewportHeight: 800,
      containerScreenY: 0,
      entryPoint: HomepageEntryPoints.APP_OPENED,
      visitId: 1,
      notifySectionViewed: mockNotifySectionViewed,
      getViewedSectionCount: mockGetViewedSectionCount,
      skipNextSessionSummary: jest.fn(),
      shouldSkipSessionSummary: mockShouldSkipSessionSummary,
    };
  });

  describe('blur guard — visitId === 0', () => {
    it('does not fire when visitId is 0 (pre-focus state)', () => {
      mockContextValue = { ...mockContextValue, visitId: 0 };
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('skip via context — shouldSkipSessionSummary', () => {
    it('does not fire when shouldSkipSessionSummary returns true', () => {
      mockShouldSkipSessionSummary = jest.fn(() => true);
      mockContextValue = {
        ...mockContextValue,
        shouldSkipSessionSummary: mockShouldSkipSessionSummary,
      };
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockShouldSkipSessionSummary).toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires normally when shouldSkipSessionSummary returns false', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockShouldSkipSessionSummary).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('fires on blur only', () => {
    it('does not fire on focus — only fires when the blur cleanup runs', () => {
      // Track whether trackEvent is called during focus (render) phase
      let calledDuringFocus = false;
      mockUseFocusEffect.mockImplementation((callback) => {
        // Call the focus callback and check if track was called before blur
        (callback as () => void)();
        calledDuringFocus = mockTrackEvent.mock.calls.length > 0;
      });

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      expect(calledDuringFocus).toBe(false);
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires exactly once on blur', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('event properties', () => {
    it('uses the HOME_VIEWED MetaMetrics event', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HOME_VIEWED,
      );
    });

    it('fires with interaction_type: session_summary', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ interaction_type: 'session_summary' }),
      );
    });

    it('fires with location: home', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'home' }),
      );
    });

    it('uses getViewedSectionCount() for total_sections_viewed', () => {
      mockGetViewedSectionCount = jest.fn(() => 4);
      mockContextValue = {
        ...mockContextValue,
        getViewedSectionCount: mockGetViewedSectionCount,
      };
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ total_sections_viewed: 4 }),
      );
    });

    it('uses the totalSectionsLoaded prop for total_sections_loaded', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 3 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ total_sections_loaded: 3 }),
      );
    });

    it('uses the entry_point from context', () => {
      mockContextValue = {
        ...mockContextValue,
        entryPoint: HomepageEntryPoints.HOME_TAB,
      };
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ entry_point: HomepageEntryPoints.HOME_TAB }),
      );
    });

    it('includes a non-negative session_time (in seconds)', () => {
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalled();
      const calls = mockAddProperties.mock
        .calls as unknown as AddPropertiesCall[];
      const props = calls[0][0];
      expect(typeof props.session_time).toBe('number');
      expect(props.session_time).toBeGreaterThanOrEqual(0);
    });

    it('passes the built event to trackEvent', () => {
      const builtEvent = { builtEvent: true };
      mockBuild.mockReturnValue(builtEvent);
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 5 }));

      act(() => {
        simulateBlur();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(builtEvent);
    });

    it('fires with all required properties', () => {
      mockGetViewedSectionCount = jest.fn(() => 2);
      mockContextValue = {
        ...mockContextValue,
        entryPoint: HomepageEntryPoints.NAVIGATED_BACK,
        getViewedSectionCount: mockGetViewedSectionCount,
      };
      const { simulateBlur } = setupFocusBlur();

      renderHook(() => useHomeSessionSummary({ totalSectionsLoaded: 4 }));

      act(() => {
        simulateBlur();
      });

      expect(mockAddProperties).toHaveBeenCalled();
      const calls = mockAddProperties.mock
        .calls as unknown as AddPropertiesCall[];
      const props = calls[0][0];
      expect(props).toMatchObject({
        interaction_type: 'session_summary',
        location: 'home',
        total_sections_viewed: 2,
        total_sections_loaded: 4,
        entry_point: HomepageEntryPoints.NAVIGATED_BACK,
      });
      expect(typeof props.session_time).toBe('number');
    });
  });

  describe('session timer resets on new visit', () => {
    it('session_time reflects time since most recent visitId change', () => {
      jest.useFakeTimers();

      const { simulateBlur } = setupFocusBlur();
      let currentVisitId = 1;
      mockContextValue = { ...mockContextValue, visitId: currentVisitId };

      const { rerender } = renderHook(() =>
        useHomeSessionSummary({ totalSectionsLoaded: 5 }),
      );

      // Advance 10 seconds and blur — first visit
      jest.advanceTimersByTime(10_000);

      act(() => {
        simulateBlur();
      });

      const addPropertiesCalls = mockAddProperties.mock
        .calls as unknown as AddPropertiesCall[];
      const firstSessionTime = addPropertiesCalls[0][0].session_time as number;
      expect(firstSessionTime).toBeGreaterThanOrEqual(10);

      // Simulate new visit: visitId increments
      currentVisitId = 2;
      mockContextValue = { ...mockContextValue, visitId: currentVisitId };

      act(() => {
        rerender();
      });

      // Only 2 seconds into the new visit before blur
      jest.advanceTimersByTime(2_000);

      act(() => {
        simulateBlur();
      });

      const secondSessionTime = addPropertiesCalls[1][0].session_time as number;
      // Second visit was only ~2 s, not ~12 s
      expect(secondSessionTime).toBeLessThan(firstSessionTime);
      expect(secondSessionTime).toBeGreaterThanOrEqual(2);

      jest.useRealTimers();
    });
  });
});
