import type {
  ApiCallsSummary,
  ApiEndpointSummary,
  NetworkLogEntry,
} from '../types';
import { classifyApiCall } from './classifyApiCall';
import { sanitizeApiCallUrl } from './sanitizeApiCallUrl';

export const DEFAULT_TOP_ENDPOINTS = 10;
const UNKNOWN_HOST = 'unknown';

function isFailedCall(call: NetworkLogEntry): boolean {
  const { status } = call;
  return typeof status !== 'number' || !(status >= 100) || status >= 400;
}

function getHost(sanitizedUrl: string): string {
  const authority = sanitizedUrl.split('/')[0];
  const hostWithPort = authority.slice(authority.lastIndexOf('@') + 1);
  const host = hostWithPort.replace(/:\d+$/u, '').toLowerCase();
  return host || UNKNOWN_HOST;
}

/**
 * Summarizes the network log captured for one scenario.
 *
 * When `apiCallsError` is set, capture failed: returns `status: 'error'` so
 * callers never mistake it for zero requests. When `apiCalls` is null and
 * there is no error, capture was not attempted: returns `null`. When
 * `apiCalls` is an array (including empty): returns `status: 'captured'`.
 *
 * Top endpoints list `app` requests first so noise (local mock server polls,
 * telemetry) cannot crowd them out of the cap.
 *
 * A call counts as failed when its status is >= 400 or is missing / 0 (HAR
 * reports aborted or blocked requests without a real status).
 */
export function summarizeApiCalls(
  apiCalls: NetworkLogEntry[] | null | undefined,
  apiCallsError?: string | null,
  topN: number = DEFAULT_TOP_ENDPOINTS,
): ApiCallsSummary | null {
  if (apiCallsError) {
    return { status: 'error', error: apiCallsError };
  }

  if (!Array.isArray(apiCalls)) {
    return null;
  }

  const endpoints = new Map<string, ApiEndpointSummary>();
  const byHost = new Map<string, number>();
  const appEndpoints = new Set<string>();
  let failed = 0;
  let appTotal = 0;
  let appFailed = 0;

  for (const call of apiCalls) {
    const method = (call.method || 'GET').toUpperCase();
    const url = sanitizeApiCallUrl(call.url);
    const key = `${method} ${url}`;
    const callFailed = isFailedCall(call);

    const kind = classifyApiCall(method, url);

    const endpoint = endpoints.get(key) ?? {
      method,
      kind,
      url,
      count: 0,
      failed: 0,
    };
    endpoint.count += 1;
    if (callFailed) {
      endpoint.failed += 1;
      failed += 1;
    }
    endpoints.set(key, endpoint);

    if (kind === 'app') {
      appTotal += 1;
      appEndpoints.add(key);
      if (callFailed) {
        appFailed += 1;
      }
    }

    const host = getHost(url);
    byHost.set(host, (byHost.get(host) ?? 0) + 1);
  }

  const sortedHosts = [...byHost.entries()].sort(
    ([hostA, countA], [hostB, countB]) =>
      countB - countA || hostA.localeCompare(hostB),
  );

  const topEndpoints = [...endpoints.values()]
    .sort(
      (a, b) =>
        Number(b.kind === 'app') - Number(a.kind === 'app') ||
        b.count - a.count ||
        a.url.localeCompare(b.url) ||
        a.method.localeCompare(b.method),
    )
    .slice(0, topN);

  return {
    status: 'captured',
    total: apiCalls.length,
    unique: endpoints.size,
    duplicates: apiCalls.length - endpoints.size,
    failed,
    byHost: Object.fromEntries(sortedHosts),
    app: {
      total: appTotal,
      unique: appEndpoints.size,
      duplicates: appTotal - appEndpoints.size,
      failed: appFailed,
    },
    topEndpoints,
  };
}
