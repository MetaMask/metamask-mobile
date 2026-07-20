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

  // Start every segment's span on mount; end any still in flight on unmount.
  useEffect(() => {
    const traces = tracesRef.current;
    for (const { name } of segments) {
      const id = uuidv4();
      trace({ name, op: TraceOperation.MoneyHomePerformance, id });
      traces.set(name, { id, ended: false });
    }

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
    // Segment names are stable; only `ready` flags change across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // End each segment's span the first time it becomes ready — or fails.
  // Failure is checked first: an error that arrives with (or before) readiness
  // means the content never truly loaded, while an error after a successful
  // end is ignored (the span is already closed with an accurate duration).
  useEffect(() => {
    const traces = tracesRef.current;
    for (const { name, ready, failed, contentState } of segments) {
      const segmentTrace = traces.get(name);
      if (!segmentTrace || segmentTrace.ended) {
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
