/**
 * Generic hook for calling Meld API methods with loading/error state.
 *
 * Replaces useSDKMethod from the aggregator pattern.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Logger from '../../../../../util/Logger';

interface UseMeldApiState<T> {
  data: T | null;
  isFetching: boolean;
  error: Error | null;
}

type FetchFn<T> = () => Promise<T>;

/**
 * Calls an async function, tracks loading/error state, and caches the result.
 *
 * @param fetchFn - The async function to call. Pass `null` to skip.
 * @param deps - Dependency array — refetches when deps change.
 */
export default function useMeldApi<T>(
  fetchFn: FetchFn<T> | null,
  deps: unknown[] = [],
): [UseMeldApiState<T>, () => Promise<T | null>] {
  const [state, setState] = useState<UseMeldApiState<T>>({
    data: null,
    isFetching: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const execute = useCallback(async (): Promise<T | null> => {
    if (!fetchFn) return null;

    setState((prev) => ({ ...prev, isFetching: true, error: null }));

    try {
      const data = await fetchFn();
      if (mountedRef.current) {
        setState({ data, isFetching: false, error: null });
      }
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error(error, '[useMeldApi] fetch failed');
      if (mountedRef.current) {
        setState({ data: null, isFetching: false, error });
      }
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, ...deps]);

  // Auto-fetch on mount and when deps change
  useEffect(() => {
    if (fetchFn) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute]);

  return [state, execute];
}
