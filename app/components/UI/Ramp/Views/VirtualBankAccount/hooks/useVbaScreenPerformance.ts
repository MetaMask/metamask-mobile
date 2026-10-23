import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
} from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import DevLogger from '../../../../../../core/SDKConnect/utils/DevLogger';
import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../../../util/trace';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_END_REASON,
  VBA_SCREEN_FEATURE,
  VBA_SCREEN_LOG_MARKER,
  VBA_SCREEN_TAG,
  type VbaScreenContentState,
  type VbaScreenEndReason,
  type VbaScreenId,
} from '../vbaScreenPerformance';

interface UseVbaScreenPerformanceOptions {
  screenId: VbaScreenId;
  contentReady: boolean;
  contentState?: VbaScreenContentState;
  enabled?: boolean;
}

export function useVbaScreenPerformance({
  screenId,
  contentReady,
  contentState = VBA_SCREEN_CONTENT_STATE.POPULATED,
  enabled = true,
}: UseVbaScreenPerformanceOptions): void {
  const mountedRef = useRef(true);
  const traceIdRef = useRef<string | null>(null);
  const hasReachedContentRef = useRef(false);
  const startTagsRef = useRef<Record<string, TraceValue>>({});
  const contentReadyRef = useRef(contentReady);
  const contentStateRef = useRef(contentState);
  const enabledRef = useRef(enabled);

  contentReadyRef.current = contentReady;
  contentStateRef.current = contentState;
  enabledRef.current = enabled;

  const logSpan = useCallback(
    (phase: 'started' | 'completed', fields: Record<string, TraceValue>) => {
      DevLogger?.log?.(
        `${VBA_SCREEN_LOG_MARKER} ${TraceName.VbaScreenLoad} ${phase} ${JSON.stringify(
          fields,
        )}`,
      );
    },
    [],
  );

  const endActiveTrace = useCallback(
    (success: boolean, reason?: VbaScreenEndReason) => {
      const id = traceIdRef.current;
      if (!id) {
        return;
      }

      const data = {
        ...startTagsRef.current,
        [VBA_SCREEN_TAG.CONTENT_STATE]: contentStateRef.current,
        [VBA_SCREEN_TAG.SUCCESS]: success,
        ...(reason ? { [VBA_SCREEN_TAG.REASON]: reason } : {}),
      };
      logSpan('completed', data);
      endTrace({ name: TraceName.VbaScreenLoad, id, data });
      traceIdRef.current = null;
      if (success) {
        hasReachedContentRef.current = true;
      }
    },
    [logSpan],
  );

  const startScreenTrace = useCallback(() => {
    if (
      !enabledRef.current ||
      hasReachedContentRef.current ||
      traceIdRef.current
    ) {
      return;
    }

    const id = uuidv4();
    const tags = {
      [VBA_SCREEN_TAG.FEATURE]: VBA_SCREEN_FEATURE,
      [VBA_SCREEN_TAG.SCREEN_ID]: screenId,
    };
    traceIdRef.current = id;
    startTagsRef.current = tags;
    logSpan('started', tags);
    trace({
      name: TraceName.VbaScreenLoad,
      op: TraceOperation.VbaOperation,
      id,
      startTime: getPerformanceTimestamp(),
      forceTransaction: true,
      tags,
    });
  }, [logSpan, screenId]);

  useEffect(() => {
    mountedRef.current = true;
    if (AppState.currentState === 'active') {
      startScreenTrace();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        endActiveTrace(false, VBA_SCREEN_END_REASON.APP_BACKGROUNDED);
        return;
      }
      if (
        nextState === 'active' &&
        mountedRef.current &&
        enabledRef.current &&
        !hasReachedContentRef.current
      ) {
        startScreenTrace();
        if (contentReadyRef.current) {
          endActiveTrace(true);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
      endActiveTrace(false, VBA_SCREEN_END_REASON.UNMOUNTED);
    };
  }, [endActiveTrace, startScreenTrace]);

  useEffect(() => {
    if (!enabled) {
      endActiveTrace(false, VBA_SCREEN_END_REASON.DISABLED);
      return;
    }
    if (!hasReachedContentRef.current && AppState.currentState === 'active') {
      startScreenTrace();
    }
    if (contentReady && AppState.currentState !== 'background') {
      endActiveTrace(true);
    }
  }, [contentReady, contentState, enabled, endActiveTrace, startScreenTrace]);
}

export function withVbaScreenPerformance<Props extends object>(
  Component: ComponentType<Props>,
  screenId: VbaScreenId,
  contentState: VbaScreenContentState = VBA_SCREEN_CONTENT_STATE.POPULATED,
): ComponentType<Props> {
  function InstrumentedVbaScreen(props: Props) {
    useVbaScreenPerformance({
      screenId,
      contentReady: true,
      contentState,
    });
    return createElement(Component, props);
  }

  InstrumentedVbaScreen.displayName = `VbaScreenPerformance(${
    Component.displayName ?? Component.name
  })`;
  return InstrumentedVbaScreen;
}
