import { renderHook } from '@testing-library/react-native';
import { endTrace, trace, TraceName, TraceOperation } from '../../trace';
import { useNotificationListPerformance } from './useNotificationListPerformance';

jest.mock('../../trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    NotificationListTimeToContent: 'Notification List Time To Content',
  },
  TraceOperation: {
    NotificationPerformance: 'notification.performance',
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-trace-id'),
}));

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

describe('useNotificationListPerformance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts the trace on mount without ending it while loading', () => {
    renderHook(() =>
      useNotificationListPerformance({
        isLoading: true,
        notificationCount: 0,
      }),
    );

    expect(mockTrace).toHaveBeenCalledTimes(1);
    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.NotificationListTimeToContent,
      op: TraceOperation.NotificationPerformance,
      id: 'test-trace-id',
    });
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('does not trace when disabled', () => {
    const { unmount } = renderHook(() =>
      useNotificationListPerformance({
        isLoading: false,
        notificationCount: 3,
        enabled: false,
      }),
    );
    unmount();

    expect(mockTrace).not.toHaveBeenCalled();
    expect(mockEndTrace).not.toHaveBeenCalled();
  });

  it('reports warm data when tracing is re-enabled after loading finishes', () => {
    const { rerender } = renderHook(
      ({ enabled, isLoading }: { enabled: boolean; isLoading: boolean }) =>
        useNotificationListPerformance({
          enabled,
          isLoading,
          notificationCount: 2,
        }),
      { initialProps: { enabled: true, isLoading: true } },
    );
    rerender({ enabled: false, isLoading: false });
    mockEndTrace.mockClear();

    rerender({ enabled: true, isLoading: false });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'warm' }),
      }),
    );
  });

  it('ends with source warm when data is already loaded on mount', () => {
    renderHook(() =>
      useNotificationListPerformance({
        isLoading: false,
        notificationCount: 5,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.NotificationListTimeToContent,
      id: 'test-trace-id',
      data: {
        success: true,
        source: 'warm',
        notification_count: 5,
        content_state: 'filled',
      },
    });
  });

  it('ends with source cold when loading resolves after mount', () => {
    const { rerender } = renderHook(
      ({
        isLoading,
        notificationCount,
      }: {
        isLoading: boolean;
        notificationCount: number;
      }) => useNotificationListPerformance({ isLoading, notificationCount }),
      { initialProps: { isLoading: true, notificationCount: 0 } },
    );

    expect(mockEndTrace).not.toHaveBeenCalled();

    rerender({ isLoading: false, notificationCount: 2 });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.NotificationListTimeToContent,
      id: 'test-trace-id',
      data: {
        success: true,
        source: 'cold',
        notification_count: 2,
        content_state: 'filled',
      },
    });
  });

  it('reports content_state empty when the loaded list has no notifications', () => {
    renderHook(() =>
      useNotificationListPerformance({
        isLoading: false,
        notificationCount: 0,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content_state: 'empty',
          notification_count: 0,
        }),
      }),
    );
  });

  it('ends with reason unmounted when loading never resolves', () => {
    const { rerender, unmount } = renderHook(
      ({
        isLoading,
        notificationCount,
      }: {
        isLoading: boolean;
        notificationCount: number;
      }) => useNotificationListPerformance({ isLoading, notificationCount }),
      { initialProps: { isLoading: true, notificationCount: 0 } },
    );

    // Count updates while still loading; cleanup must read the latest value,
    // not the one captured when the effect mounted.
    rerender({ isLoading: true, notificationCount: 4 });
    unmount();

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.NotificationListTimeToContent,
      id: 'test-trace-id',
      data: {
        success: false,
        reason: 'unmounted',
        notification_count: 4,
      },
    });
  });

  it('does not end again on unmount after the trace already completed', () => {
    const { unmount } = renderHook(() =>
      useNotificationListPerformance({
        isLoading: false,
        notificationCount: 1,
      }),
    );

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });
});
