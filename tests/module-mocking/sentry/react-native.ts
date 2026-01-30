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
