import { renderHook, act } from '@testing-library/react-native';
import type { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { usePerpsHomeSectionTracking } from './usePerpsHomeSectionTracking';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ name: 'built-event' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
  build: mockBuild,
});
const mockImperativeTrack = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics');
jest.mock('./usePerpsEventTracking');

describe('usePerpsHomeSectionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
    jest.mocked(usePerpsEventTracking).mockReturnValue({
      track: mockImperativeTrack,
    } as unknown as ReturnType<typeof usePerpsEventTracking>);
  });

  const createLayoutEvent = (y: number, height: number): LayoutChangeEvent =>
    ({
      nativeEvent: { layout: { x: 0, y, width: 400, height } },
    }) as unknown as LayoutChangeEvent;

  const createScrollEvent = (
    scrollY: number,
    viewportHeight: number,
  ): { nativeEvent: NativeScrollEvent } =>
    ({
      nativeEvent: {
        contentOffset: { x: 0, y: scrollY },
        layoutMeasurement: { width: 400, height: viewportHeight },
        contentSize: { width: 400, height: 2000 },
        contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
        zoomScale: 1,
      },
    }) as { nativeEvent: NativeScrollEvent };

  it('fires slide PERPS_UI_INTERACTION when a section scrolls into view', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_CRYPTO,
      )(createLayoutEvent(500, 200));
    });

    // Scroll enough so viewport bottom reaches section top + 20% of height
    act(() => {
      result.current.handleScroll(createScrollEvent(400, 200));
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIDE,
      [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
        PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_CRYPTO,
      [PERPS_EVENT_PROPERTY.LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built-event' });
  });

  it('fires PERPS_SCREEN_VIEWED impression when a section scrolls into view', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
      )(createLayoutEvent(300, 200));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(200, 200));
    });

    expect(mockImperativeTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_SCREEN_VIEWED,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.PERPS_HOME,
        [PERPS_EVENT_PROPERTY.SECTION_NAME]:
          PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
        [PERPS_EVENT_PROPERTY.SECTION_INDEX]: expect.any(Number),
      }),
    );
  });

  it('computes section_index as 1 when only one section is registered', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.PRODUCTS,
      )(createLayoutEvent(100, 100));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });

    expect(mockImperativeTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_SCREEN_VIEWED,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SECTION_INDEX]: 1,
      }),
    );
  });

  it('computes section_index based on y-position rank among registered sections', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    // Register two sections — positions is above watchlist on screen
    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
      )(createLayoutEvent(100, 100));
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
      )(createLayoutEvent(300, 100));
    });

    // Scroll far enough to reveal both
    act(() => {
      result.current.handleScroll(createScrollEvent(0, 500));
    });

    // positions (y=100) should be index 1, watchlist (y=300) should be index 2
    const calls = mockImperativeTrack.mock.calls.filter(
      (c) => c[0] === MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    );
    const positionsCall = calls.find(
      (c) =>
        c[1][PERPS_EVENT_PROPERTY.SECTION_NAME] ===
        PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
    );
    const watchlistCall = calls.find(
      (c) =>
        c[1][PERPS_EVENT_PROPERTY.SECTION_NAME] ===
        PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
    );
    expect(positionsCall?.[1][PERPS_EVENT_PROPERTY.SECTION_INDEX]).toBe(1);
    expect(watchlistCall?.[1][PERPS_EVENT_PROPERTY.SECTION_INDEX]).toBe(2);
  });

  it('does not emit any events for a zero-height (empty) section', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
      )(createLayoutEvent(100, 0));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(0, 500));
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockImperativeTrack).not.toHaveBeenCalled();
  });

  it('excludes zero-height sections from section_index ranking', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    // Positions renders empty (height 0) above watchlist; it must not occupy an index slot
    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
      )(createLayoutEvent(100, 0));
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
      )(createLayoutEvent(300, 100));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(0, 500));
    });

    const calls = mockImperativeTrack.mock.calls.filter(
      (c) => c[0] === MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    );
    expect(
      calls.some(
        (c) =>
          c[1][PERPS_EVENT_PROPERTY.SECTION_NAME] ===
          PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
      ),
    ).toBe(false);
    const watchlistCall = calls.find(
      (c) =>
        c[1][PERPS_EVENT_PROPERTY.SECTION_NAME] ===
        PERPS_EVENT_VALUE.SECTION_NAME.WATCHLIST,
    );
    // Watchlist is the only registered section, so it ranks at index 1
    expect(watchlistCall?.[1][PERPS_EVENT_PROPERTY.SECTION_INDEX]).toBe(1);
  });

  it('removes a section from tracking when it collapses to zero height', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    // Section first renders with content, then collapses to empty
    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
      )(createLayoutEvent(100, 100));
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.POSITIONS,
      )(createLayoutEvent(100, 0));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(0, 500));
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockImperativeTrack).not.toHaveBeenCalled();
  });

  it('does not duplicate tracking for already-tracked sections', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.RECENT_ACTIVITY,
      )(createLayoutEvent(300, 100));
    });

    // First scroll triggers both events (slide + impression = 2 calls total)
    act(() => {
      result.current.handleScroll(createScrollEvent(300, 200));
    });
    const callsAfterFirst =
      mockTrackEvent.mock.calls.length + mockImperativeTrack.mock.calls.length;

    // Second scroll should not re-track
    act(() => {
      result.current.handleScroll(createScrollEvent(350, 200));
    });
    const callsAfterSecond =
      mockTrackEvent.mock.calls.length + mockImperativeTrack.mock.calls.length;
    expect(callsAfterSecond).toBe(callsAfterFirst);
  });

  it('does not track section when not scrolled far enough', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_STOCKS,
      )(createLayoutEvent(800, 200));
    });

    // Viewport bottom = 0 + 200 = 200, which is far below threshold (800 + 40 = 840)
    act(() => {
      result.current.handleScroll(createScrollEvent(0, 200));
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockImperativeTrack).not.toHaveBeenCalled();
  });

  it('resets tracking so sections can be re-tracked', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_CRYPTO,
      )(createLayoutEvent(100, 100));
    });

    // Track once (2 events: slide + impression)
    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });
    const firstBatchCalls = mockImperativeTrack.mock.calls.length;
    expect(firstBatchCalls).toBeGreaterThan(0);

    // Reset
    act(() => {
      result.current.resetTracking();
    });

    // Should track again after reset
    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });
    expect(mockImperativeTrack.mock.calls.length).toBe(firstBatchCalls * 2);
  });

  it('uses the stable section_name as the section_viewed value in the slide event', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.PRODUCTS,
      )(createLayoutEvent(100, 100));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
          PERPS_EVENT_VALUE.SECTION_NAME.PRODUCTS,
      }),
    );
  });

  it('uses the stable section_name for explore_stocks in the slide event', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_STOCKS,
      )(createLayoutEvent(100, 100));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
          PERPS_EVENT_VALUE.SECTION_NAME.EXPLORE_STOCKS,
      }),
    );
  });

  it('uses the stable section_name for recent_activity in the slide event', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout(
        PERPS_EVENT_VALUE.SECTION_NAME.RECENT_ACTIVITY,
      )(createLayoutEvent(100, 100));
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
          PERPS_EVENT_VALUE.SECTION_NAME.RECENT_ACTIVITY,
      }),
    );
  });
});
