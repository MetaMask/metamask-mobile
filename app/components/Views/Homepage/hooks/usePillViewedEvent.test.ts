import { renderHook, act } from '@testing-library/react-hooks';
import usePillViewedEvent from './usePillViewedEvent';
import { MetaMetricsEvents } from '../../../../core/Analytics';

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

describe('usePillViewedEvent', () => {
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

  describe('event shape', () => {
    it('uses the HOME_VIEWED MetaMetrics event', () => {
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('crypto', 2);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HOME_VIEWED,
      );
    });

    it('fires with interaction_type: pill_tapped', () => {
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('crypto', 2);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ interaction_type: 'pill_tapped' }),
      );
    });

    it('fires with location: home', () => {
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('crypto', 2);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'home' }),
      );
    });

    it('maps pill id to section_name', () => {
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('perpetuals', 0);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ section_name: 'perps' }),
      );
    });

    it('includes position', () => {
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('stocks', 1);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ position: 1 }),
      );
    });

    it('includes entry_point from context', () => {
      mockContextValue = { ...mockContextValue, entryPoint: 'home_tab' };
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('predictions', 1);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ entry_point: 'home_tab' }),
      );
    });

    it('passes the built event to trackEvent', () => {
      const builtEvent = { builtEvent: true };
      mockBuild.mockReturnValue(builtEvent);
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('crypto', 3);
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
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped('predictions', 1);
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        interaction_type: 'pill_tapped',
        location: 'home',
        section_name: 'predict',
        position: 1,
        entry_point: 'navigated_back',
        app_session_id: 'full-props-session',
        visit_number: 3,
      });
    });
  });

  describe('section names', () => {
    it.each([
      ['perpetuals', 'perps'],
      ['predictions', 'predict'],
      ['stocks', 'stocks'],
      ['crypto', 'crypto'],
    ] as const)('maps %s to section_name %s', (pillId, sectionName) => {
      const { result } = renderHook(() => usePillViewedEvent());

      act(() => {
        result.current.trackPillTapped(pillId, 0);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({ section_name: sectionName }),
      );
    });
  });
});
