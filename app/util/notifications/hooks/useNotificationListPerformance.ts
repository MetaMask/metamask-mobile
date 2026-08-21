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
  const ttcTraceId = useRef('');
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);
  const prevIsLoading = useRef<boolean | undefined>(undefined);
  const sawFetchRef = useRef(false);
  const latestCountRef = useRef(notificationCount);
  latestCountRef.current = notificationCount;

  useEffect(() => {
    if (!enabled) return;

    ttcTraceId.current = uuidv4();
    ttcEnded.current = false;
    sawFetchRef.current = false;

    trace({
      name: TraceName.NotificationListTimeToContent,
      op: TraceOperation.NotificationPerformance,
      id: ttcTraceId.current,
    });
    ttcStarted.current = true;

    return () => {
      if (ttcStarted.current && !ttcEnded.current) {
        endTrace({
          name: TraceName.NotificationListTimeToContent,
          id: ttcTraceId.current,
          data: {
            success: false,
            reason: 'unmounted',
            notification_count: latestCountRef.current,
          },
        });
        ttcStarted.current = false;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const wasLoading = prevIsLoading.current;
    prevIsLoading.current = isLoading;

    if (wasLoading === true && !isLoading) {
      sawFetchRef.current = true;
    }

    if (!isLoading && ttcStarted.current && !ttcEnded.current) {
      const source =
        sawFetchRef.current || wasLoading === true ? 'cold' : 'warm';

      endTrace({
        name: TraceName.NotificationListTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: true,
          source,
          notification_count: notificationCount,
          content_state: notificationCount > 0 ? 'filled' : 'empty',
        },
      });
      ttcEnded.current = true;
    }
  }, [enabled, isLoading, notificationCount]);
}
