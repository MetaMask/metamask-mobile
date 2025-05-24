import { useState } from 'react';

export interface DepositSdk {
  data: string | null;
  sdkMethod: (value: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}
export const useDepositSdk = (): DepositSdk => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sdkMethod = (value: string) =>
    new Promise((resolve) => {
      setLoading(true);
      setTimeout(() => {
        resolve(`Value submitted: ${value}`);
      }, 1000);
    })
      .then((result) => {
        // @ts-expect-error this is a mock
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  return {
    data,
    sdkMethod,
    loading,
    error,
  };
};
