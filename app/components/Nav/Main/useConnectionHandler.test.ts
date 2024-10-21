import { renderHook, act } from '@testing-library/react-hooks';
import { useConnectionHandler } from '../../../util/navigation/useConnectionHandler';
import { MetaMetricsEvents } from '../../../components/hooks/useMetrics';

const mockTrackEvent = jest.fn();

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
  }),
  MetaMetricsEvents: {
    CONNECTION_DROPPED: 'CONNECTION_DROPPED',
    CONNECTION_RESTORED: 'CONNECTION_RESTORED',
  },
}));

describe('useConnectionHandler', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not navigate to OfflineModeView immediately when connection is lost', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: false });
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CONNECTION_DROPPED,
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
      MetaMetricsEvents.CONNECTION_DROPPED,
    );
  });

  it('should not navigate to OfflineModeView if connection is restored within timeout', () => {
    const { result } = renderHook(() => useConnectionHandler(mockNavigation));

    act(() => {
      result.current.connectionChangeHandler({ isConnected: false });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CONNECTION_DROPPED,
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
      MetaMetricsEvents.CONNECTION_RESTORED,
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
      MetaMetricsEvents.CONNECTION_DROPPED,
    );

    jest.advanceTimersByTime(2000);

    act(() => {
      result.current.connectionChangeHandler({ isConnected: true });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.CONNECTION_RESTORED,
    );

    jest.advanceTimersByTime(1000);

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });
});
