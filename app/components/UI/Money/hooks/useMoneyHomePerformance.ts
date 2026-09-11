import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

export interface MoneyHomeSegment {
  name: TraceName;
  /**
   * Whether this segment can appear for the current screen state.
   */
  enabled?: boolean;
  /** Backdate a late-enabled segment to screen mount. */
  backdateToMount?: boolean;
  /** Ends the span successfully the first time this flips true. */
  ready: boolean;
  /**
   * Ends the span as a failure if it flips true before `ready` does; a span
   * already ended successfully is never relabelled.
   */
  failed?: boolean;
  /**
   * What this segment showed, sampled at the moment the span ends — per
   * segment, so an early-ready segment can't latch a value derived from data
   * another segment is still loading.
   */
  contentState: 'empty' | 'filled';
}

interface UseMoneyHomePerformanceConfig {
  /**
   * The parts of the screen to measure.
   **/
  segments: MoneyHomeSegment[];
}

interface SegmentTrace {
  id: string;
  ended: boolean;
}

/**
 * Time-to-content telemetry for the Money home screen. Starts one
 * {@link TraceOperation.MoneyHomePerformance} span per {@link MoneyHomeSegment}
 * on mount and ends each when its `ready` flag flips true, reporting the
 * duration via the shared Sentry integration.
 */
export function useMoneyHomePerformance({
  segments,
}: UseMoneyHomePerformanceConfig): void {
  const tracesRef = useRef<Map<TraceName, SegmentTrace>>(new Map());
  const disabledSegmentsRef = useRef<Set<TraceName>>(new Set());
  const screenMountTimeRef = useRef(Date.now());

  // End any traces still in flight when the screen unmounts.
  useEffect(() => {
    const traces = tracesRef.current;
    return () => {
      for (const [name, segmentTrace] of traces) {
        if (!segmentTrace.ended) {
          endTrace({
            name,
            id: segmentTrace.id,
            data: { success: false, reason: 'unmounted' },
          });
          segmentTrace.ended = true;
        }
      }
    };
  }, []);

  // Start applicable segments and end each the first time it becomes ready or
  // fails. A segment may only become applicable after balance/activity data
  // settles; backdating preserves screen-mount-to-content semantics while
  // avoiding spans for sections that never render.
  // Failure is checked first: an error that arrives with (or before) readiness
  // means the content never truly loaded, while an error after a successful
  // end is ignored (the span is already closed with an accurate duration).
  useEffect(() => {
    const traces = tracesRef.current;
    for (const {
      name,
      enabled = true,
      backdateToMount = false,
      ready,
      failed,
      contentState,
    } of segments) {
      if (!enabled) {
        disabledSegmentsRef.current.add(name);
        const segmentTrace = traces.get(name);
        if (segmentTrace && !segmentTrace.ended) {
          endTrace({
            name,
            id: segmentTrace.id,
            data: { success: false, reason: 'disabled' },
          });
          segmentTrace.ended = true;
        }
        continue;
      }

      let segmentTrace = traces.get(name);
      if (!segmentTrace) {
        const id = uuidv4();
        trace({
          name,
          op: TraceOperation.MoneyHomePerformance,
          id,
          ...(backdateToMount && disabledSegmentsRef.current.has(name)
            ? { startTime: screenMountTimeRef.current }
            : {}),
        });
        segmentTrace = { id, ended: false };
        traces.set(name, segmentTrace);
      }

      if (segmentTrace.ended) {
        continue;
      }

      if (failed) {
        endTrace({
          name,
          id: segmentTrace.id,
          data: { success: false, reason: 'error' },
        });
        segmentTrace.ended = true;
      } else if (ready) {
        endTrace({
          name,
          id: segmentTrace.id,
          data: { success: true, content_state: contentState },
        });
        segmentTrace.ended = true;
      }
    }
  }, [segments]);
}
