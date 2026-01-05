import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  createCacheKey,
  type ExecuteRequestOptions,
} from '@metamask/ramps-controller';
import {
  makeSelectRequestStatus,
  makeSelectRequestError,
  makeSelectRequestData,
} from '../../../../selectors/rampsController';

/**
 * Request status values.
 */
export type RequestStatusValue = 'idle' | 'loading' | 'success' | 'error';

/**
 * Options for the useRampsControllerRequest hook.
 */
export interface UseRampsControllerRequestOptions {
  /**
   * Whether to fetch on mount. Defaults to true.
   */
  onMount?: boolean;
  /**
   * Whether to force a refresh even if cached data exists.
   */
  forceRefresh?: boolean;
  /**
   * Custom TTL for this request in milliseconds.
   */
  ttl?: number;
}

/**
 * Result returned by the useRampsControllerRequest hook.
 */
export interface UseRampsControllerRequestResult<T> {
  /**
   * The data returned by the request, or null if not yet loaded.
   */
  data: T | null;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
  /**
   * Current request status: 'idle' | 'loading' | 'success' | 'error'.
   */
  status: RequestStatusValue;
}

/**
 * Hook to execute a method on RampsController with request caching and deduplication.
 *
 * This hook provides:
 * - Automatic caching of request results
 * - Deduplication of concurrent requests with the same parameters
 * - Request state from Redux (data, error, status)
 * - Automatic abort of in-flight requests on unmount
 *
 * For advanced control (manual refresh, abort, invalidate), use
 * Engine.context.RampsController directly.
 *
 * @param method - The method name to call on RampsController.
 * @param params - Parameters to pass to the method.
 * @param options - Hook options.
 * @returns Request state.
 *
 * @example
 * ```tsx
 * const { data, error, status } = useRampsControllerRequest<string>(
 *   'updateGeolocation',
 *   [],
 * );
 *
 * if (status === 'loading') return <Loading />;
 * if (error) return <Error message={error} />;
 * return <Text>{data}</Text>;
 * ```
 */
export function useRampsControllerRequest<T>(
  method: string,
  params: unknown[],
  options: UseRampsControllerRequestOptions = {},
): UseRampsControllerRequestResult<T> {
  const { onMount = true, forceRefresh = false, ttl } = options;

  const cacheKey = useMemo(
    () => createCacheKey(method, params),
    [method, params],
  );

  const selectStatus = useMemo(
    () => makeSelectRequestStatus(cacheKey),
    [cacheKey],
  );
  const selectError = useMemo(
    () => makeSelectRequestError(cacheKey),
    [cacheKey],
  );
  const selectData = useMemo(
    () => makeSelectRequestData<T>(cacheKey),
    [cacheKey],
  );

  const status = useSelector(selectStatus);
  const error = useSelector(selectError);
  const data = useSelector(selectData);

  const execute = useCallback(
    async (executeOptions?: ExecuteRequestOptions): Promise<T> => {
      const { RampsController } = Engine.context;
      if (!RampsController) {
        throw new Error('RampsController is not available');
      }

      const methodFn = (RampsController as unknown as Record<string, unknown>)[
        method
      ];
      if (typeof methodFn !== 'function') {
        throw new Error(`Method ${method} is not available on RampsController`);
      }

      const mergedOptions: ExecuteRequestOptions = {
        forceRefresh: executeOptions?.forceRefresh ?? forceRefresh,
        ttl: executeOptions?.ttl ?? ttl,
      };

      return methodFn.call(RampsController, mergedOptions) as Promise<T>;
    },
    [method, forceRefresh, ttl],
  );

  const abort = useCallback((): boolean => {
    const { RampsController } = Engine.context;
    if (!RampsController) {
      return false;
    }
    return RampsController.abortRequest(cacheKey);
  }, [cacheKey]);

  const hasExecutedRef = useRef(false);
  const abortRef = useRef(abort);
  abortRef.current = abort;

  useEffect(() => {
    if (onMount && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      execute().catch(() => {
        // Error is already stored in state
      });
    }
  }, [onMount, execute]);

  useEffect(() => () => {
      abortRef.current();
    }, []);

  return {
    data,
    error,
    status,
  };
}

export default useRampsControllerRequest;
