import {
  startSpan as sentryStartSpan,
  startSpanManual,
  setMeasurement,
  Scope,
} from '@sentry/react-native';
import {
  type StartSpanOptions,
  type Span,
  withIsolationScope,
} from '@sentry/core';
import performance from 'react-native-performance';
import { createModuleLogger, createProjectLogger } from '@metamask/utils';
import { AGREED, METRICS_OPT_IN } from '../constants/storage';
import StorageWrapper from '../store/storage-wrapper';

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
  SelectAccount = 'Select Account',
  AddNetwork = 'Add Network',
  UpdateNetwork = 'Update Network',
  AssetDetails = 'Asset Details',
  ImportNfts = 'Import Nfts',
  ImportTokens = 'Import Tokens',
  RampQuoteLoading = 'Ramp Quote Loading',
  LoadRampExperience = 'Load Ramp Experience',
  OnboardingNewSocialAccountExists = 'Onboarding - New Social Account Exists',
  OnboardingNewSocialCreateWallet = 'Onboarding - New Social Create Wallet',
  OnboardingNewSrpCreateWallet = 'Onboarding - New SRP Create Wallet',
  OnboardingExistingSocialLogin = 'Onboarding - Existing Social Login',
  OnboardingExistingSocialAccountNotFound = 'Onboarding - Existing Social Account Not Found',
  OnboardingExistingSrpImport = 'Onboarding - Existing SRP Import',
  OnboardingJourneyOverall = 'Onboarding - Overall Journey',
  OnboardingSocialLoginAttempt = 'Onboarding - Social Login Attempt',
  OnboardingPasswordSetupAttempt = 'Onboarding - Password Setup Attempt',
  OnboardingPasswordLoginAttempt = 'Onboarding - Password Login Attempt',
  OnboardingResetPassword = 'Onboarding - Reset Password',
  OnboardingCreateKeyAndBackupSrp = 'Onboarding - Create Key and Backup SRP',
  OnboardingAddSrp = 'Onboarding - Add SRP',
  OnboardingFetchSrps = 'Onboarding - Fetch SRPs',
  OnboardingOAuthProviderLogin = 'Onboarding - OAuth Provider Login',
  OnboardingOAuthBYOAServerGetAuthTokens = 'Onboarding - OAuth BYOA Server Get Auth Tokens',
  OnboardingOAuthSeedlessAuthenticate = 'Onboarding - OAuth Seedless Authenticate',
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
  OnboardingUserJourney = 'onboarding.user_journey',
  OnboardingSecurityOp = 'onboarding.security_operation',
}

const ID_DEFAULT = 'default';
const OP_DEFAULT = 'custom';
export const TRACES_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const tracesByKey: Map<string, PendingTrace> = new Map();

let consentCache: boolean | null = null;
const preConsentCallBuffer: PreConsentCallBuffer[] = [];

export interface PendingTrace {
  end: (timestamp?: number) => void;
  request: TraceRequest;
  startTime: number;
  timeoutId: NodeJS.Timeout;
  span?: Span;
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

  /**
   * Custom data to associate with the trace when ending it.
   * These will be set as attributes on the span.
   */
  data?: Record<string, number | string | boolean>;
}

interface PreConsentCallBuffer<T = TraceRequest | EndTraceRequest> {
  type: 'start' | 'end';
  request: T;
  parentTraceName?: string; // Track parent trace name for reconnecting during flush
}

interface SentrySpanWithName extends Span {
  _name?: string;
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
export function endTrace(request: EndTraceRequest): void {
  const { name, timestamp } = request;
  const id = getTraceId(request);
  const key = getTraceKey(request);
  const pendingTrace = tracesByKey.get(key);

  if (!pendingTrace) {
    log('No pending trace found', name, id);
    return;
  }

  if (request.data && pendingTrace.span) {
    const span = pendingTrace.span as Span;
    for (const [attrKey, attrValue] of Object.entries(request.data)) {
      span.setAttribute(attrKey, attrValue);
    }
  }

  pendingTrace.end(timestamp);

  clearTimeout(pendingTrace.timeoutId);
  tracesByKey.delete(key);

  const { request: pendingRequest, startTime } = pendingTrace;
  const endTime = timestamp ?? getPerformanceTimestamp();
  const duration = endTime - startTime;

  log('Finished trace', name, id, duration, { request: pendingRequest });
}

/**
 * Buffered version of trace. Handles consent and buffering logic before calling trace.
 */
export function bufferedTrace<T>(
  request: TraceRequest,
  fn?: TraceCallback<T>,
): T | TraceContext {
  // If consent is not cached or not given, buffer the trace start
  if (consentCache !== true) {
    if (consentCache === null) {
      updateIsConsentGivenForSentry();
    }
    // Extract parent trace name if parentContext exists
    let parentTraceName: string | undefined;
    if (request.parentContext && typeof request.parentContext === 'object') {
      const parentSpan = request.parentContext as SentrySpanWithName;
      parentTraceName = parentSpan._name;
    }
    preConsentCallBuffer.push({
      type: 'start',
      request: {
        ...request,
        parentContext: undefined, // Remove original parentContext to avoid invalid references
        // Use `Date.now()` as `performance.timeOrigin` is only valid for measuring durations within
        // the same session; it won't produce valid event times for Sentry if buffered and flushed later
        startTime: request.startTime ?? Date.now(),
      },
      parentTraceName, // Store the parent trace name for later reconnection
    });
  }
  if (fn) {
    return trace(request, fn);
  }
  return trace(request);
}

/**
 * Buffered version of endTrace. Handles consent and buffering logic before calling endTrace.
 */
export function bufferedEndTrace(request: EndTraceRequest): void {
  // If consent is not cached or not given, buffer the trace end
  if (consentCache !== true) {
    if (consentCache === null) {
      updateIsConsentGivenForSentry();
    }
    preConsentCallBuffer.push({
      type: 'end',
      request: {
        ...request,
        // Use `Date.now()` as `performance.timeOrigin` is only valid for measuring durations within
        // the same session; it won't produce valid event times for Sentry if buffered and flushed later
        timestamp: request.timestamp ?? Date.now(),
      },
    });
  }
  endTrace(request);
}

export async function flushBufferedTraces(): Promise<void> {
  const canFlush = await updateIsConsentGivenForSentry();
  if (!canFlush) {
    log('Consent not given, cannot flush buffered traces.');
    preConsentCallBuffer.length = 0;
    return;
  }

  log('Flushing buffered traces. Count:', preConsentCallBuffer.length);
  const bufferToProcess = [...preConsentCallBuffer];
  preConsentCallBuffer.length = 0;

  const activeSpans = new Map<string, Span>();

  for (const call of bufferToProcess) {
    if (call.type === 'start') {
      const traceName = call.request.name as string;

      // Get parent if applicable
      let parentSpan: Span | undefined;
      if (call.parentTraceName) {
        parentSpan = activeSpans.get(call.parentTraceName);
      }

      const span = trace({
        ...call.request,
        parentContext: parentSpan,
      }) as unknown as Span;

      if (span) {
        activeSpans.set(traceName, span);
      }
    } else if (call.type === 'end') {
      endTrace(call.request);
      activeSpans.delete(call.request.name as string);
    }
  }
  log('Finished flushing buffered traces');
}

export function discardBufferedTraces() {
  preConsentCallBuffer.length = 0;
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

    const pendingTrace = { end, request, startTime, timeoutId, span };
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
    parentSpan,
    startTime,
  };

  return withIsolationScope((scope) => {
    setScopeTags(scope, request);

    return callback(spanOptions);
  }) as T;
}

function getTraceId(request: TraceRequest | EndTraceRequest) {
  return request.id ?? ID_DEFAULT;
}

function getTraceKey(request: TraceRequest | EndTraceRequest) {
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
function setScopeTags(scope: Scope, request: TraceRequest) {
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
      setMeasurement(key, value, 'none');
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

async function updateIsConsentGivenForSentry(): Promise<boolean> {
  const metricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);
  consentCache = metricsOptIn === AGREED;
  return consentCache;
}
