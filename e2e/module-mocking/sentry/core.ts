// Minimal Sentry Core mock for E2E runs

export interface Span {
  end?: (timestamp?: number) => void;
  setAttribute?: (key: string, value: unknown) => void;
  _name?: string;
}

export interface StartSpanOptions {
  name?: string;
  op?: string;
  startTime?: number;
  parentSpan?: Span | null;
  attributes?: Record<string, unknown>;
}

export const withIsolationScope = <T>(callback: (scope: unknown) => T): T =>
  callback({ setTag: (_k: string, _v: unknown) => undefined });

export default {};
