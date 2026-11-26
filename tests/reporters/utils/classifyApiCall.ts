import type { ApiKind } from '../types';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '10.0.2.2']);
const TEST_INFRA_PORT = '8000';
const TELEMETRY_HOSTS = new Set(['clients2.google.com']);
const TELEMETRY_HOST_SUFFIXES = ['.ingest.sentry.io'];

/**
 * Labels a request so test and telemetry noise can be filtered from app
 * traffic. Only obvious cases are matched; everything else is `app`.
 * Precedence: test_infra > telemetry > preflight > app.
 *
 * @param method - Upper-cased HTTP method.
 * @param sanitizedUrl - Output of `sanitizeApiCallUrl` (`host[:port]/path`).
 */
export function classifyApiCall(method: string, sanitizedUrl: string): ApiKind {
  const [authority, ...pathSegments] = sanitizedUrl.split('/');
  const hostWithPort = authority.slice(authority.lastIndexOf('@') + 1);
  const [host, port] = hostWithPort.toLowerCase().split(':');

  if (
    LOCAL_HOSTS.has(host) &&
    (port === TEST_INFRA_PORT || pathSegments.includes('health-check'))
  ) {
    return 'test_infra';
  }
  if (
    TELEMETRY_HOSTS.has(host) ||
    TELEMETRY_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    return 'telemetry';
  }
  if (method === 'OPTIONS') {
    return 'preflight';
  }
  return 'app';
}
