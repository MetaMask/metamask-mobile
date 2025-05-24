import { useCallback, useState } from 'react';
import { useDepositSDK } from '../sdk';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

export interface DepositSdkResult<T> {
  data: T | null;
  sdkMethod: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useDepositSdkMethod<T extends keyof NativeRampsSdk>(
  method: T,
  params: Parameters<NativeRampsSdk[T]>,
): DepositSdkResult<Awaited<ReturnType<NativeRampsSdk[T]>>> {
  const [data, setData] = useState<Awaited<
    ReturnType<NativeRampsSdk[T]>
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sdk = useDepositSDK();

  const sdkMethod = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!sdk?.sdk) {
      setError('Deposit SDK is not initialized');
      setLoading(false);
      return;
    }

    try {
      // @ts-expect-error todo - fix type error
      const result = await sdk.sdk[method](...params);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [method, params, sdk]);

  return {
    data,
    sdkMethod,
    loading,
    error,
  };
}
