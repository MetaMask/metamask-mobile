import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../util/trace';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';

export interface UsePredictNextMeasurementOptions {
  traceName: TraceName;
  op?: TraceOperation;
  /** Ends the span when every condition is true. Must represent data-loaded, not mount. */
  conditions: boolean[];
  debugContext?: Record<string, TraceValue>;
}

/**
 * Starts a PredictNext screen span on mount and ends it when `conditions` are all true.
 * Leaving the screen before those conditions are met ends the span as unmounted.
 */
export const usePredictNextMeasurement = ({
  traceName,
  op = TraceOperation.PredictOperation,
  conditions,
  debugContext,
}: UsePredictNextMeasurementOptions): void => {
  const hasCompleted = useRef(false);
  const traceStarted = useRef(false);
  const traceId = useRef(uuidv4());
  const debugContextRef = useRef(debugContext);
  debugContextRef.current = debugContext;

  const shouldEnd = conditions.length > 0 && conditions.every(Boolean);

  useEffect(() => {
    const id = traceId.current;

    if (!traceStarted.current && !hasCompleted.current) {
      trace({
        name: traceName,
        op,
        id,
        tags: {
          feature: PREDICT_NEXT_FEATURE_NAME,
        },
        data: debugContextRef.current,
      });
      traceStarted.current = true;
    }

    return () => {
      if (traceStarted.current && !hasCompleted.current) {
        endTrace({
          name: traceName,
          id,
          data: { success: false, reason: 'unmounted' },
        });
        traceStarted.current = false;
      }
    };
  }, [op, traceName]);

  useEffect(() => {
    if (shouldEnd && traceStarted.current && !hasCompleted.current) {
      endTrace({
        name: traceName,
        id: traceId.current,
        data: { success: true },
      });
      traceStarted.current = false;
      hasCompleted.current = true;
    }
  }, [shouldEnd, traceName]);
};
