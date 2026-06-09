import { useEffect, useRef, useCallback, useState } from 'react';
import { useTransakController } from './useTransakController';
import Logger from '../../../../util/Logger';

export interface TransakIdProofPollingResult {
  idProofStatus: 'SUBMITTED' | 'NOT_SUBMITTED' | null;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook to poll Transak KYC ID-proof submission status.
 *
 *
 * @param workFlowRunId - The Transak workflow run ID to poll
 * @param pollingInterval - Interval in ms between polls (default 10 000)
 * @param autoStart - Start polling on mount (default true)
 * @param maxPollingAttempts - Stop after N attempts; 0 = poll indefinitely (default 30)
 */
const useTransakIdProofPolling = (
  workFlowRunId: string,
  pollingInterval: number = 10000,
  autoStart: boolean = true,
  maxPollingAttempts: number = 30,
): TransakIdProofPollingResult => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [idProofStatus, setIdProofStatus] = useState<
    'SUBMITTED' | 'NOT_SUBMITTED' | null
  >(null);
  const [loading, setLoading] = useState(false);

  const { getIdProofStatus } = useTransakController();

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getIdProofStatus(workFlowRunId);
      setIdProofStatus(response?.status ?? null);
    } catch (error) {
      Logger.error(error as Error, `useTransakIdProofPolling::poll failed`);
    } finally {
      setLoading(false);
    }
  }, [getIdProofStatus, workFlowRunId]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    setPollingError(null);

    // Call immediately
    poll();
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

      poll();
    }, pollingInterval);
  }, [poll, maxPollingAttempts, pollingInterval, stopPolling]);

  // Auto-stop when submitted
  useEffect(() => {
    if (idProofStatus === 'SUBMITTED') {
      stopPolling();
    }
  }, [idProofStatus, stopPolling]);

  // Auto-start & cleanup
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
    error: pollingError,
    startPolling,
    stopPolling,
  };
};

export default useTransakIdProofPolling;
