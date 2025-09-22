import { renderHook, act } from '@testing-library/react-hooks';
import { useConnectionHandler } from './useConnectionHandler';
import { MetaMetricsEvents } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../components/hooks/useMetrics';
import mockedDefaultUseMetrics from '../../components/hooks/useMetrics/__mocks__/useMetrics';

const mockTrackEvent = jest.fn();

jest.mock('../../components/hooks/useMetrics');
const mockUseMetrics = jest.mocked(useMetrics);
mockUseMetrics.mockReturnValue({
  ...mockedDefaultUseMetrics(),
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
});

describe('useConnectionHandler', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('should not navigate to OfflineModeView immediately when connection is lost', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: false });
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CONNECTION_DROPPED,
      ).build(),
    );
  });

  it('should navigate to OfflineModeView after sustained offline period', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: false });
    });

    jest.advanceTimersByTime(3000);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('OfflineModeView');
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CONNECTION_DROPPED,
      ).build(),
    );
  });

  it('should not navigate to OfflineModeView if connection is restored within timeout', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: false });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CONNECTION_DROPPED,
      ).build(),
    );

    jest.advanceTimersByTime(1000);

    act(() => {
      result.current.connectionChangeHandler({ isConnected: true });
    });

    jest.advanceTimersByTime(2000);

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenNthCalledWith(
      2,
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CONNECTION_RESTORED,
      ).build(),
    );
  });

  it('should do nothing if state is null', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler(null);
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should not track events if connection state does not change', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: true });
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();

    act(() => {
      result.current.connectionChangeHandler({ isConnected: true });
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should clear timeout if connection is restored before navigation', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: false });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CONNECTION_DROPPED,
      ).build(),
    );

    jest.advanceTimersByTime(2000);

    act(() => {
      result.current.connectionChangeHandler({ isConnected: true });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CONNECTION_RESTORED,
      ).build(),
    );

    jest.advanceTimersByTime(1000);

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });
});
