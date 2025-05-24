import { useState } from 'react';

export interface DepositSdk {
  data: string | null;
  sdkMethod: (value: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}
/**
 * Custom hook to manage the state and behavior of a deposit SDK.
 * This hook provides methods to submit data and handles loading and error states.
 * Currently, it is a mock implementation and should be replaced with actual SDK methods.
 *
 * @returns {DepositSdk} An object containing the SDK data, method, loading state, and error message.
 */
export const useDepositSdk = (): DepositSdk => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock async SDK functions
  // TODO: Replace with actual SDK functions to submit email and code to Transak
  const sdkMethod = (value: string) =>
    // simulate an SDK method that returns data and may throw an error and has loading states
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
