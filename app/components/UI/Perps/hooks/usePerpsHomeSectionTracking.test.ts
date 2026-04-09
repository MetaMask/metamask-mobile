import { renderHook, act } from '@testing-library/react-native';
import type { LayoutChangeEvent, NativeScrollEvent } from 'react-native';
import { usePerpsHomeSectionTracking } from './usePerpsHomeSectionTracking';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
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

jest.mock('../../../hooks/useAnalytics/useAnalytics');

describe('usePerpsHomeSectionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
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

  it('tracks section when scrolled into view', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout('explore_crypto')(
        createLayoutEvent(500, 200),
      );
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
        PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_EXPLORE_CRYPTO,
      [PERPS_EVENT_PROPERTY.LOCATION]:
        PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'built-event' });
  });

  it('does not duplicate tracking for already-tracked sections', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout('activity')(
        createLayoutEvent(300, 100),
      );
    });

    // First scroll triggers tracking
    act(() => {
      result.current.handleScroll(createScrollEvent(300, 200));
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    // Second scroll should not re-track
    act(() => {
      result.current.handleScroll(createScrollEvent(350, 200));
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not track section when not scrolled far enough', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout('explore_stocks')(
        createLayoutEvent(800, 200),
      );
    });

    // Viewport bottom = 0 + 200 = 200, which is far below threshold (800 + 40 = 840)
    act(() => {
      result.current.handleScroll(createScrollEvent(0, 200));
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('resets tracking so sections can be re-tracked', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout('explore_crypto')(
        createLayoutEvent(100, 100),
      );
    });

    // Track once
    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    // Reset
    act(() => {
      result.current.resetTracking();
    });

    // Should track again after reset
    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('maps explore_stocks section to correct source value', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout('explore_stocks')(
        createLayoutEvent(100, 100),
      );
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
          PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_EXPLORE_STOCKS,
      }),
    );
  });

  it('maps activity section to correct source value', () => {
    const { result } = renderHook(() => usePerpsHomeSectionTracking());

    act(() => {
      result.current.handleSectionLayout('activity')(
        createLayoutEvent(100, 100),
      );
    });

    act(() => {
      result.current.handleScroll(createScrollEvent(50, 200));
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SECTION_VIEWED]:
          PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_ACTIVITY,
      }),
    );
  });
});
