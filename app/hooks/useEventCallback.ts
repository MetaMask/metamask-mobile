import { useCallback, useRef } from 'react';

/**
 * Returns a stable callback (identity never changes across renders) that always
 * invokes the latest version of the supplied function. Lets callers pass a
 * callback into `useEffect` deps or long-lived subscriptions without causing
 * re-runs or risking stale closures. Polyfill for React's experimental
 * `useEffectEvent`; delete once that ships in stable React.
 */
export function useEventCallback<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const ref = useRef(fn);
  ref.current = fn;
  // Stable identity by design — ref.current is mutated, not re-read at render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: TArgs) => ref.current(...args), []);
}
