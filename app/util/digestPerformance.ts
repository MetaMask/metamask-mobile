import {
  trace,
  type TraceName,
  type TraceOperation,
  type TraceValue,
} from './trace';

export type DigestCacheState = 'warm' | 'cold';
export type DigestResult = 'success' | 'empty' | 'error' | 'cancelled';

/**
 * Cache state for one React Query generation. A cached `null` miss is cold
 * because `digestQueryStaleTime` treats it as immediately stale.
 *
 * @param cached - Current query data, if any.
 * @returns `warm` when a truthy payload is already cached.
 */
export const getDigestCacheState = (cached: unknown): DigestCacheState =>
  cached ? 'warm' : 'cold';

/**
 * Terminal attributes shared by digest time-to-content and fetch spans.
 *
 * @param result - Bounded terminal outcome.
 * @returns Sentry end-data attributes.
 */
export const getDigestTraceEndData = (
  result: DigestResult,
): Record<string, TraceValue> => ({
  result,
  success: result === 'success' || result === 'empty',
  ...(result !== 'cancelled'
    ? {
        content_state:
          result === 'success'
            ? 'filled'
            : result === 'empty'
              ? 'empty'
              : 'error',
      }
    : {}),
  ...(result === 'cancelled' ? { reason: 'owner_cancelled' } : {}),
});

/**
 * Whether this observer still lacks settled content. Used for TTC empty/error
 * closes. A remount of a cached miss or error stays pending until this
 * observer fetches; a later focus refetch does not.
 *
 * @param params - Observer enablement, content, and fetch-after-mount state.
 * @returns True while TTC must stay open.
 */
export const isDigestObserverPending = ({
  enabled,
  hasContent,
  isFetchedAfterMount,
}: {
  enabled: boolean;
  hasContent: boolean;
  isFetchedAfterMount: boolean;
}): boolean => enabled && !hasContent && !isFetchedAfterMount;

/**
 * Wrap a digest controller call in a Sentry fetch span with cancel / empty /
 * error attributes.
 *
 * @param request - Span name, operation, and start tags.
 * @param signal - React Query abort signal.
 * @param fetchFn - Controller call that returns a payload or null.
 * @returns The controller result.
 */
export const withDigestFetchSpan = <T>(
  request: {
    name: TraceName;
    op: TraceOperation;
    tags: Record<string, TraceValue>;
  },
  signal: AbortSignal,
  fetchFn: () => Promise<T | null>,
): Promise<T | null> =>
  trace(request, async (span) => {
    let wasCancelled = signal.aborted;
    const markCancelled = () => {
      wasCancelled = true;
      span?.setAttribute('result', 'cancelled');
      span?.setAttribute('success', false);
    };

    if (wasCancelled) {
      markCancelled();
    } else {
      signal.addEventListener('abort', markCancelled, { once: true });
    }

    try {
      const result = await fetchFn();
      if (!wasCancelled) {
        span?.setAttribute('result', result ? 'success' : 'empty');
        span?.setAttribute('success', true);
      }
      return result;
    } catch (error) {
      if (!wasCancelled) {
        span?.setAttribute('result', 'error');
        span?.setAttribute('success', false);
      }
      throw error;
    } finally {
      signal.removeEventListener('abort', markCancelled);
    }
  });
