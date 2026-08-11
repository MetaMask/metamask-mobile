import { SWAPS_PERFORMANCE_DIAGNOSTICS_KEY } from './render-probe-template';

export interface RuntimeMarker {
  name: string;
  timestamp: number;
}

export interface RuntimeNetworkEntry {
  timestamp: number;
  method: string;
  host: string;
  path: string;
  status?: number;
  durationMs?: number;
  rpcMethod?: string;
  error?: string;
}

export interface RuntimeConsoleEntry {
  timestamp: number;
  level: 'error' | 'warn';
  message: string;
}

export interface RuntimeRenderEntry {
  count: number;
  timestamps: number[];
}

export interface RuntimeCapture {
  enabled: boolean;
  startedAt: number;
  markers: RuntimeMarker[];
  renders: Record<string, RuntimeRenderEntry>;
  network: RuntimeNetworkEntry[];
  console: RuntimeConsoleEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRuntimeMarker(value: unknown): value is RuntimeMarker {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.timestamp === 'number'
  );
}

export function isRuntimeNetworkEntry(
  value: unknown,
): value is RuntimeNetworkEntry {
  return (
    isRecord(value) &&
    typeof value.timestamp === 'number' &&
    typeof value.method === 'string' &&
    typeof value.host === 'string' &&
    typeof value.path === 'string'
  );
}

function isRuntimeConsoleEntry(value: unknown): value is RuntimeConsoleEntry {
  return (
    isRecord(value) &&
    typeof value.timestamp === 'number' &&
    (value.level === 'error' || value.level === 'warn') &&
    typeof value.message === 'string'
  );
}

function isRuntimeRenderEntry(value: unknown): value is RuntimeRenderEntry {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    Array.isArray(value.timestamps) &&
    value.timestamps.every((timestamp) => typeof timestamp === 'number')
  );
}

function parseRuntimeRenders(
  value: unknown,
): Record<string, RuntimeRenderEntry> | null {
  if (!isRecord(value)) {
    return null;
  }

  const renders: Record<string, RuntimeRenderEntry> = {};
  for (const [name, entry] of Object.entries(value)) {
    if (!isRuntimeRenderEntry(entry)) {
      return null;
    }
    renders[name] = entry;
  }
  return renders;
}

/**
 * Builds the self-contained JavaScript expression that `mm` sends to Hermes
 * through `Runtime.evaluate` immediately before a scenario starts.
 *
 * This code runs inside the React Native app, not in the Node.js scenario
 * runner. It intentionally uses broadly supported JavaScript syntax and keeps
 * every helper inside the expression so the Hermes runtime needs no imports.
 */
export function buildInstallDiagnosticsExpression(): string {
  return `(function() {
    // Render probes and this collector communicate through the same global key.
    // Replacing the value starts every scenario with fresh, timestamp-aligned
    // buffers while leaving the installed wrappers reusable across runs.
    var key = ${JSON.stringify(SWAPS_PERFORMANCE_DIAGNOSTICS_KEY)};
    var root = globalThis;

    root[key] = {
      enabled: true,
      startedAt: Date.now(),
      markers: [],
      renders: {},
      network: [],
      console: []
    };

    // Preserve route shape for grouping while replacing path segments that
    // resemble addresses, identifiers, hashes, or other sensitive values.
    function sanitizePath(path) {
      return String(path || '/')
        .split('/')
        .map(function(segment) {
          if (!segment) {
            return segment;
          }

          if (
            segment.length > 24 ||
            /^(0x)?[0-9a-f]{16,}$/i.test(segment) ||
            /^[A-Za-z0-9_-]{24,}$/.test(segment)
          ) {
            return ':id';
          }

          return segment;
        })
        .join('/');
    }

    // Store only host and sanitized pathname. Query strings, credentials,
    // headers, and response data never enter the capture buffer.
    function sanitizeUrl(input) {
      var raw =
        typeof input === 'string'
          ? input
          : (input && input.url) || String(input);

      try {
        var parsed = new URL(raw);
        return {
          host: parsed.host,
          path: sanitizePath(parsed.pathname)
        };
      } catch (error) {
        var match = /^https?:\\/\\/([^/?#]+)([^?#]*)/.exec(raw);
        return match
          ? { host: match[1], path: sanitizePath(match[2]) }
          : { host: 'unknown', path: '/unparseable' };
      }
    }

    // Console and request errors are bounded and scrubbed before storage so a
    // report cannot retain full URLs or long hexadecimal identifiers.
    function sanitizeMessage(message) {
      return String(message)
        .replace(/https?:\\/\\/\\S+/g, '[url]')
        .replace(/0x[0-9a-f]{16,}/gi, '[hex]')
        .slice(0, 240);
    }

    // Wrap fetch only once. The legacy prototype marker is still recognized so
    // an app session created by the earlier collector is not wrapped twice.
    if (
      !root.fetch.__swapsPerfAnalysisWrapped &&
      !root.fetch.__swapsPerfPrototypeWrapped
    ) {
      var originalFetch = root.fetch;

      var wrappedFetch = function() {
        var args = arguments;
        var capture = root[key];

        if (!capture || !capture.enabled) {
          return originalFetch.apply(root, args);
        }

        var input = args[0];
        var options = args[1] || {};
        var sanitized = sanitizeUrl(input);
        var entry = {
          timestamp: Date.now(),
          method: options.method || (input && input.method) || 'GET',
          host: sanitized.host,
          path: sanitized.path
        };

        // Inspect a JSON request body only long enough to retain its RPC method;
        // never store the body itself. Non-JSON bodies are deliberately ignored.
        if (options.body) {
          try {
            var body =
              typeof options.body === 'string'
                ? JSON.parse(options.body)
                : options.body;

            if (body && body.method) {
              entry.rpcMethod = String(body.method);
            }
          } catch (error) {}
        }

        // Insert before starting fetch so failed requests remain visible. Add
        // status/error and duration when the original promise settles.
        capture.network.push(entry);

        // Bound memory during long-lived development sessions while retaining
        // the most recent requests relevant to the scenario.
        if (capture.network.length>1000) {
          capture.network = capture.network.slice(-750);
        }

        return originalFetch
          .apply(root, args)
          .then(function(response) {
            entry.status = response.status;
            entry.durationMs = Date.now() - entry.timestamp;
            return response;
          })
          .catch(function(error) {
            entry.error = sanitizeMessage(error);
            entry.durationMs = Date.now() - entry.timestamp;
            throw error;
          });
      };

      wrappedFetch.__swapsPerfAnalysisWrapped = true;
      wrappedFetch.__swapsPerfPrototypeWrapped = true;
      root.fetch = wrappedFetch;
    }

    // Capture sanitized warnings and errors without suppressing or changing the
    // app's normal console behavior. This buffer is bounded independently.
    ['warn', 'error'].forEach(function(level) {
      var original = root.console[level];

      if (
        original.__swapsPerfAnalysisWrapped ||
        original.__swapsPerfPrototypeWrapped
      ) {
        return;
      }

      var wrapped = function() {
        var capture = root[key];

        if (capture && capture.enabled) {
          var message = Array.prototype.slice
            .call(arguments)
            .map(sanitizeMessage)
            .join(' ');

          capture.console.push({
            timestamp: Date.now(),
            level: level,
            message: message
          });

          if (capture.console.length > 500) {
            capture.console = capture.console.slice(-350);
          }
        }

        return original.apply(root.console, arguments);
      };

      wrapped.__swapsPerfAnalysisWrapped = true;
      wrapped.__swapsPerfPrototypeWrapped = true;
      root.console[level] = wrapped;
    });

    // Runtime.evaluate returns this serialized acknowledgement to the runner;
    // the full capture stays in-app until the drain expression is evaluated.
    return JSON.stringify({
      installed: true,
      startedAt: root[key].startedAt
    });
  })()`;
}

/** Builds a runtime marker expression aligned to the capture clock. */
export function buildMarkerExpression(name: string): string {
  return `(function(){var capture=globalThis[${JSON.stringify(
    SWAPS_PERFORMANCE_DIAGNOSTICS_KEY,
  )}];if(!capture){return false;}capture.markers.push({name:${JSON.stringify(
    name,
  )},timestamp:Date.now()});return true;})()`;
}

/** Builds the expression that disables and serializes the runtime collector. */
export function buildDrainDiagnosticsExpression(): string {
  return `(function(){var capture=globalThis[${JSON.stringify(
    SWAPS_PERFORMANCE_DIAGNOSTICS_KEY,
  )}]||null;if(capture){capture.enabled=false;}return JSON.stringify(capture);})()`;
}

/** Extracts the first Runtime.evaluate value from an mm CDP response. */
export function extractCdpEvaluationValue(output: unknown): unknown {
  if (!isRecord(output)) {
    return undefined;
  }

  if ('value' in output) {
    return output.value;
  }

  for (const key of ['result', 'data']) {
    const nested = extractCdpEvaluationValue(output[key]);
    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
}

/** Validates JSON serialized by the Hermes collector. */
export function parseRuntimeCapture(value: unknown): RuntimeCapture | null {
  if (
    !isRecord(value) ||
    typeof value.enabled !== 'boolean' ||
    typeof value.startedAt !== 'number' ||
    !Array.isArray(value.markers) ||
    !Array.isArray(value.network) ||
    !Array.isArray(value.console)
  ) {
    return null;
  }

  const renders = parseRuntimeRenders(value.renders);
  if (
    !renders ||
    !value.markers.every(isRuntimeMarker) ||
    !value.network.every(isRuntimeNetworkEntry) ||
    !value.console.every(isRuntimeConsoleEntry)
  ) {
    return null;
  }

  return {
    enabled: value.enabled,
    startedAt: value.startedAt,
    markers: value.markers,
    renders,
    network: value.network,
    console: value.console,
  };
}
