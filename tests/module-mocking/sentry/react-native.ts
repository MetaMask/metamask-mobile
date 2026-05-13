// Minimal Sentry React Native mock for E2E runs

export interface Span {
  end?: (timestamp?: number) => void;
  setAttribute?: (key: string, value: unknown) => void;
}

export const init = (_options?: unknown) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] init', _options ?? '(no options)');
};

export const wrap = <T>(component: T): T => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] wrap');
  return component;
};

export const setMeasurement = (
  _name: string,
  _value: number,
  _unit?: string,
) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] setMeasurement', _name, _value, _unit);
};

export const startSpan = <T>(
  _options: unknown,
  callback: (span?: Span) => T,
): T => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] startSpan', _options);
  return callback(undefined);
};

export const startSpanManual = <T>(
  _options: unknown,
  callback: (span?: Span) => T,
): T => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] startSpanManual', _options);
  return callback(undefined);
};

// Optional helpers to reduce undefined checks in app code paths
export const configureScope = (
  _fn: (scope: { setTag: (k: string, v: unknown) => void }) => void,
) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] configureScope');
};
export const addBreadcrumb = (_breadcrumb: unknown) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] addBreadcrumb', _breadcrumb);
};
export const captureException = (_error: unknown) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] captureException', _error);
};
export const captureMessage = (_message: string) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] captureMessage', _message);
};

// `lastEventId` is consumed by `ErrorBoundary.componentDidCatch` to attach the
// last reported Sentry event ID to a feedback submission. Without this export
// the ErrorBoundary itself throws `TypeError: undefined is not a function`
// the moment any child component errors, masking the real error and crashing
// the entire JS context — which then surfaces in E2E as misleading
// "waitAndTap() failed" / "Failed to run application on the device" errors.
export const lastEventId = (): string | undefined => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] lastEventId');
  return undefined;
};

// `withScope` is consumed by `app/util/Logger/index.ts` (which is in turn
// called by `ErrorBoundary.componentDidCatch`). If undefined, the same
// "TypeError: undefined is not a function" cascading-crash pattern as
// `lastEventId` happens, just one line later.
export const withScope = (
  fn: (scope: { setTag?: (k: string, v: unknown) => void }) => void,
) => {
  // eslint-disable-next-line no-console
  console.log('[E2E Sentry Mock] withScope');
  try {
    fn({ setTag: () => undefined });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[E2E Sentry Mock] withScope callback threw', err);
  }
};

// Sentry v9+ Scope class — referenced by app/util/trace.ts and others.
// Real Sentry users instantiate scopes with `new Scope()` or pass them around;
// the mock just needs to be a shape that doesn't throw when called or `new`-d
// and exposes the most common scope methods as no-ops.
export class Scope {
  setTag = (_k?: string, _v?: unknown) => this;
  setTags = (_t?: Record<string, unknown>) => this;
  setExtra = (_k?: string, _v?: unknown) => this;
  setExtras = (_e?: Record<string, unknown>) => this;
  setUser = (_u?: unknown) => this;
  setLevel = (_l?: unknown) => this;
  setContext = (_n?: string, _c?: unknown) => this;
  setSpan = (_s?: unknown) => this;
  addBreadcrumb = (_b?: unknown) => this;
  clear = () => this;
}
