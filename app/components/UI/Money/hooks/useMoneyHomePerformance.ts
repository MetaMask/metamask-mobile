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
  ready: boolean;
}

interface UseMoneyHomePerformanceConfig {
  /**
   * The parts of the screen to measure.
   **/
  segments: MoneyHomeSegment[];
  /**
   * True when the account has nothing meaningful to show (no spendable balance
   * and no activity); reported as each span's `content_state`.
   */
  isEmpty: boolean;
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
  isEmpty,
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

  // End each segment's span the first time it becomes ready.
  useEffect(() => {
    const traces = tracesRef.current;
    for (const { name, ready } of segments) {
      const segmentTrace = traces.get(name);
      if (ready && segmentTrace && !segmentTrace.ended) {
        endTrace({
          name,
          id: segmentTrace.id,
          data: { success: true, content_state: isEmpty ? 'empty' : 'filled' },
        });
        segmentTrace.ended = true;
      }
    }
  }, [segments, isEmpty]);
}
