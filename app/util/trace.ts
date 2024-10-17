import {
  startSpan as sentryStartSpan,
  startSpanManual,
  withScope,
} from '@sentry/react-native';
import performance from 'react-native-performance';
import type { Primitive, Span, StartSpanOptions } from '@sentry/types';
import { createModuleLogger, createProjectLogger } from '@metamask/utils';

// Cannot create this 'sentry' logger in Sentry util file because of circular dependency
const projectLogger = createProjectLogger('sentry');
const log = createModuleLogger(projectLogger, 'trace');

export enum TraceName {
  DeveloperTest = 'Developer Test',
  Middleware = 'Middleware',
  NestedTest1 = 'Nested Test 1',
  NestedTest2 = 'Nested Test 2',
}

const ID_DEFAULT = 'default';
const OP_DEFAULT = 'custom';
export const TRACES_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const tracesByKey: Map<string, PendingTrace> = new Map();

export interface PendingTrace {
  end: (timestamp?: number) => void;
  request: TraceRequest;
  startTime: number;
  timeoutId: NodeJS.Timeout;
}

export type TraceContext = unknown;

export type TraceCallback<T> = (context?: TraceContext) => T;

export interface TraceRequest {
  data?: Record<string, number | string | boolean>;
  id?: string;
  name: TraceName;
  parentContext?: TraceContext;
  startTime?: number;
  tags?: Record<string, number | string | boolean>;
}

export interface EndTraceRequest {
  id?: string;
  name: TraceName;
  timestamp?: number;
}

export function trace<T>(request: TraceRequest, fn: TraceCallback<T>): T;

export function trace(request: TraceRequest): TraceContext;

export function trace<T>(
  request: TraceRequest,
  fn?: TraceCallback<T>,
): T | TraceContext {
  if (!fn) {
    return startTrace(request);
  }

  return traceCallback(request, fn);
}

export function endTrace(request: EndTraceRequest) {
  const { name, timestamp } = request;
  const id = getTraceId(request);
  const key = getTraceKey(request);
  const pendingTrace = tracesByKey.get(key);

  if (!pendingTrace) {
    log('No pending trace found', name, id);
    return;
  }

  pendingTrace.end(timestamp);

  clearTimeout(pendingTrace.timeoutId);
  tracesByKey.delete(key);

  const { request: pendingRequest, startTime } = pendingTrace;
  const endTime = timestamp ?? getPerformanceTimestamp();
  const duration = endTime - startTime;

  log('Finished trace', name, id, duration, { request: pendingRequest });
}

function traceCallback<T>(request: TraceRequest, fn: TraceCallback<T>): T {
  const { name } = request;

  const callback = (span: Span | undefined) => {
    log('Starting trace', name, request);

    const start = Date.now();
    let error: unknown;

    return tryCatchMaybePromise<T>(
      () => fn(span),
      (currentError) => {
        error = currentError;
        throw currentError;
      },
      () => {
        const end = Date.now();
        const duration = end - start;

        log('Finished trace', name, duration, { error, request });
      },
    ) as T;
  };

  return startSpan(request, (spanOptions) =>
    sentryStartSpan(spanOptions, callback),
  );
}

function startTrace(request: TraceRequest): TraceContext {
  const { name, startTime: requestStartTime } = request;
  const startTime = requestStartTime ?? getPerformanceTimestamp();
  const id = getTraceId(request);

  const callback = (span: Span | undefined) => {
    const end = (timestamp?: number) => {
      span?.end(timestamp);
    };

    const timeoutId = setTimeout(() => {
      log('Trace cleanup due to timeout', name, id);
      end();
      tracesByKey.delete(getTraceKey(request));
    }, TRACES_CLEANUP_INTERVAL);

    const pendingTrace = { end, request, startTime, timeoutId };
    const key = getTraceKey(request);
    tracesByKey.set(key, pendingTrace);

    log('Started trace', name, id, request);

    return span;
  };

  return startSpan(request, (spanOptions) =>
    startSpanManual(spanOptions, callback),
  );
}

function startSpan<T>(
  request: TraceRequest,
  callback: (spanOptions: StartSpanOptions) => T,
) {
  const { data: attributes, name, parentContext, startTime, tags } = request;
  const parentSpan = (parentContext ?? null) as Span | null;

  const spanOptions: StartSpanOptions = {
    attributes,
    name,
    op: OP_DEFAULT,
    // This needs to be parentSpan once we have the withIsolatedScope implementation in place in the Sentry SDK for React Native
    // Reference PR that updates @sentry/react-native: https://github.com/getsentry/sentry-react-native/pull/3895
    parentSpanId: parentSpan?.spanId,
    startTime,
  };

  return withScope((scope) => {
    scope.setTags(tags as Record<string, Primitive>);

    return callback(spanOptions);
  }) as T;
}

function getTraceId(request: TraceRequest) {
  return request.id ?? ID_DEFAULT;
}

function getTraceKey(request: TraceRequest) {
  const { name } = request;
  const id = getTraceId(request);

  return [name, id].join(':');
}

function getPerformanceTimestamp(): number {
  return performance.timeOrigin + performance.now();
}

function tryCatchMaybePromise<T>(
  tryFn: () => T,
  catchFn: (error: unknown) => void,
  finallyFn: () => void,
): T | undefined {
  let isPromise = false;

  try {
    const result = tryFn() as T;

    if (result instanceof Promise) {
      isPromise = true;
      return result.catch(catchFn).finally(finallyFn) as T;
    }

    return result;
  } catch (error) {
    if (!isPromise) {
      catchFn(error);
    }
  } finally {
    if (!isPromise) {
      finallyFn();
    }
  }

  return undefined;
}
