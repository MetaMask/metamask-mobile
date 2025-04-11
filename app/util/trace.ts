import {
  startSpan as sentryStartSpan,
  startSpanManual,
  withScope,
  setMeasurement,
  Scope,
} from '@sentry/react-native';
import performance from 'react-native-performance';
import type { Span, StartSpanOptions, MeasurementUnit } from '@sentry/types';
import { createModuleLogger, createProjectLogger } from '@metamask/utils';

// Cannot create this 'sentry' logger in Sentry util file because of circular dependency
const projectLogger = createProjectLogger('sentry');
const log = createModuleLogger(projectLogger, 'trace');
/**
 * The supported trace names.
 */
export enum TraceName {
  DeveloperTest = 'Developer Test',
  Middleware = 'Middleware',
  NestedTest1 = 'Nested Test 1',
  NestedTest2 = 'Nested Test 2',
  NotificationDisplay = 'Notification Display',
  PPOMValidation = 'PPOM Validation',
  Signature = 'Signature',
  LoadScripts = 'Load Scripts',
  LoginUserInteraction = 'Login User Interaction',
  AuthenticateUser = 'Authenticate User',
  LoginBiometricAuthentication = 'Login Biometrics Authentication',
  AppStartBiometricAuthentication = 'App start Biometrics Authentication',
  EngineInitialization = 'Engine Initialization',
  UIStartup = 'UI Startup',
  NavInit = 'Navigation Initialization',
  Login = 'Login',
  NetworkSwitch = 'Network Switch',
  SwitchBuiltInNetwork = 'Switch to Built in Network',
  SwitchCustomNetwork = 'Switch to Custom Network',
  VaultCreation = 'Login Vault Creation',
  AccountList = 'Account List',
  StoreInit = 'Store Initialization',
  Tokens = 'Tokens List',
  CreateSnapAccount = 'Create Snap Account',
  AddSnapAccount = 'Add Snap Account',
  ConfirmationStartup = 'Confirmation Startup',
}

export enum TraceOperation {
  LoadScripts = 'load.scripts',
  BiometricAuthentication = 'biometrics.authentication',
  AuthenticateUser = 'authenticate.user',
  EngineInitialization = 'engine.initialization',
  StorageRehydration = 'storage.rehydration',
  UIStartup = 'ui.startup',
  NavInit = 'navigation.initialization',
  NetworkSwitch = 'network.switch',
  SwitchBuiltInNetwork = 'switch.to.built.in.network',
  SwitchCustomNetwork = 'switch.to.custom.network',
  VaultCreation = 'login.vault.creation',
  AccountList = 'account.list',
  StoreInit = 'store.initialization',
  Login = 'login',
  CreateSnapAccount = 'create.snap.account',
  AddSnapAccount = 'add.snap.account',
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
/**
 * A context object to associate traces with each other and generate nested traces.
 */
export type TraceContext = unknown;
/**
 * A callback function that can be traced.
 */
export type TraceCallback<T> = (context?: TraceContext) => T;
/**
 * A request to create a new trace.
 */
export interface TraceRequest {
  /**
   * Custom data to associate with the trace.
   */
  data?: Record<string, number | string | boolean>;

  /**
   * A unique identifier when not tracing a callback.
   * Defaults to 'default' if not provided.
   */
  id?: string;

  /**
   * The name of the trace.
   */
  name: TraceName;

  /**
   * The parent context of the trace.
   * If provided, the trace will be nested under the parent trace.
   */
  parentContext?: TraceContext;

  /**
   * Override the start time of the trace.
   */
  startTime?: number;

  /**
   * Custom tags to associate with the trace.
   */
  tags?: Record<string, number | string | boolean>;
  /**
   * Custom operation name to associate with the trace.
   */
  op?: string;
}
/**
 * A request to end a pending trace.
 */
export interface EndTraceRequest {
  /**
   * The unique identifier of the trace.
   * Defaults to 'default' if not provided.
   */
  id?: string;

  /**
   * The name of the trace.
   */
  name: TraceName;

  /**
   * Override the end time of the trace.
   */
  timestamp?: number;
}

export function trace<T>(request: TraceRequest, fn: TraceCallback<T>): T;

export function trace(request: TraceRequest): TraceContext;

/**
 * Create a Sentry transaction to analyse the duration of a code flow.
 * If a callback is provided, the transaction will be automatically ended when the callback completes.
 * If the callback returns a promise, the transaction will be ended when the promise resolves or rejects.
 * If no callback is provided, the transaction must be manually ended using `endTrace`.
 *
 * @param request - The data associated with the trace, such as the name and tags.
 * @param fn - The optional callback to record the duration of.
 * @returns The context of the trace, or the result of the callback if provided.
 */
export function trace<T>(
  request: TraceRequest,
  fn?: TraceCallback<T>,
): T | TraceContext {
  if (!fn) {
    return startTrace(request);
  }

  return traceCallback(request, fn);
}

/**
 * End a pending trace that was started without a callback.
 * Does nothing if the pending trace cannot be found.
 *
 * @param request - The data necessary to identify and end the pending trace.
 */
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

    if (span) {
      initSpan(span, request);
    }

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

    if (span) {
      initSpan(span, request);
    }

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
  const { data: attributes, name, parentContext, startTime, op } = request;
  const parentSpan = (parentContext ?? null) as Span | null;

  const spanOptions: StartSpanOptions = {
    attributes,
    name,
    op: op || OP_DEFAULT,
    // This needs to be parentSpan once we have the withIsolatedScope implementation in place in the Sentry SDK for React Native
    // Reference PR that updates @sentry/react-native: https://github.com/getsentry/sentry-react-native/pull/3895
    parentSpanId: parentSpan?.spanId,
    startTime,
  };

  return withScope((scope) => {
    initScope(scope, request);

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

/**
 * Initialise the isolated Sentry scope created for each trace.
 * Includes setting all non-numeric tags.
 *
 * @param scope - The Sentry scope to initialise.
 * @param request - The trace request.
 */
function initScope(scope: Scope, request: TraceRequest) {
  const tags = request.tags ?? {};

  for (const [key, value] of Object.entries(tags)) {
    if (typeof value !== 'number') {
      scope.setTag(key, value);
    }
  }
}

/**
 * Initialise the Sentry span created for each trace.
 * Includes setting all numeric tags as measurements so they can be queried numerically in Sentry.
 *
 * @param _span - The Sentry span to initialise.
 * @param request - The trace request.
 */
function initSpan(_span: Span, request: TraceRequest) {
  const tags = request.tags ?? {};

  for (const [key, value] of Object.entries(tags)) {
    if (typeof value === 'number') {
      sentrySetMeasurement(key, value, 'none');
    }
  }
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

function sentrySetMeasurement(
  key: string,
  value: number,
  unit: MeasurementUnit,
) {
  setMeasurement(key, value, unit);
}
