import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  createCacheKey,
  RequestStatus,
  type ExecuteRequestOptions,
} from '@metamask/ramps-controller';
import {
  makeSelectRequestState,
  makeSelectRequestIsLoading,
  makeSelectRequestError,
  makeSelectRequestData,
} from '../../../../selectors/rampsController';

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
   * Whether the request is currently loading.
   */
  isLoading: boolean;
  /**
   * Whether the request completed successfully.
   */
  isSuccess: boolean;
  /**
   * Whether the request failed.
   */
  isError: boolean;
  /**
   * Whether the request is in idle state (not yet started).
   */
  isIdle: boolean;
  /**
   * Function to execute the request manually.
   */
  execute: (options?: ExecuteRequestOptions) => Promise<T>;
  /**
   * Function to abort the request if it's in progress.
   */
  abort: () => boolean;
  /**
   * Function to invalidate the cached result.
   */
  invalidate: () => void;
  /**
   * The cache key for this request.
   */
  cacheKey: string;
}

/**
 * Hook to execute a method on RampsController with request caching and deduplication.
 *
 * This hook provides:
 * - Automatic caching of request results
 * - Deduplication of concurrent requests with the same parameters
 * - Loading, error, and success states from Redux
 * - Ability to abort in-flight requests
 * - Cache invalidation
 *
 * @param method - The method name to call on RampsController.
 * @param params - Parameters to pass to the method.
 * @param options - Hook options.
 * @returns Request state and control functions.
 *
 * @example
 * ```tsx
 * const {
 *   data: geolocation,
 *   isLoading,
 *   error,
 *   execute,
 * } = useRampsControllerRequest('updateGeolocation', []);
 *
 * // The request is automatically executed on mount
 * // Use `execute()` to manually trigger a refresh
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

  const selectRequestState = useMemo(
    () => makeSelectRequestState(cacheKey),
    [cacheKey],
  );
  const selectIsLoading = useMemo(
    () => makeSelectRequestIsLoading(cacheKey),
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

  const requestState = useSelector(selectRequestState);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const data = useSelector(selectData);

  const status = requestState?.status ?? RequestStatus.IDLE;

  const execute = useCallback(
    async (executeOptions?: ExecuteRequestOptions): Promise<T> => {
      const { RampsController } = Engine.context;
      if (!RampsController) {
        throw new Error('RampsController is not available');
      }

      const methodFn = (RampsController as Record<string, unknown>)[method];
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

  const invalidate = useCallback((): void => {
    const { RampsController } = Engine.context;
    if (RampsController) {
      RampsController.invalidateRequest(cacheKey);
    }
  }, [cacheKey]);

  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (onMount && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      execute().catch(() => {
        // Error is already stored in state
      });
    }

    return () => {
      abort();
    };
  }, [onMount, execute, abort]);

  return {
    data,
    error,
    isLoading,
    isSuccess: status === RequestStatus.SUCCESS,
    isError: status === RequestStatus.ERROR,
    isIdle: status === RequestStatus.IDLE,
    execute,
    abort,
    invalidate,
    cacheKey,
  };
}

export default useRampsControllerRequest;
