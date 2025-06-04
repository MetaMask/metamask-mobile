import { useCallback, useMemo, useState } from 'react';
import { useDepositSDK } from '../sdk';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

export interface DepositSdkResult<T> {
  response: T | null;
  sdkMethod: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useDepositSdkMethod<T extends keyof NativeRampsSdk>(
  method: T,
  ...params: Parameters<NativeRampsSdk[T]>
): DepositSdkResult<Awaited<ReturnType<NativeRampsSdk[T]>>> {
  const [response, setResponse] = useState<Awaited<
    ReturnType<NativeRampsSdk[T]>
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);
  const { sdk } = useDepositSDK();

  const sdkMethod = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!sdk) {
      setError('Deposit SDK is not initialized');
      setLoading(false);
      return;
    }

    try {
      // @ts-expect-error TODO: fix type error
      const r = await sdk[method](...params);
      setResponse(r);
      return r;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringifiedParams, method, sdk]);

  return {
    response,
    sdkMethod,
    loading,
    error,
  };
}
