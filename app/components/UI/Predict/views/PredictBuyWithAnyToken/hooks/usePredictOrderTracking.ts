import { useEffect } from 'react';
import { Result } from '../../../types';

export function usePredictOrderTracking({
  result,
  onSuccess,
  error,
  onError,
}: {
  result: Result | null;
  error: string | undefined;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  useEffect(() => {
    if (result?.success) {
      onSuccess();
    }
  }, [onSuccess, result]);

  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [onError, error]);
}
