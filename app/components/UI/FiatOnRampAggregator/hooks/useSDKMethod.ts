import { useCallback, useEffect, useMemo, useState } from 'react';
import { RegionsService } from '@consensys/on-ramp-sdk';
import { useFiatOnRampSDK } from '../sdk';
import Logger from '../../../../util/Logger';

type NullifyOrPartial<T> = { [P in keyof T]?: T[P] | null };
type PartialParameters<T> = T extends (...args: infer P) => any
  ? NullifyOrPartial<P>
  : never;

interface config<T> {
  method: T;
  onMount?: boolean;
}
/**
 * useSDKMethod is a hook to conveniently call OnRampSdk.regions methods.
 *
 * @param config The method name or an object with the method name and a boolean onMount flag.
 * @param params The parameters to pass to the method.
 * @returns An array with an object with data, an error and a loading flag, and a function to call the method.
 *
 * @example
 * // Calling `getDefaultFiatCurrency` method
 * const [{ isFetching, error, data }] = useSDKMethod('getDefaultFiatCurrency', '/regions/cl');
 *
 * @example
 * // Calling `getDefaultFiatCurrency` method and get the function
 * const [{ isFetching, error, data }, getDefaultFiatCurrency] = useSDKMethod('getDefaultFiatCurrency', '/regions/cl');
 * // `getDefaultFiatCurrency` will be called with the same parameters
 * // by default (`/regions/cl` in this case)
 * const defaultCLFiatCurrency = await getDefaultFiatCurrency();
 * // Parameters can be overridden
 * const defaultARFiatCurrency = await getDefaultFiatCurrency('/regions/ar');
 * // The return and error of these calls will be reflected in the returned object of the hook
 */
export default function useSDKMethod<T extends keyof RegionsService>(
  config: T | config<T>,
  ...params: PartialParameters<RegionsService[T]>
): [
  {
    data: Awaited<ReturnType<RegionsService[T]>> | null;
    error: string | null;
    isFetching: boolean;
  },
  (
    ...customParams: PartialParameters<RegionsService[T]> | []
  ) => Promise<any> | ReturnType<RegionsService[T]>,
] {
  const { sdk } = useFiatOnRampSDK();
  const [data, setData] = useState<Awaited<
    ReturnType<RegionsService[T]>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);
  const method = typeof config === 'string' ? config : config.method;
  const onMount = typeof config === 'string' ? true : config.onMount ?? true;

  const query = useCallback(
    async (...customParams: PartialParameters<RegionsService[T]> | []) => {
      if (
        (customParams.length > 0 && customParams.some((param) => !param)) ||
        (customParams.length === 0 &&
          params.length > 0 &&
          params.some((param) => !param))
      ) {
        return;
      }
      try {
        setIsFetching(true);
        setError(null);
        setData(null);
        if (sdk) {
          const response = await sdk[method](
            // @ts-expect-error spreading params error
            ...(customParams.length > 0 ? customParams : params),
          );
          // @ts-expect-error response type error
          setData(response);
          return response;
        }
      } catch (responseError) {
        Logger.error(responseError as Error, `useSDKMethod::${method} failed`);
        setError((responseError as Error).message);
      } finally {
        setIsFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [method, stringifiedParams, sdk],
  );

  useEffect(() => {
    if (onMount) {
      query();
    } else {
      setIsFetching(false);
    }
  }, [query, onMount]);

  return [{ data, error, isFetching }, query];
}
