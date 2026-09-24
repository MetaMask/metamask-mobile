import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../util/trace';
import {
  RAMP_SCREEN_CONTENT_STATE,
  type RampScreenContentState,
  type RampV2ScreenId,
} from '../constants/rampScreenPerformance';
import {
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_TAG,
} from '../constants/rampsBuyCufTags';
import {
  buildRampsBuyCufStartTags,
  getRampsBuyCufParentContext,
  logRampsBuyCufSpan,
} from '../utils/rampsBuyCufTrace';
import { settleRampsBuyForegroundOnSpan } from '../utils/rampsBuyLifecycleContext';

type RampScreenLoadEndReason =
  | typeof RAMPS_BUY_CUF_END_REASON.UNMOUNTED
  | typeof RAMPS_BUY_CUF_END_REASON.APP_BACKGROUNDED
  | typeof RAMPS_BUY_CUF_END_REASON.DISABLED;

interface UseRampScreenPerformanceOptions {
  screenId: RampV2ScreenId;
  contentReady: boolean;
  contentState?: RampScreenContentState;
  enabled?: boolean;
}

/**
 * Measures a Unified Buy V2 route from mount/foreground to meaningful content.
 * Unfinished foreground-owned spans are cancelled on background or unmount.
 */
export function useRampScreenPerformance({
  screenId,
  contentReady,
  contentState = RAMP_SCREEN_CONTENT_STATE.POPULATED,
  enabled = true,
}: UseRampScreenPerformanceOptions): void {
  const [foregroundGeneration, setForegroundGeneration] = useState(0);
  const mountedRef = useRef(true);
  const traceIdRef = useRef<string | null>(null);
  const startTagsRef = useRef<Record<string, TraceValue>>({});
  const contentReadyRef = useRef(contentReady);
  const contentStateRef = useRef(contentState);
  const enabledRef = useRef(enabled);

  contentReadyRef.current = contentReady;
  contentStateRef.current = contentState;
  enabledRef.current = enabled;

  const endActiveTrace = useCallback(
    (success: boolean, reason?: RampScreenLoadEndReason) => {
      const id = traceIdRef.current;
      if (!id) {
        return;
      }
      // Replayed from the start rather than rebuilt, so a foreground that
      // settled to warm mid-span cannot overwrite the context this span
      // actually opened in.
      const data = {
        ...startTagsRef.current,
        [RAMPS_BUY_CUF_TAG.CONTENT_STATE]: contentStateRef.current,
        [RAMPS_BUY_CUF_TAG.SUCCESS]: success,
        ...(reason ? { [RAMPS_BUY_CUF_TAG.REASON]: reason } : {}),
      };
      logRampsBuyCufSpan('completed', TraceName.RampScreenLoad, data);
      endTrace({ name: TraceName.RampScreenLoad, id, data });
      traceIdRef.current = null;
      if (success) {
        settleRampsBuyForegroundOnSpan(TraceName.RampScreenLoad);
      }
    },
    [],
  );

  const startScreenTrace = useCallback(() => {
    if (!enabledRef.current || traceIdRef.current) {
      return;
    }
    const id = uuidv4();
    traceIdRef.current = id;
    const parentContext = getRampsBuyCufParentContext();
    const tags = buildRampsBuyCufStartTags({
      [RAMPS_BUY_CUF_TAG.SCREEN_ID]: screenId,
    });
    startTagsRef.current = tags;
    logRampsBuyCufSpan('started', TraceName.RampScreenLoad, tags);
    trace({
      name: TraceName.RampScreenLoad,
      op: TraceOperation.RampOperation,
      id,
      startTime: getPerformanceTimestamp(),
      parentContext,
      // Always its own transaction, never a child span. A child span is only
      // transmitted when its root ends, which for a Buy journey can be 30
      // minutes later and never at all if the app dies or the journey is
      // dropped. Forcing a transaction keeps traceId and parentSpanId, so the
      // screen still appears under the journey in the trace view.
      forceTransaction: true,
      tags,
    });
  }, [screenId]);

  useEffect(() => {
    mountedRef.current = true;
    if (AppState.currentState === 'active') {
      startScreenTrace();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        endActiveTrace(false, RAMPS_BUY_CUF_END_REASON.APP_BACKGROUNDED);
        return;
      }
      // A screen that already reached content has nothing left to measure, so
      // resuming it must not emit a near-zero sample that drags percentiles down.
      if (
        mountedRef.current &&
        enabledRef.current &&
        !contentReadyRef.current
      ) {
        startScreenTrace();
        setForegroundGeneration((generation) => generation + 1);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription?.remove();
      endActiveTrace(false, RAMPS_BUY_CUF_END_REASON.UNMOUNTED);
    };
  }, [endActiveTrace, startScreenTrace]);

  useEffect(() => {
    if (!enabled) {
      endActiveTrace(false, RAMPS_BUY_CUF_END_REASON.DISABLED);
      return;
    }
    if (contentReady && AppState.currentState === 'active') {
      endActiveTrace(true);
    }
  }, [
    contentReady,
    contentState,
    enabled,
    foregroundGeneration,
    screenId,
    endActiveTrace,
  ]);
}

/** Instruments routes whose required data and controls are available on mount. */
export function withRampScreenPerformance<Props extends object>(
  Component: ComponentType<Props>,
  screenId: RampV2ScreenId,
): ComponentType<Props> {
  function InstrumentedRampScreen(props: Props) {
    useRampScreenPerformance({ screenId, contentReady: true });
    return createElement(Component, props);
  }

  InstrumentedRampScreen.displayName = `RampScreenPerformance(${
    Component.displayName ?? Component.name
  })`;
  return InstrumentedRampScreen;
}
