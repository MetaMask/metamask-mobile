import Logger from '../../../../util/Logger';

/**
 * Single greppable tag for the Virtual Bank Account / autoramp trace stream.
 * Filter Metro or Xcode output with `VBA-TRACE`, or the dashboard session log
 * with `jq 'select(.payload.type == "vba-trace")' ramps-debug.jsonl`.
 */
export const VBA_TRACE_TAG = '[VBA-TRACE]';

export interface VbaTraceRecord {
  tag: 'VBA-TRACE';
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
}

type VbaTraceSink = (record: VbaTraceRecord) => void;

let sink: VbaTraceSink | null = null;

/**
 * Registers a secondary destination for trace records, used by the ramps debug
 * bridge so the same stream reaches the dashboard and `ramps-debug.jsonl`.
 *
 * @param next - The sink to receive records, or `null` to detach.
 */
export function setVbaTraceSink(next: VbaTraceSink | null): void {
  sink = next;
}

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|authorization|bearer|privatekey|seed|mnemonic|jwt|apikey|cookie/iu;
const ABBREVIATE_KEY_PATTERN =
  /address|signature|hash|proof|message|externalid|external_id/iu;
const HEX_BLOB_PATTERN = /^0x[0-9a-f]{16,}$/iu;
const MAX_STRING_LENGTH = 120;
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 20;

/**
 * Shortens an opaque value to a recognizable head and tail so addresses,
 * hashes, and signatures stay correlatable without being reproduced in full.
 *
 * @param value - The value to shorten.
 * @param lead - How many leading characters to keep.
 * @param tail - How many trailing characters to keep.
 * @returns The shortened representation.
 */
export function abbreviate(value: unknown, lead = 8, tail = 6): string {
  if (typeof value !== 'string') {
    return String(value);
  }
  if (value.length <= lead + tail + 3) {
    return value;
  }
  return `${value.slice(0, lead)}..${value.slice(-tail)}(len:${value.length})`;
}

/**
 * Copies a payload into a log-safe shape: sensitive keys are dropped, long
 * opaque strings are abbreviated, and deep or wide structures are capped.
 *
 * @param value - The value to sanitize.
 * @param key - The key the value was read from, used to decide redaction.
 * @param depth - Current recursion depth.
 * @returns The sanitized value.
 */
export function redact(value: unknown, key = '', depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return '[redacted]';
  }

  if (typeof value === 'string') {
    if (
      HEX_BLOB_PATTERN.test(value) ||
      (key && ABBREVIATE_KEY_PATTERN.test(key)) ||
      value.length > MAX_STRING_LENGTH
    ) {
      return abbreviate(value);
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Error) {
    return describeError(value);
  }

  if (depth >= MAX_DEPTH) {
    return '[max-depth]';
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redact(item, key, depth + 1));
    return value.length > MAX_ARRAY_ITEMS
      ? [...items, `[+${value.length - MAX_ARRAY_ITEMS} more]`]
      : items;
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[entryKey] = redact(entryValue, entryKey, depth + 1);
    }
    return output;
  }

  return String(value);
}

/**
 * Flattens an unknown throwable into a structured, queryable record. Picks up
 * `httpStatus` (set by `HttpError` from `@metamask/controller-utils`) and any
 * body the thrower attached, so HTTP failures carry their status.
 *
 * @param error - The caught value.
 * @returns A structured description of the failure.
 */
export function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const enriched = error as Error & {
      httpStatus?: number;
      status?: number;
      code?: string | number;
      body?: unknown;
      responseBody?: unknown;
    };
    return {
      name: error.name,
      message: error.message,
      httpStatus: enriched.httpStatus ?? enriched.status,
      code: enriched.code,
      body: redact(enriched.body ?? enriched.responseBody),
      stackHead: error.stack?.split('\n').slice(0, 4).join(' | '),
    };
  }
  return { message: String(error), raw: redact(error) };
}

/**
 * Describes the shape of a payload (keys and value types only) for cases where
 * the values themselves are not worth logging.
 *
 * @param value - The value to describe.
 * @param depth - Current recursion depth.
 * @returns A key-to-type map, or the primitive type name.
 */
export function describeShape(value: unknown, depth = 0): unknown {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return depth >= MAX_DEPTH
      ? 'array'
      : [`array(${value.length})`, describeShape(value[0], depth + 1)];
  }
  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) {
      return 'object';
    }
    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[entryKey] = describeShape(entryValue, depth + 1);
    }
    return output;
  }
  return typeof value;
}

/**
 * Emits one trace record to the Metro / Xcode console and, when the ramps debug
 * bridge is running, to the dashboard session log. Dev builds only.
 *
 * @param event - Dot-separated event name, e.g. `autoramp.create.start`.
 * @param data - Structured payload; sanitized before it is emitted.
 */
export function vbaTrace(
  event: string,
  data: Record<string, unknown> = {},
): void {
  if (!__DEV__) {
    return;
  }

  const record: VbaTraceRecord = {
    tag: 'VBA-TRACE',
    event,
    timestamp: Date.now(),
    data: redact(data) as Record<string, unknown>,
  };

  Logger.log(VBA_TRACE_TAG, event, record.data);

  try {
    sink?.(record);
  } catch {
    // A failing sink must never affect the traced flow.
  }
}

const DEFAULT_STALL_THRESHOLDS_MS = [15_000, 60_000, 180_000];

/**
 * Reports an operation that has not settled yet, which is how a silently
 * hanging request (no resolve, no reject) becomes visible in the stream.
 *
 * @param event - Event name to emit when the operation is still pending.
 * @param data - Structured payload to include with each report.
 * @param thresholdsMs - Elapsed times at which to report.
 * @returns A function that stops the pending reports.
 */
export function traceWhilePending(
  event: string,
  data: Record<string, unknown> = {},
  thresholdsMs: number[] = DEFAULT_STALL_THRESHOLDS_MS,
): () => void {
  if (!__DEV__) {
    return () => undefined;
  }

  const timers = thresholdsMs.map((threshold) =>
    setTimeout(() => {
      vbaTrace(event, { ...data, pendingForMs: threshold });
    }, threshold),
  );

  return () => {
    timers.forEach(clearTimeout);
  };
}
