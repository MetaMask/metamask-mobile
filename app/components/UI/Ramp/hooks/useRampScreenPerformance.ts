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
} from '../../../../util/trace';
import {
  RAMP_SCREEN_CONTENT_STATE,
  type RampScreenContentState,
  type RampV2ScreenId,
} from '../constants/rampScreenPerformance';
import { getRampsBuyCufParentContext } from '../utils/rampsBuyCufTrace';

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
  const contentReadyRef = useRef(contentReady);
  const contentStateRef = useRef(contentState);
  const enabledRef = useRef(enabled);

  contentReadyRef.current = contentReady;
  contentStateRef.current = contentState;
  enabledRef.current = enabled;

  const endActiveTrace = useCallback(
    (
      success: boolean,
      reason?: 'unmounted' | 'app_backgrounded' | 'disabled',
    ) => {
      const id = traceIdRef.current;
      if (!id) {
        return;
      }
      endTrace({
        name: TraceName.RampScreenLoad,
        id,
        data: {
          screen_id: screenId,
          ramp_type: 'UNIFIED_BUY_2',
          content_state: contentStateRef.current,
          success,
          ...(reason ? { reason } : {}),
        },
      });
      traceIdRef.current = null;
    },
    [screenId],
  );

  const startScreenTrace = useCallback(() => {
    if (!enabledRef.current || traceIdRef.current) {
      return;
    }
    const id = uuidv4();
    traceIdRef.current = id;
    const parentContext = getRampsBuyCufParentContext();
    trace({
      name: TraceName.RampScreenLoad,
      // Sentry shows this as span.description. Keep TraceName as the key so
      // endTrace still matches, while the UI names the actual screen.
      description: `${TraceName.RampScreenLoad}: ${screenId}`,
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
      tags: {
        screen_id: screenId,
        ramp_type: 'UNIFIED_BUY_2',
      },
    });
  }, [screenId]);

  useEffect(() => {
    mountedRef.current = true;
    if (AppState.currentState === 'active') {
      startScreenTrace();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        endActiveTrace(false, 'app_backgrounded');
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
      endActiveTrace(false, 'unmounted');
    };
  }, [endActiveTrace, startScreenTrace]);

  useEffect(() => {
    if (!enabled) {
      endActiveTrace(false, 'disabled');
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
