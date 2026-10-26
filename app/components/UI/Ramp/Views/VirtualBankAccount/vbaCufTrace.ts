import { AppState, type AppStateStatus } from 'react-native';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  endTrace,
  getPerformanceTimestamp,
  setTraceMeasurement,
  trace,
  TraceName,
  TraceOperation,
  type TraceContext,
  type TraceValue,
} from '../../../../../util/trace';
import {
  getVbaCufLifecycleContext,
  settleVbaCufLifecycleContext,
} from './vbaCufLifecycle';
import {
  VBA_CUF_END_REASON,
  VBA_CUF_FEATURE,
  VBA_CUF_FLOW,
  VBA_CUF_FOREGROUND_ACTIVE_MS,
  VBA_CUF_LOG_MARKER,
  VBA_CUF_TAG,
  VBA_CUF_TIMEOUT_MS,
  VBA_CUF_TRACE_MAX_LIFETIME_MS,
  type VbaCufEndReason,
  type VbaCufEntrySurface,
} from './vbaCufTags';

export type VbaCufChildTraceName =
  | TraceName.VbaHydrate
  | TraceName.VbaAutorampSetup
  | TraceName.VbaPixFetch;

let journeyId: string | null = null;
let journeySpan: TraceContext;
let journeyTimeout: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;
let currentAppState: AppStateStatus = AppState.currentState;
let foregroundSegmentStartedAt: number | null = null;
let foregroundActiveMs = 0;
let backgroundCount = 0;
let resumeCount = 0;
let isBackgrounded = false;
let operationCounter = 0;
const openChildren = new Map<string, VbaCufChildTraceName>();

const nextOperationId = (name: TraceName): string => {
  operationCounter += 1;
  return `${name}#${operationCounter}`;
};

const buildStartTags = (
  entrySurface?: VbaCufEntrySurface,
): Record<string, TraceValue> => ({
  [VBA_CUF_TAG.FEATURE]: VBA_CUF_FEATURE,
  [VBA_CUF_TAG.FLOW]: VBA_CUF_FLOW,
  [VBA_CUF_TAG.LIFECYCLE_CONTEXT]: getVbaCufLifecycleContext(),
  ...(entrySurface ? { [VBA_CUF_TAG.ENTRY_SURFACE]: entrySurface } : undefined),
});

const logSpan = (
  phase: 'started' | 'completed',
  name: TraceName,
  fields: Record<string, TraceValue>,
): void => {
  DevLogger?.log?.(
    `${VBA_CUF_LOG_MARKER} ${name} ${phase} ${JSON.stringify(fields)}`,
  );
};

const pauseForegroundSegment = (
  timestamp = getPerformanceTimestamp(),
): void => {
  if (foregroundSegmentStartedAt === null) {
    return;
  }
  foregroundActiveMs += Math.max(0, timestamp - foregroundSegmentStartedAt);
  foregroundSegmentStartedAt = null;
};

const startForegroundSegment = (
  timestamp = getPerformanceTimestamp(),
): void => {
  foregroundSegmentStartedAt ??= timestamp;
};

const handleAppStateChange = (nextState: AppStateStatus): void => {
  if (nextState === 'background' && !isBackgrounded) {
    pauseForegroundSegment();
    backgroundCount += 1;
    isBackgrounded = true;
  } else if (
    nextState === 'active' &&
    isBackgrounded &&
    foregroundSegmentStartedAt === null
  ) {
    if (backgroundCount > resumeCount) {
      resumeCount += 1;
    }
    startForegroundSegment();
    isBackgrounded = false;
  }
  currentAppState = nextState;
};

const startForegroundAccounting = (startTime?: number): void => {
  currentAppState = AppState.currentState;
  isBackgrounded = currentAppState === 'background';
  if (currentAppState !== 'background') {
    startForegroundSegment(startTime);
  }
  appStateSubscription = AppState.addEventListener(
    'change',
    handleAppStateChange,
  );
};

const clearJourneyState = (): void => {
  if (journeyTimeout) {
    clearTimeout(journeyTimeout);
    journeyTimeout = null;
  }
  appStateSubscription?.remove();
  appStateSubscription = null;
  journeyId = null;
  journeySpan = undefined;
  currentAppState = AppState.currentState;
  foregroundSegmentStartedAt = null;
  foregroundActiveMs = 0;
  backgroundCount = 0;
  resumeCount = 0;
  isBackgrounded = false;
};

/** Starts one VBA journey or returns the active journey identifier. */
export const startVbaCufJourney = (
  entrySurface: VbaCufEntrySurface,
): string => {
  if (journeyId) {
    return journeyId;
  }

  const id = nextOperationId(TraceName.VbaToPixInstructions);
  const tags = buildStartTags(entrySurface);
  journeyId = id;
  logSpan('started', TraceName.VbaToPixInstructions, tags);
  journeySpan = trace({
    name: TraceName.VbaToPixInstructions,
    id,
    op: TraceOperation.VbaOperation,
    forceTransaction: true,
    maxLifetimeMs: VBA_CUF_TRACE_MAX_LIFETIME_MS,
    tags,
    data: tags,
  });
  startForegroundAccounting();
  journeyTimeout = setTimeout(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.TIMEOUT);
  }, VBA_CUF_TIMEOUT_MS);
  return id;
};

/** Ends the active VBA journey once and clears its lifecycle resources. */
export function endVbaCufJourney(
  success: boolean,
  reason?: VbaCufEndReason,
): void {
  if (!journeyId) {
    return;
  }

  const id = journeyId;
  pauseForegroundSegment();
  const measuredForegroundMs = Math.round(foregroundActiveMs);
  const data = {
    [VBA_CUF_TAG.SUCCESS]: success,
    ...(reason ? { [VBA_CUF_TAG.REASON]: reason } : undefined),
    [VBA_CUF_FOREGROUND_ACTIVE_MS]: measuredForegroundMs,
    [VBA_CUF_TAG.BACKGROUND_COUNT]: backgroundCount,
    [VBA_CUF_TAG.RESUME_COUNT]: resumeCount,
  };
  setTraceMeasurement(
    { name: TraceName.VbaToPixInstructions, id },
    VBA_CUF_FOREGROUND_ACTIVE_MS,
    measuredForegroundMs,
    'millisecond',
  );
  clearJourneyState();
  logSpan('completed', TraceName.VbaToPixInstructions, data);
  endTrace({ name: TraceName.VbaToPixInstructions, id, data });
  settleVbaCufLifecycleContext();
}

/** Starts a forced operation transaction, linked to the active journey if any. */
export const startVbaCufChildTrace = (name: VbaCufChildTraceName): string => {
  const id = nextOperationId(name);
  const tags = buildStartTags();
  openChildren.set(id, name);
  logSpan('started', name, tags);
  trace({
    name,
    id,
    op: TraceOperation.VbaOperation,
    parentContext: journeySpan,
    forceTransaction: true,
    maxLifetimeMs: VBA_CUF_TRACE_MAX_LIFETIME_MS,
    tags,
    data: tags,
  });
  return id;
};

/** Ends an open VBA operation transaction once. */
export const endVbaCufChildTrace = (
  id: string,
  success: boolean,
  reason?: VbaCufEndReason,
): void => {
  const name = openChildren.get(id);
  if (!name) {
    return;
  }
  openChildren.delete(id);
  const data = {
    [VBA_CUF_TAG.SUCCESS]: success,
    ...(reason ? { [VBA_CUF_TAG.REASON]: reason } : undefined),
  };
  logSpan('completed', name, data);
  endTrace({ name, id, data });
};

/** Returns whether a VBA journey is currently open. */
export const hasActiveVbaCufJourney = (): boolean => journeyId !== null;

/** Clears module state and open operations between tests. */
export const resetVbaCufTraceForTests = (): void => {
  clearJourneyState();
  openChildren.clear();
  operationCounter = 0;
};
