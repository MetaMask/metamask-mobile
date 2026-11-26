import { useEffect, useRef } from 'react';
import {
  cancelRecurringOrderTrace,
  finishRecurringOrderTrace,
  type RecurringOrderTraceHandle,
  type RecurringOrdersListType,
  startRecurringOrdersListTrace,
} from '../utils/recurringOrderTrace';

interface UseRecurringOrdersListTraceParams {
  enabled: boolean;
  listType: RecurringOrdersListType;
  hasNetworkFilter: boolean;
  isLoading: boolean;
  isError: boolean;
  resultCount: number;
}

export function useRecurringOrdersListTrace({
  enabled,
  listType,
  hasNetworkFilter,
  isLoading,
  isError,
  resultCount,
}: UseRecurringOrdersListTraceParams): void {
  const activeTraceRef = useRef<RecurringOrderTraceHandle | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const traceHandle = startRecurringOrdersListTrace({
      listType,
      hasNetworkFilter,
    });
    activeTraceRef.current = traceHandle;

    return (): void => {
      if (activeTraceRef.current?.id !== traceHandle.id) {
        return;
      }

      cancelRecurringOrderTrace(traceHandle);
      activeTraceRef.current = undefined;
    };
  }, [enabled, hasNetworkFilter, listType]);

  useEffect(() => {
    const traceHandle = activeTraceRef.current;
    if (!traceHandle || isLoading) {
      return;
    }

    finishRecurringOrderTrace(traceHandle, {
      result: isError ? 'error' : resultCount === 0 ? 'empty' : 'success',
      ...(isError ? {} : { resultCount }),
    });
    activeTraceRef.current = undefined;
  }, [hasNetworkFilter, isError, isLoading, listType, resultCount]);
}
