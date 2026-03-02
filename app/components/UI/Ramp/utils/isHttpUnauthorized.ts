/**
 * Checks whether an error represents an HTTP 401 Unauthorized response.
 *
 * Supports both `HttpError` from `@metamask/controller-utils` (which uses
 * `.httpStatus`) and legacy Axios-style errors (which use `.status`).
 */
export function isHttpUnauthorized(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as Record<string, unknown>;
  return e.httpStatus === 401 || e.status === 401;
}
