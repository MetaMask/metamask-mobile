import {
  endTrace,
  trace,
  type TraceName,
  type TraceOperation,
  type TraceValue,
} from '../../../../util/trace';
import { PREDICT_NEXT_FEATURE_NAME } from '../constants';

export interface WithPredictNextTraceOptions<T> {
  method: string;
  name: TraceName;
  op: TraceOperation;
  tags?: Record<string, TraceValue>;
  data?: Record<string, TraceValue>;
  resultData?: (result: T) => Record<string, TraceValue>;
}

/**
 * Starts a Sentry span around an async PredictNext operation and always ends it.
 */
export async function withPredictNextTrace<T>(
  options: WithPredictNextTraceOptions<T>,
  fn: () => Promise<T>,
): Promise<T> {
  const traceId = `${options.method}-${Date.now()}`;
  let endData: Record<string, TraceValue> | undefined;

  trace({
    name: options.name,
    op: options.op,
    id: traceId,
    tags: {
      feature: PREDICT_NEXT_FEATURE_NAME,
      ...options.tags,
    },
    ...(options.data ? { data: options.data } : {}),
  });

  try {
    const result = await fn();
    endData = {
      success: true,
      ...(options.resultData ? options.resultData(result) : {}),
    };
    return result;
  } catch (error) {
    endData = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    throw error;
  } finally {
    endTrace({
      name: options.name,
      id: traceId,
      data: endData,
    });
  }
}
