import { renderHook } from '@testing-library/react-native';
import { useActivityScreenViewed } from './useActivityScreenViewed';
import { ActivityTypeFilter } from '../types';
import {
  ActivityScreenEntryPoint,
  ActivityScreenInteractionType,
  ActivityScreenTabName,
} from '../../../../core/Analytics/events/activity';

const mockTrackEvent = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => {
  const { AnalyticsEventBuilder } = jest.requireActual(
    '../../../../util/analytics/AnalyticsEventBuilder',
  );

  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    }),
  };
});

const defaultParams = {
  enabled: true,
  isSettled: true,
  isEmpty: false,
  pendingCount: 0,
  typeFilter: ActivityTypeFilter.Transactions,
  networkFilter: null,
};

const lastEvent = () =>
  mockTrackEvent.mock.calls[mockTrackEvent.mock.calls.length - 1][0];

describe('useActivityScreenViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('event name', () => {
    it('emits "Activity Screen Viewed"', () => {
      // Arrange / Act
      renderHook(() => useActivityScreenViewed(defaultParams));

      // Assert
      expect(lastEvent().name).toBe('Activity Screen Viewed');
    });
  });

  describe('firing conditions', () => {
    it('does not fire when disabled, so embedded lists stay silent', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, enabled: false }),
      );

      // Assert
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not fire while the list is still loading', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, isSettled: false }),
      );

      // Assert
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires once the list settles', () => {
      // Arrange
      let isSettled = false;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, isSettled }),
      );

      // Act
      isSettled = true;
      rerender({});

      // Assert
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('fires at most once per mount when isSettled cycles', () => {
      // Arrange
      let isSettled = true;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, isSettled }),
      );

      // Act
      isSettled = false;
      rerender({});
      isSettled = true;
      rerender({});

      // Assert
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not re-fire when only the list contents change', () => {
      // Arrange
      let pendingCount = 0;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, pendingCount }),
      );

      // Act
      pendingCount = 4;
      rerender({});

      // Assert
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not re-fire when only the network filter changes', () => {
      // Arrange - the network filter is reported by Filter Clicked instead
      let networkFilter: `${string}:${string}`[] | null = null;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, networkFilter }),
      );

      // Act
      networkFilter = ['eip155:1'];
      rerender({});

      // Assert
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('fires again when the type filter changes', () => {
      // Arrange
      let typeFilter = ActivityTypeFilter.Transactions;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, typeFilter }),
      );

      // Act
      typeFilter = ActivityTypeFilter.Perps;
      rerender({});

      // Assert
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('does not re-fire when the type filter is re-set to the same value', () => {
      // Arrange
      const { rerender } = renderHook(() =>
        useActivityScreenViewed(defaultParams),
      );

      // Act
      rerender({});

      // Assert
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('navigation payload', () => {
    it('reports settled list state', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({
          ...defaultParams,
          isEmpty: false,
          pendingCount: 3,
        }),
      );

      // Assert
      expect(lastEvent().properties).toStrictEqual({
        interaction_type: ActivityScreenInteractionType.Navigation,
        is_empty: false,
        pending_transactions: 3,
      });
    });

    it('reports an empty list', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, isEmpty: true }),
      );

      // Assert
      expect(lastEvent().properties).toMatchObject({
        is_empty: true,
        pending_transactions: 0,
      });
    });

    it('includes entry_point when the entry point is attributable', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({
          ...defaultParams,
          entryPoint: ActivityScreenEntryPoint.BottomNavClick,
        }),
      );

      // Assert
      expect(lastEvent().properties.entry_point).toBe('bottom_nav_click');
    });

    it('omits entry_point when it is not attributable', () => {
      // Arrange / Act
      renderHook(() => useActivityScreenViewed(defaultParams));

      // Assert
      expect(lastEvent().properties).not.toHaveProperty('entry_point');
    });

    it('includes the selected network filter', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({
          ...defaultParams,
          networkFilter: ['eip155:1'],
        }),
      );

      // Assert
      expect(lastEvent().properties.network_filter).toStrictEqual(['eip155:1']);
    });

    it('omits network_filter when all networks are selected', () => {
      // Arrange / Act
      renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, networkFilter: null }),
      );

      // Assert
      expect(lastEvent().properties).not.toHaveProperty('network_filter');
    });

    it('omits tab_name, which only describes a filter switch', () => {
      // Arrange / Act
      renderHook(() => useActivityScreenViewed(defaultParams));

      // Assert
      expect(lastEvent().properties).not.toHaveProperty('tab_name');
    });
  });

  describe('filtered_tab payload', () => {
    it('reports the filter switched to, with settled list state', () => {
      // Arrange
      let typeFilter = ActivityTypeFilter.Transactions;
      let pendingCount = 3;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, typeFilter, pendingCount }),
      );

      // Act
      typeFilter = ActivityTypeFilter.Perps;
      pendingCount = 1;
      rerender({});

      // Assert
      expect(lastEvent().properties).toStrictEqual({
        interaction_type: ActivityScreenInteractionType.FilteredTab,
        is_empty: false,
        pending_transactions: 1,
        tab_name: ActivityScreenTabName.Perps,
      });
    });

    // Every UI bucket must map to a snake_case value the schema accepts.
    it.each([
      [ActivityTypeFilter.All, ActivityScreenTabName.All],
      [ActivityTypeFilter.Transactions, ActivityScreenTabName.Transactions],
      [ActivityTypeFilter.BuySell, ActivityScreenTabName.BuySell],
      [ActivityTypeFilter.Perps, ActivityScreenTabName.Perps],
      [ActivityTypeFilter.Predictions, ActivityScreenTabName.Predictions],
      [ActivityTypeFilter.MetamaskCard, ActivityScreenTabName.MetamaskCard],
    ])('maps the %s filter to tab_name %s', (typeFilter, tabName) => {
      // Arrange - seed with a different filter so switching to it fires
      const seed =
        typeFilter === ActivityTypeFilter.Transactions
          ? ActivityTypeFilter.Perps
          : ActivityTypeFilter.Transactions;
      let current = seed;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({ ...defaultParams, typeFilter: current }),
      );

      // Act
      current = typeFilter;
      rerender({});

      // Assert
      expect(lastEvent().properties.tab_name).toBe(tabName);
    });

    it('does not attribute an entry point to a filter switch', () => {
      // Arrange
      let typeFilter = ActivityTypeFilter.Transactions;
      const { rerender } = renderHook(() =>
        useActivityScreenViewed({
          ...defaultParams,
          typeFilter,
          entryPoint: ActivityScreenEntryPoint.BottomNavClick,
        }),
      );

      // Act
      typeFilter = ActivityTypeFilter.Perps;
      rerender({});

      // Assert
      expect(lastEvent().properties).not.toHaveProperty('entry_point');
    });
  });
});
