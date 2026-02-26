import type { RefObject } from 'react';
import type { View } from 'react-native';
import { renderHook, act } from '@testing-library/react-hooks';
import useHomepageSectionViewedEvent, {
  HomepageSectionNames,
} from './useHomepageSectionViewedEvent';
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
let scrollSubscribers: (() => void)[] = [];
const mockSubscribeToScroll = jest.fn((callback: () => void) => {
  scrollSubscribers.push(callback);
  return () => {
    scrollSubscribers = scrollSubscribers.filter((cb) => cb !== callback);
  };
});

const HomepageEntryPointsValues = {
  APP_OPENED: 'app_opened',
  HOME_TAB: 'home_tab',
  NAVIGATED_BACK: 'navigated_back',
} as const;

let mockContextValue = {
  subscribeToScroll: mockSubscribeToScroll,
  viewportHeight: 800,
  containerScreenY: 0,
  entryPoint: HomepageEntryPointsValues.APP_OPENED as string,
  visitId: 0,
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
const triggerScroll = () => {
  scrollSubscribers.forEach((cb) => cb());
};

const createMockRef = (y: number, height: number): RefObject<View> =>
  ({
    current: {
      measureInWindow: jest.fn(
        (cb: (x: number, y: number, w: number, h: number) => void) =>
          cb(0, y, 300, height),
      ),
    },
  }) as unknown as RefObject<View>;

const defaultParams = {
  sectionRef: null as RefObject<View> | null,
  isLoading: false,
  sectionName: HomepageSectionNames.TOKENS,
  sectionIndex: 0,
  totalSectionsLoaded: 5,
  isEmpty: false,
  itemCount: 3,
};

describe('useHomepageSectionViewedEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scrollSubscribers = [];
    mockContextValue = {
      subscribeToScroll: mockSubscribeToScroll,
      viewportHeight: 800,
      containerScreenY: 0,
      entryPoint: HomepageEntryPointsValues.APP_OPENED,
      visitId: 1, // Use 1 as default so "event fires" tests pass; 0 = pre-focus, no fire
    };
  });

  describe('null sectionRef — non-rendered sections', () => {
    it('does not fire when visitId is 0 (pre-focus; avoids duplicate on first load)', () => {
      mockContextValue = { ...mockContextValue, visitId: 0 };
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          isLoading: false,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires immediately when sectionRef is null and not loading', () => {
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          isLoading: false,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire when sectionRef is null but still loading', () => {
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          isLoading: true,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires once loading finishes', () => {
      const { rerender } = renderHook(
        ({ isLoading }: { isLoading: boolean }) =>
          useHomepageSectionViewedEvent({
            ...defaultParams,
            sectionRef: null,
            isLoading,
          }),
        { initialProps: { isLoading: true } },
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();

      rerender({ isLoading: false });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('only fires once even after multiple re-renders with null ref', () => {
      const { rerender } = renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          isLoading: false,
        }),
      );

      rerender();
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('sectionIndex guard', () => {
    it('does not fire when sectionIndex is -1 (feature flag disabled)', () => {
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          isLoading: false,
          sectionIndex: -1,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not fire via scroll check when sectionIndex is -1', () => {
      const mockRef = createMockRef(0, 200); // fully visible
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
          sectionIndex: -1,
        }),
      );

      act(() => {
        triggerScroll();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('viewport visibility check', () => {
    it('fires on mount when section is fully in the viewport', () => {
      const mockRef = createMockRef(0, 200); // y=0, height=200 → 100% visible
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('fires on mount when section is exactly 50% visible', () => {
      // viewportHeight=800, y=700, height=200 → visiblePx=100 = height*0.5
      const mockRef = createMockRef(700, 200);
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire on mount when section is less than 50% visible', () => {
      // viewportHeight=800, y=750, height=200 → visiblePx=50 < 100
      const mockRef = createMockRef(750, 200);
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not fire when section is completely below the viewport', () => {
      // viewportHeight=800, y=800, height=200 → visiblePx=0
      const mockRef = createMockRef(800, 200);
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires on scroll when section scrolls into ≥50% visibility', () => {
      const mockRef = createMockRef(800, 200); // starts below viewport
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();

      // Scroll so section is now 50% visible
      const mockRefCurrent = (
        mockRef as unknown as {
          current: { measureInWindow: jest.Mock } | null;
        }
      ).current;
      const mockMeasureInWindow = mockRefCurrent?.measureInWindow as
        | jest.Mock
        | undefined;
      mockMeasureInWindow?.mockImplementationOnce(
        (cb: (x: number, y: number, w: number, h: number) => void) =>
          cb(0, 700, 300, 200),
      );

      act(() => {
        triggerScroll();
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire again on subsequent scrolls after already firing', () => {
      const mockRef = createMockRef(0, 200); // fully visible from mount
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      act(() => {
        triggerScroll();
      });
      act(() => {
        triggerScroll();
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not subscribe to scroll when viewportHeight is 0', () => {
      mockContextValue = { ...mockContextValue, viewportHeight: 0 };
      const mockRef = createMockRef(0, 200);

      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockSubscribeToScroll).not.toHaveBeenCalled();
    });

    it('does not fire when measureInWindow reports height of 0', () => {
      const mockRef = createMockRef(0, 0); // height=0 → guard exits early
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires for a section taller than the viewport when it covers ≥50% of the viewport', () => {
      // viewportHeight=800, height=2000 → threshold = min(1000, 400) = 400
      // y=0 → visiblePx = min(2000, 800) - 0 = 800 ≥ 400
      const mockRef = createMockRef(0, 2000);
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire for a tall section covering <50% of the viewport', () => {
      // viewportHeight=800, height=2000 → threshold = min(1000, 400) = 400
      // y=450 → visiblePx = min(2450, 800) - 450 = 350 < 400
      const mockRef = createMockRef(450, 2000);
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('visitId — re-firing on each homepage visit', () => {
    it('re-fires for null-ref sections when visitId increments', () => {
      let currentVisitId = 0;
      const { rerender } = renderHook(() => {
        mockContextValue = { ...mockContextValue, visitId: currentVisitId };
        return useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
        });
      });

      expect(mockTrackEvent).not.toHaveBeenCalled(); // visitId=0: pre-focus, no fire

      currentVisitId = 1;
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      currentVisitId = 2;
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('re-fires for visible sections when visitId increments', () => {
      const mockRef = createMockRef(0, 200);
      let currentVisitId = 0;
      const { rerender } = renderHook(() => {
        mockContextValue = { ...mockContextValue, visitId: currentVisitId };
        return useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        });
      });

      expect(mockTrackEvent).not.toHaveBeenCalled(); // visitId=0: pre-focus, no fire

      currentVisitId = 1;
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      currentVisitId = 2;
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('does not re-fire when visitId stays the same', () => {
      mockContextValue = { ...mockContextValue, visitId: 1 };
      const { rerender } = renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      rerender();
      rerender();

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('event properties', () => {
    it('fires with the correct MetaMetrics event', () => {
      renderHook(() =>
        useHomepageSectionViewedEvent({ ...defaultParams, sectionRef: null }),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HOMEPAGE_SECTION_VIEWED,
      );
    });

    it('includes all required properties', () => {
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          sectionName: HomepageSectionNames.DEFI,
          sectionIndex: 2,
          totalSectionsLoaded: 4,
          isEmpty: true,
          itemCount: 0,
        }),
      );

      expect(mockAddProperties).toHaveBeenCalledWith({
        interaction_type: 'section_viewed',
        location: 'home',
        name: HomepageSectionNames.DEFI,
        index: 2,
        total_sections_loaded: 4,
        is_empty: true,
        item_count: 0,
        entry_point: HomepageEntryPointsValues.APP_OPENED,
      });
    });

    it('uses the entry_point from context', () => {
      mockContextValue = {
        ...mockContextValue,
        entryPoint: HomepageEntryPointsValues.HOME_TAB,
      };

      renderHook(() =>
        useHomepageSectionViewedEvent({ ...defaultParams, sectionRef: null }),
      );

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          entry_point: HomepageEntryPointsValues.HOME_TAB,
        }),
      );
    });

    it('passes the built event to trackEvent', () => {
      const builtEvent = { builtEvent: true };
      mockBuild.mockReturnValue(builtEvent);

      renderHook(() =>
        useHomepageSectionViewedEvent({ ...defaultParams, sectionRef: null }),
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(builtEvent);
    });
  });

  describe('scroll subscription lifecycle', () => {
    it('subscribes to scroll when a sectionRef is provided', () => {
      const mockRef = createMockRef(800, 200); // below viewport so no immediate fire
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(mockSubscribeToScroll).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from scroll on unmount', () => {
      const mockRef = createMockRef(800, 200);
      const { unmount } = renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: mockRef,
        }),
      );

      expect(scrollSubscribers).toHaveLength(1);

      unmount();

      expect(scrollSubscribers).toHaveLength(0);
    });

    it('does not subscribe to scroll for null-ref sections', () => {
      renderHook(() =>
        useHomepageSectionViewedEvent({
          ...defaultParams,
          sectionRef: null,
          isLoading: false,
        }),
      );

      expect(mockSubscribeToScroll).not.toHaveBeenCalled();
    });
  });
});
