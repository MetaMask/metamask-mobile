import { useEffect, useRef, useCallback, useState } from 'react';
import { useDepositSdkMethod } from './useDepositSdkMethod';

export interface IdProofPollingResult {
  idProofStatus: 'SUBMITTED' | 'NOT_SUBMITTED' | null;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook to poll for user details from the SDK
 *
 * @param kycWorkflowRunId - The ID of the KYC workflow run to poll for
 * @param pollingInterval - The interval in milliseconds to poll for user details
 * @param autoStart - Whether to automatically start polling
 * @param maxPollingAttempts - The maximum number of polling attempts before stopping. Set to 0 to poll indefinitely.
 */
const useIdProofPolling = (
  kycWorkflowRunId: string,
  pollingInterval: number = 10000,
  autoStart: boolean = true,
  maxPollingAttempts: number = 30,
): IdProofPollingResult => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const [pollingError, setPollingError] = useState<string | null>(null);

  const [
    { data: response, error: sdkError, isFetching: loading },
    getKycWorkflowRunStatus,
  ] = useDepositSdkMethod(
    {
      method: 'getKycWorkflowRunStatus',
      onMount: false,
    },
    kycWorkflowRunId,
  );

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    setPollingError(null);

    // Call immediately
    getKycWorkflowRunStatus();
    pollCountRef.current += 1;

    // Set up interval
    intervalRef.current = setInterval(() => {
      pollCountRef.current += 1;

      if (maxPollingAttempts > 0 && pollCountRef.current > maxPollingAttempts) {
        setPollingError(
          'Kyc workflow polling reached maximum attempts. Please try again later.',
        );
        stopPolling();
        return;
      }

      getKycWorkflowRunStatus();
    }, pollingInterval);
  }, [
    getKycWorkflowRunStatus,
    maxPollingAttempts,
    pollingInterval,
    stopPolling,
  ]);

  const idProofStatus = response?.status ?? null;

  useEffect(() => {
    if (idProofStatus === 'SUBMITTED') {
      stopPolling();
    }
  }, [idProofStatus, stopPolling]);

  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart, startPolling, stopPolling]);

  return {
    idProofStatus,
    loading,
    error: pollingError || sdkError,
    startPolling,
    stopPolling,
  };
};

export default useIdProofPolling;
