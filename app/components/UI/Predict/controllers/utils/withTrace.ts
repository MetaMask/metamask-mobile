import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import {
  endTrace,
  trace,
  type TraceName,
  type TraceOperation,
  type TraceValue,
} from '../../../../../util/trace';
import { ensureError } from '../../utils/predictErrorHandler';

/**
 * Minimal interface a controller must satisfy to use withTrace.
 * Keeps the utility decoupled from PredictController so it can be
 * tested with plain object mocks and potentially reused.
 */
export interface TraceableController {
  update(
    updater: (state: {
      lastError: string | null;
      lastUpdateTimestamp: number;
    }) => void,
  ): void;
  getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions;
}

export interface WithTraceOptions<T> {
  method: string;
  trace: {
    name: TraceName;
    op: TraceOperation;
    tags?: Record<string, TraceValue>;
    data?: Record<string, TraceValue>;
  };
  errorContext?: Record<string, unknown>;
  fallbackErrorCode?: string;
  traceData?: (result: T) => Record<string, TraceValue>;
  onSuccess?: (result: T) => void;
  /**
   * When true (default), clears lastError on success and sets it on failure.
   * Set to false for methods that should not touch error state.
   */
  updateErrorState?: boolean;
}

export async function withTrace<T>(
  controller: TraceableController,
  options: WithTraceOptions<T>,
  fn: () => Promise<T>,
): Promise<T> {
  const {
    method,
    trace: traceConfig,
    errorContext = {},
    fallbackErrorCode,
    traceData: traceDataMapper,
    onSuccess,
    updateErrorState = true,
  } = options;

  const traceId = `${method}-${Date.now()}`;
  let traceResultData: Record<string, TraceValue> | undefined;

  trace({
    name: traceConfig.name,
    op: traceConfig.op,
    id: traceId,
    tags: traceConfig.tags,
    ...(traceConfig.data ? { data: traceConfig.data } : {}),
  });

  try {
    const result = await fn();

    if (updateErrorState) {
      controller.update((state) => {
        state.lastError = null;
        state.lastUpdateTimestamp = Date.now();
      });
    }

    onSuccess?.(result);

    traceResultData = {
      success: true,
      ...(traceDataMapper ? traceDataMapper(result) : {}),
    };

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : (fallbackErrorCode ?? 'Unknown error');

    if (updateErrorState) {
      controller.update((state) => {
        state.lastError = errorMessage;
        state.lastUpdateTimestamp = Date.now();
      });
    }

    traceResultData = { success: false, error: errorMessage };

    Logger.error(
      ensureError(error),
      controller.getErrorContext(method, errorContext),
    );

    throw error;
  } finally {
    endTrace({
      name: traceConfig.name,
      id: traceId,
      data: traceResultData,
    });
  }
}
