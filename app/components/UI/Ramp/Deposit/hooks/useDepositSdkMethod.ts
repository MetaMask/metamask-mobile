import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeRampsSdk,
  ServicesSignatures,
} from '@consensys/native-ramps-sdk';
import { useDepositSDK } from '../sdk';
import Logger from '../../../../../util/Logger';

type NullifyOrPartial<T> = { [P in keyof T]?: T[P] | null };
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialParameters<T> = T extends (...args: infer P) => any
  ? NullifyOrPartial<P>
  : never;

/**
 * Determines if the provided method and parameters are valid for the NativeRampsSdk interface.
 * @param method - The method to check the parameters against.
 * @param params - The parameters to check against the NativeRampsSdk interface.
 * @returns A boolean indicating whether or not the provided parameters are valid for the specified method.
 */
function validMethodParams<T extends keyof NativeRampsSdk>(
  method: T,
  params: PartialParameters<NativeRampsSdk[T]> | [],
): params is Parameters<NativeRampsSdk[T]> {
  const parameters: {
    required: boolean;
  }[] = ServicesSignatures.NativeRampsSdk[method].parameters;
  
  console.log(`__ DEBUG__ validMethodParams for ${method}:`, {
    method,
    params,
    parametersLength: parameters.length,
    paramsLength: params.length,
    parameters,
  });
  
  const result = parameters.every(({ required }, index) => {
    const isValid = !required || params[index] != null;
    console.log(`__ DEBUG__ validMethodParams param ${index}:`, {
      required,
      paramValue: params[index],
      isValid,
    });
    return isValid;
  });
  
  console.log(`__ DEBUG__ validMethodParams result for ${method}:`, result);
  return result;
}

/**
 * Determines if the provided method is called with all its parameters.
 * @param method - The method to check the parameters against.
 * @param params - The parameters to check against the NativeRampsSdk interface.
 * @returns A boolean indicating whether or not the provided parameters are all the parameters of the specified method.
 */
function hasAllParams<T extends keyof NativeRampsSdk>(
  method: T,
  params: PartialParameters<NativeRampsSdk[T]> | [],
): boolean {
  const parameters = ServicesSignatures.NativeRampsSdk[method].parameters;
  return parameters.length === params.length;
}

interface config<T> {
  method: T;
  onMount?: boolean;
  throws?: boolean;
}

/**
 * Represents the state data returned by the useDepositSdkMethod hook.
 */
export interface DepositSdkMethodState<T extends keyof NativeRampsSdk> {
  data: Awaited<ReturnType<NativeRampsSdk[T]>> | null;
  error: string | null;
  isFetching: boolean;
}

/**
 * Represents the query function returned by the useDepositSdkMethod hook.
 */
export type DepositSdkMethodQuery<T extends keyof NativeRampsSdk> = (
  ...customParams: PartialParameters<NativeRampsSdk[T]> | []
) => Promise<ReturnType<NativeRampsSdk[T]> | undefined>;

/**
 * The tuple type returned by the useDepositSdkMethod hook.
 */
export type DepositSdkMethodResult<T extends keyof NativeRampsSdk> = [
  DepositSdkMethodState<T>,
  DepositSdkMethodQuery<T>,
];

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
export function useDepositSdkMethod<T extends keyof NativeRampsSdk>(
  config: T | config<T>,
  ...params: PartialParameters<NativeRampsSdk[T]>
): DepositSdkMethodResult<T> {
  const method = typeof config === 'string' ? config : config.method;
  const onMount = typeof config === 'string' ? true : config.onMount ?? true;
  const throws = typeof config === 'string' ? false : config.throws ?? false;

  console.log(`__ DEBUG__ useDepositSdkMethod called with method: ${method}`, {
    config,
    params,
    onMount,
    throws,
  });

  const { sdk } = useDepositSDK();
  const [data, setData] = useState<Awaited<
    ReturnType<NativeRampsSdk[T]>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(onMount);
  const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);
  const abortControllerRef = useRef<AbortController>();

  console.log(`__ DEBUG__ useDepositSdkMethod state:`, {
    method,
    sdkExists: !!sdk,
    onMount,
    isFetching,
    dataExists: !!data,
    errorExists: !!error,
  });

  const query = useCallback(
    async (...customParams: PartialParameters<NativeRampsSdk[T]> | []) => {
      const hasCustomParams = customParams.length > 0;
      const queryParams = hasCustomParams ? customParams : params;

      console.log(`__ DEBUG__ ${method} query called with:`, {
        hasCustomParams,
        customParams,
        queryParams,
        method,
      });

      console.log(`__ DEBUG__ ${method} checking validMethodParams:`, {
        method,
        queryParams,
        signatures: ServicesSignatures.NativeRampsSdk[method],
      });

      if (!validMethodParams(method, queryParams)) {
        console.log(`__ DEBUG__ ${method} FAILED validMethodParams check, returning early`);
        return;
      }

      console.log(`__ DEBUG__ ${method} PASSED validMethodParams check`);

      const hasEveryParameter = hasAllParams(method, queryParams);
      console.log(`__ DEBUG__ ${method} hasEveryParameter:`, hasEveryParameter);
      let abortController;

      try {
        abortControllerRef?.current?.abort();

        if (!hasEveryParameter) {
          console.log(`__ DEBUG__ ${method} creating AbortController because not all parameters provided`);
          abortController = new AbortController();
          abortControllerRef.current = abortController;
        }

        setIsFetching(true);
        setError(null);
        setData(null);

        if (sdk) {
          const methodParams = abortController
            ? [...queryParams, abortController]
            : queryParams;

          console.log(
            `__ DEBUG__ ${method} about to call SDK method with params:`,
            methodParams,
          );
          console.log(
            '__ CLIENT__ useDepositSdkMethod calling method',
            method,
            methodParams,
          );
          // @ts-expect-error spreading params error
          const response = (await sdk[method](...methodParams)) as Awaited<
            ReturnType<NativeRampsSdk[T]>
          >;
          console.log(`__ DEBUG__ ${method} SDK call successful, response length:`, Array.isArray(response) ? response.length : 'not array');
          setData(response);
          setIsFetching(false);

          return response;
        } else {
          console.log(`__ DEBUG__ ${method} SDK not available, cannot make call`);
        }
      } catch (responseError) {
        if (abortController?.signal.aborted) {
          console.log(`__ DEBUG__ ${method} request was aborted`);
          return;
        }

        console.log(`__ DEBUG__ ${method} SDK call failed with error:`, responseError);
        Logger.error(responseError as Error, `useSDKMethod::${method} failed`);
        setError((responseError as Error).message);
        setIsFetching(false);
        if (throws) {
          throw responseError;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [method, throws, stringifiedParams, sdk],
  );

  useEffect(() => {
    console.log(`__ DEBUG__ ${method} useEffect called:`, {
      onMount,
      params: JSON.stringify(params),
      sdkAvailable: !!sdk,
    });
    if (onMount) {
      console.log(`__ DEBUG__ ${method} calling query() because onMount is true`);
      query();
    } else {
      console.log(`__ DEBUG__ ${method} NOT calling query() because onMount is false`);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [query, onMount]);

  return [{ data, error, isFetching }, query];
}
