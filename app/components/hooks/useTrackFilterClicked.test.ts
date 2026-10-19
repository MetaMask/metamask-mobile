import { renderHook } from '@testing-library/react-native';
import { useTrackFilterClicked } from './useTrackFilterClicked';
import {
  FilterLocation,
  FilterType,
} from '../../core/Analytics/events/filters';

const mockTrackEvent = jest.fn();

jest.mock('./useAnalytics/useAnalytics', () => {
  const { AnalyticsEventBuilder } = jest.requireActual(
    '../../util/analytics/AnalyticsEventBuilder',
  );

  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    }),
  };
});

describe('useTrackFilterClicked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fire until the returned tracker is called', () => {
    // Arrange / Act
    renderHook(() => useTrackFilterClicked());

    // Assert
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('emits "Filter Clicked" with the given properties', () => {
    // Arrange
    const { result } = renderHook(() => useTrackFilterClicked());

    // Act
    result.current({
      location: FilterLocation.Activity,
      filter_type: FilterType.Network,
      from_network: 'eip155:1',
      to_network: 'eip155:137',
    });

    // Assert
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0]).toMatchObject({
      name: 'Filter Clicked',
      properties: {
        location: 'activity',
        filter_type: 'network',
        from_network: 'eip155:1',
        to_network: 'eip155:137',
      },
    });
  });

  it('omits network properties the caller leaves out', () => {
    // Arrange
    const { result } = renderHook(() => useTrackFilterClicked());

    // Act
    result.current({
      location: FilterLocation.Activity,
      filter_type: FilterType.Network,
    });

    // Assert
    expect(mockTrackEvent.mock.calls[0][0].properties).toStrictEqual({
      location: 'activity',
      filter_type: 'network',
    });
  });

  it('returns a stable tracker across re-renders', () => {
    // Arrange
    const { result, rerender } = renderHook(() => useTrackFilterClicked());
    const first = result.current;

    // Act
    rerender({});

    // Assert
    expect(result.current).toBe(first);
  });
});
