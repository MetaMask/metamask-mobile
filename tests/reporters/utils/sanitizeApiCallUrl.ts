const MAX_API_CALL_URL_LENGTH = 120;
const KEY_LIKE_SEGMENT = /^[A-Za-z0-9_-]{24,}$/u;
const EVM_ADDRESS_SEGMENT = /^0x[0-9a-fA-F]{40,}$/u;

/**
 * Normalizes a captured request URL into a low-cardinality, secret-free key:
 * drops the protocol, query string and fragment, and masks key-like path
 * segments (e.g. an Infura project id in `/v3/<key>`).
 *
 * Mirrors `sanitizeApiCallUrl` in
 * `.github/scripts/qa-automation/performance-tests/diff-app-profiling.mjs`
 * (used by the PR performance comment) so an endpoint has the same identity
 * in the PR comment and in Sentry. That version additionally escapes
 * markdown characters, which is irrelevant here. Keep both in sync.
 */
export function sanitizeApiCallUrl(rawUrl: string | null | undefined): string {
  const withoutQuery = String(rawUrl ?? '').split(/[?#]/u)[0];
  const withoutProtocol = withoutQuery.replace(/^[a-z][a-z0-9+.-]*:\/\//iu, '');
  const masked = withoutProtocol
    .split('/')
    .map((segment) =>
      KEY_LIKE_SEGMENT.test(segment) && !EVM_ADDRESS_SEGMENT.test(segment)
        ? '***'
        : segment,
    )
    .join('/');

  return masked.length > MAX_API_CALL_URL_LENGTH
    ? `${masked.slice(0, MAX_API_CALL_URL_LENGTH - 1)}…`
    : masked;
}
