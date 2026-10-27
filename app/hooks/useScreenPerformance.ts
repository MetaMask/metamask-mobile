import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
} from 'react';
import { AppState } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import DevLogger from '../core/SDKConnect/utils/DevLogger';
import {
  endTrace,
  getPerformanceTimestamp,
  trace,
  type TraceName,
  type TraceOperation,
  type TraceValue,
} from '../util/trace';

export const SCREEN_CONTENT_STATE = {
  POPULATED: 'populated',
  EMPTY: 'empty',
  ERROR: 'error',
} as const;

export type ScreenContentState =
  (typeof SCREEN_CONTENT_STATE)[keyof typeof SCREEN_CONTENT_STATE];

const SCREEN_END_REASON = {
  UNMOUNTED: 'unmounted',
  APP_BACKGROUNDED: 'app_backgrounded',
  DISABLED: 'disabled',
} as const;

type ScreenEndReason =
  (typeof SCREEN_END_REASON)[keyof typeof SCREEN_END_REASON];

const SCREEN_TAG = {
  FEATURE: 'feature',
  FLOW: 'flow',
  METRIC_TYPE: 'metric_type',
  SCREEN_ID: 'screen_id',
  CONTENT_STATE: 'content_state',
  SUCCESS: 'success',
  REASON: 'reason',
} as const;

const SCREEN_LOAD_METRIC_TYPE = 'screen_load';

export interface ScreenPerformanceConfig<ScreenId extends string = string> {
  traceName: TraceName;
  traceOperation: TraceOperation;
  feature: string;
  flow?: string;
  logMarker: string;
  screenIds: readonly ScreenId[];
  getAdditionalTags?: () => Record<string, TraceValue>;
}

interface UseScreenPerformanceOptions<ScreenId extends string> {
  config: ScreenPerformanceConfig<ScreenId>;
  screenId: NoInfer<ScreenId>;
  contentReady: boolean;
  contentState?: ScreenContentState;
  enabled?: boolean;
  resetKey?: string;
}

export function useScreenPerformance<ScreenId extends string>({
  config,
  screenId,
  contentReady,
  contentState = SCREEN_CONTENT_STATE.POPULATED,
  enabled = true,
  resetKey,
}: UseScreenPerformanceOptions<ScreenId>): void {
  const getAdditionalTags = config.getAdditionalTags;
  const mountedRef = useRef(true);
  const traceIdRef = useRef<string | null>(null);
  const hasReachedContentRef = useRef(false);
  const startTagsRef = useRef<Record<string, TraceValue>>({});
  const contentReadyRef = useRef(contentReady);
  const contentStateRef = useRef(contentState);
  const enabledRef = useRef(enabled);
  const resetKeyRef = useRef(resetKey);

  contentReadyRef.current = contentReady;
  contentStateRef.current = contentState;
  enabledRef.current = enabled;

  const logSpan = useCallback(
    (phase: 'started' | 'completed', fields: Record<string, TraceValue>) => {
      DevLogger?.log?.(
        `${config.logMarker} ${config.traceName} ${phase} ${JSON.stringify(
          fields,
        )}`,
      );
    },
    [config.logMarker, config.traceName],
  );

  const endActiveTrace = useCallback(
    (success: boolean, reason?: ScreenEndReason) => {
      const id = traceIdRef.current;
      if (!id) {
        return;
      }

      const data = {
        ...startTagsRef.current,
        [SCREEN_TAG.CONTENT_STATE]: contentStateRef.current,
        [SCREEN_TAG.SUCCESS]: success,
        ...(reason ? { [SCREEN_TAG.REASON]: reason } : {}),
      };
      logSpan('completed', data);
      endTrace({ name: config.traceName, id, data });
      traceIdRef.current = null;
      if (success) {
        hasReachedContentRef.current = true;
      }
    },
    [config.traceName, logSpan],
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
      ...getAdditionalTags?.(),
      [SCREEN_TAG.FEATURE]: config.feature,
      ...(config.flow ? { [SCREEN_TAG.FLOW]: config.flow } : {}),
      [SCREEN_TAG.METRIC_TYPE]: SCREEN_LOAD_METRIC_TYPE,
      [SCREEN_TAG.SCREEN_ID]: screenId,
    };
    traceIdRef.current = id;
    startTagsRef.current = tags;
    logSpan('started', tags);
    trace({
      name: config.traceName,
      op: config.traceOperation,
      id,
      startTime: getPerformanceTimestamp(),
      forceTransaction: true,
      tags,
    });
  }, [
    config.feature,
    config.flow,
    config.traceName,
    config.traceOperation,
    getAdditionalTags,
    logSpan,
    screenId,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    if (AppState.currentState === 'active') {
      startScreenTrace();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        endActiveTrace(false, SCREEN_END_REASON.APP_BACKGROUNDED);
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
      endActiveTrace(false, SCREEN_END_REASON.UNMOUNTED);
    };
  }, [endActiveTrace, startScreenTrace]);

  useEffect(() => {
    if (resetKeyRef.current === resetKey) {
      return;
    }

    endActiveTrace(false, SCREEN_END_REASON.DISABLED);
    hasReachedContentRef.current = false;
    resetKeyRef.current = resetKey;

    if (enabledRef.current && AppState.currentState === 'active') {
      startScreenTrace();
      if (contentReadyRef.current) {
        endActiveTrace(true);
      }
    }
  }, [endActiveTrace, resetKey, startScreenTrace]);

  useEffect(() => {
    if (!enabled) {
      endActiveTrace(false, SCREEN_END_REASON.DISABLED);
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

export function withScreenPerformance<
  Props extends object,
  ScreenId extends string,
>(
  Component: ComponentType<Props>,
  config: ScreenPerformanceConfig<ScreenId>,
  screenId: NoInfer<ScreenId>,
  contentState: ScreenContentState = SCREEN_CONTENT_STATE.POPULATED,
): ComponentType<Props> {
  function InstrumentedScreen(props: Props) {
    useScreenPerformance({
      config,
      screenId,
      contentReady: true,
      contentState,
    });
    return createElement(Component, props);
  }

  InstrumentedScreen.displayName = `ScreenPerformance(${
    Component.displayName ?? Component.name
  })`;
  return InstrumentedScreen;
}
