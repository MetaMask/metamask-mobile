import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { endTrace, trace, TraceName, TraceOperation } from '../../trace';

interface UseNotificationListPerformanceConfig {
  isLoading: boolean;
  notificationCount: number;
  enabled?: boolean;
}

/** Time-to-content trace for the notification list. `source: warm` = data in Redux on mount; `source: cold` = API fetch needed. */
export function useNotificationListPerformance({
  isLoading,
  notificationCount,
  enabled = true,
}: UseNotificationListPerformanceConfig) {
  // Non-null = trace active; cleared on end to serve as the "active" sentinel.
  const ttcTraceId = useRef<string | null>(null);
  const prevIsLoading = useRef<boolean | undefined>(undefined);
  const latestCountRef = useRef(notificationCount);
  latestCountRef.current = notificationCount;

  useEffect(() => {
    if (!enabled) return;

    prevIsLoading.current = undefined;
    ttcTraceId.current = uuidv4();
    trace({
      name: TraceName.NotificationListTimeToContent,
      op: TraceOperation.NotificationPerformance,
      id: ttcTraceId.current,
    });

    return () => {
      if (!ttcTraceId.current) return;
      endTrace({
        name: TraceName.NotificationListTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: false,
          reason: 'unmounted',
          notification_count: latestCountRef.current,
        },
      });
      ttcTraceId.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const wasLoading = prevIsLoading.current;
    prevIsLoading.current = isLoading;

    if (!isLoading && ttcTraceId.current) {
      const id = ttcTraceId.current;
      ttcTraceId.current = null;
      endTrace({
        name: TraceName.NotificationListTimeToContent,
        id,
        data: {
          success: true,
          source: wasLoading === true ? 'cold' : 'warm',
          notification_count: notificationCount,
          content_state: notificationCount > 0 ? 'filled' : 'empty',
        },
      });
    }
  }, [enabled, isLoading, notificationCount]);
}
